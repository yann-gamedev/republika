#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Rust REPUBLIKA sengaja minimal (AGENT §4.8): hanya command file I/O.
//! Semua path dari UI relatif terhadap `Documents/REPUBLIKA/` dan ditolak bila
//! mencoba keluar dari folder itu (mis. `..` atau path absolut).

use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};

use tauri::Manager;

/// Folder data pemain: `Documents/REPUBLIKA/`.
fn data_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let docs = app.path().document_dir().map_err(|e| e.to_string())?;
    Ok(docs.join("REPUBLIKA"))
}

/// Mengubah path relatif dari UI menjadi path aman di bawah `root`.
/// Hanya nama folder/file biasa yang diterima; `..`, `.`, dan path absolut ditolak.
fn resolve(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let rel = Path::new(relative);
    // UI selalu memakai "/"; "\" dan ":" (drive Windows) tidak pernah sah.
    let safe = !relative.is_empty()
        && !relative.contains(['\\', ':'])
        && rel.components().all(|c| matches!(c, Component::Normal(_)));
    if !safe {
        return Err(format!("Path ditolak: {relative}"));
    }
    Ok(root.join(rel))
}

/// Tulis atomik: isi ditulis ke `*.tmp`, di-flush ke disk, lalu di-rename
/// menimpa file lama. Bila app mati di tengah jalan, file lama tetap utuh.
#[tauri::command]
fn save_atomic(app: tauri::AppHandle, path: String, contents: String) -> Result<(), String> {
    let target = resolve(&data_root(&app)?, &path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = target.with_extension("tmp");
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(contents.as_bytes())
        .map_err(|e| e.to_string())?;
    file.sync_all().map_err(|e| e.to_string())?;
    drop(file);
    fs::rename(&tmp, &target).map_err(|e| e.to_string())
}

/// Membaca file teks; `None` bila file belum ada.
#[tauri::command]
fn read_text(app: tauri::AppHandle, path: String) -> Result<Option<String>, String> {
    let target = resolve(&data_root(&app)?, &path)?;
    match fs::read_to_string(&target) {
        Ok(text) => Ok(Some(text)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

/// Daftar nama file `.json` di `saves/`.
#[tauri::command]
fn list_saves(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let dir = data_root(&app)?.join("saves");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| entry.ok()?.file_name().into_string().ok())
        .filter(|name| name.ends_with(".json"))
        .collect();
    names.sort();
    Ok(names)
}

/// Memindahkan/mengganti nama file di dalam `Documents/REPUBLIKA/` (mis. ke
/// `saves/trash/` saat pemain menghapus slot, atau rotasi log).
#[tauri::command]
fn rename_file(app: tauri::AppHandle, from: String, to: String) -> Result<(), String> {
    let root = data_root(&app)?;
    let source = resolve(&root, &from)?;
    let target = resolve(&root, &to)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(source, target).map_err(|e| e.to_string())
}

/// Membuka `Documents/REPUBLIKA/saves` di Explorer. Path ditetapkan di Rust,
/// jadi UI tidak bisa membuka lokasi lain.
#[tauri::command]
fn open_saves_folder(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let dir = data_root(&app)?.join("saves");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| e.to_string())
}

/// Impor save dari versi sebelumnya: pemain memilih satu file `.json`, lalu
/// salinannya ditaruh di `saves/imported/`. Mengembalikan path relatif salinan.
#[tauri::command]
async fn import_save_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let picked = app
        .dialog()
        .file()
        .add_filter("Save REPUBLIKA", &["json"])
        .blocking_pick_file();
    let Some(picked) = picked else {
        return Ok(None);
    };
    let source = picked.into_path().map_err(|e| e.to_string())?;
    let size = fs::metadata(&source).map_err(|e| e.to_string())?.len();
    if size > 5 * 1024 * 1024 {
        return Err("File terlalu besar untuk sebuah save (maks. 5 MB).".into());
    }
    let name = source
        .file_name()
        .and_then(|n| n.to_str())
        .filter(|n| n.ends_with(".json") && !n.contains(['\\', ':']))
        .ok_or("Pilih file .json.")?
        .to_string();
    let relative = format!("saves/imported/{name}");
    let target = resolve(&data_root(&app)?, &relative)?;
    fs::create_dir_all(target.parent().ok_or("path")?).map_err(|e| e.to_string())?;
    fs::copy(&source, &target).map_err(|e| e.to_string())?;
    Ok(Some(relative))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Saat pertama kali jalan: siapkan saves/ dan logs/.
            let root = data_root(app.handle())?;
            fs::create_dir_all(root.join("saves"))?;
            fs::create_dir_all(root.join("logs"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            save_atomic,
            read_text,
            list_saves,
            rename_file,
            open_saves_folder,
            import_save_file
        ])
        .run(tauri::generate_context!())
        .expect("REPUBLIKA gagal membuka jendela Tauri");
}

#[cfg(test)]
mod tests {
    use super::resolve;
    use std::path::Path;

    #[test]
    fn menerima_path_relatif_biasa() {
        let root = Path::new("root");
        assert_eq!(
            resolve(root, "saves/autosave.json").unwrap(),
            root.join("saves/autosave.json")
        );
    }

    #[test]
    fn menolak_traversal_dan_path_absolut() {
        let root = Path::new("root");
        for bad in [
            "",
            "..",
            "../x.json",
            "saves/../../x",
            "./saves/a.json",
            "/etc/passwd",
            "C:\\x.json",
            "saves\\..\\x",
            "C:x",
        ] {
            assert!(resolve(root, bad).is_err(), "harus ditolak: {bad}");
        }
    }
}

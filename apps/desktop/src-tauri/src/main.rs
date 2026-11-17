#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Rust REPUBLIKA sengaja minimal (AGENT §4.8): hanya tiga command file I/O.
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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Saat pertama kali jalan: siapkan saves/ dan logs/.
            let root = data_root(app.handle())?;
            fs::create_dir_all(root.join("saves"))?;
            fs::create_dir_all(root.join("logs"))?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![save_atomic, read_text, list_saves])
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

import { useCallback, useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { APP_VERSION, type SaveSlotInfo } from '@republika/shared';

import { campaignQuarter, campaignYear } from '@/app/time';
import { sceneArt } from '@/content/art';
import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { PreviousVersionFlow } from '@/features/migration/PreviousVersionFlow';
import { isTauriRuntime, quitApplication } from '@/platform';
import { appLogger, gameController } from '@/store/controller';
import type { ContinueResult } from '@/store/gameController';
import { ArtImage } from '@/ui/ArtImage';
import { ConfirmDialog } from '@/ui/components/dialog';
import { IconArrowRight, IconFolder, IconPlus, IconPower, IconSettings } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { RepublicMark } from '@/ui/RepublicMark';

const heroArt = sceneArt('menu-hero');

const itemClass =
  'flex h-12 w-full items-center gap-3 rounded-[10px] px-4 text-left text-[15px] text-foreground transition-colors duration-150 ease-standard hover:bg-raised';

interface MenuItemProps {
  readonly icon: ComponentType<SVGProps<SVGSVGElement>>;
  readonly label: string;
  readonly meta?: string;
  readonly to?: string;
  readonly onClick?: () => void;
}

function MenuItem({ icon: Icon, label, meta, to, onClick }: MenuItemProps) {
  const content = (
    <>
      <Icon className="h-[18px] w-[18px] text-text-secondary" />
      <span className="flex-1">{label}</span>
      {meta !== undefined && (
        <span className="font-mono text-xs text-muted-foreground">{meta}</span>
      )}
    </>
  );
  return to !== undefined ? (
    <Link to={to} className={itemClass}>
      {content}
    </Link>
  ) : (
    <button type="button" className={itemClass} onClick={onClick}>
      {content}
    </button>
  );
}

function formatSavedTime(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

function continueInfo(autosave: SaveSlotInfo | undefined): string {
  if (
    autosave === undefined ||
    autosave.isCorrupt ||
    autosave.presidentName === undefined ||
    autosave.turn === undefined ||
    autosave.savedAt === undefined
  ) {
    return copy.menu.continueNone;
  }
  return copy.menu.continueInfo(
    autosave.presidentName,
    campaignYear(autosave.turn, definitions.scenario.startYear),
    campaignQuarter(autosave.turn),
    formatSavedTime(autosave.savedAt),
  );
}

/** Dicatat sekali per sesi untuk mengukur cold start (lihat docs/PERFORMANCE.md). */
let startupLogged = false;

export default function MenuPage() {
  const navigate = useNavigate();
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [corrupt, setCorrupt] = useState<{ hasBackup: boolean } | null>(null);
  const [slots, setSlots] = useState<readonly SaveSlotInfo[]>([]);

  useEffect(() => {
    if (!startupLogged) {
      startupLogged = true;
      void appLogger.log('info', `menu siap (navigasi +${performance.now().toFixed(0)} ms)`);
    }
    let active = true;
    void gameController
      .listSlots()
      .then((list) => {
        if (active) setSlots(list);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleContinueResult = useCallback(
    (result: ContinueResult) => {
      setLoading(false);
      if (result.status === 'loaded') {
        navigate('/game/dashboard');
      } else if (result.status === 'missing') {
        setNotice(copy.menu.continueMissing);
      } else if (result.status === 'incompatible') {
        setNotice(result.message);
      } else {
        setCorrupt({ hasBackup: result.hasBackup });
      }
    },
    [navigate],
  );

  const handleContinue = () => {
    if (loading) return;
    setLoading(true);
    setNotice(copy.menu.continueLoading);
    void gameController.continueCampaign().then(handleContinueResult);
  };

  const restoreBackup = useCallback(() => {
    setCorrupt(null);
    setLoading(true);
    void gameController.continueFromBackup().then(handleContinueResult);
  }, [handleContinueResult]);

  const startOver = useCallback(() => {
    setCorrupt(null);
    navigate('/inauguration');
  }, [navigate]);

  const closeCorrupt = useCallback(() => {
    setCorrupt(null);
    setNotice(null);
  }, []);

  const handleQuit = () => {
    if (!isTauriRuntime()) {
      setNotice(copy.menu.quitUnavailable);
      return;
    }
    void quitApplication().catch(() => setNotice(copy.errors.quitUnavailable));
  };

  const autosave = slots.find((slot) => slot.slot === 'autosave');
  const manualSlots = slots.filter(
    (slot) => slot.slot !== 'autosave' && slot.savedAt !== undefined,
  ).length;

  return (
    <main className="flex min-h-screen">
      <div className="relative min-w-0 flex-[999_1_640px] overflow-hidden bg-[#181830]">
        <ArtImage
          load={heroArt}
          alt={copy.art.scenes['menu-hero']}
          className="absolute inset-0 h-full w-full bg-[#181830]"
        />
      </div>

      <div className="flex min-w-0 flex-[1_1_440px] flex-col justify-between gap-12 border-l border-border bg-background px-14 py-16">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <RepublicMark size={32} />
            <span className="font-serif text-lg font-medium">{copy.menu.wordmark}</span>
          </div>
          <h1 className="mt-6 font-serif text-5xl font-normal leading-[1.08] tracking-[-0.02em]">
            {copy.menu.title}
          </h1>
          <p className="max-w-[34rem] text-base leading-relaxed text-text-secondary">
            {copy.menu.subtitle}
          </p>
        </div>

        <nav aria-label={copy.menu.navLabel} className="flex flex-col gap-1">
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading}
            className={cn(
              'flex h-16 w-full items-center justify-between gap-3 rounded-[10px] bg-primary px-4 text-left text-primary-foreground transition-colors duration-150 ease-standard hover:bg-[#D9B33A] disabled:opacity-60',
            )}
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-medium">{copy.menu.continueGame}</span>
              <span className="text-[13px]">{continueInfo(autosave)}</span>
            </span>
            <IconArrowRight className="h-[18px] w-[18px]" />
          </button>
          <div className="mt-2" />
          <MenuItem icon={IconPlus} label={copy.menu.newGame} to="/inauguration" />
          <MenuItem
            icon={IconFolder}
            label={copy.menu.loadGame}
            meta={copy.menu.slotCount(manualSlots)}
            to="/saves"
          />
          <MenuItem icon={IconSettings} label={copy.menu.settings} to="/settings" />
          <MenuItem icon={IconPower} label={copy.menu.quit} onClick={handleQuit} />
          {notice !== null && (
            <p role="status" className="mt-3 px-4 text-sm text-primary">
              {notice}
            </p>
          )}
        </nav>

        <div className="flex justify-between gap-4 font-mono text-xs text-muted-foreground">
          <span>{copy.menu.versionLine(APP_VERSION)}</span>
          <span>{copy.menu.footerNote}</span>
        </div>
      </div>

      <PreviousVersionFlow />

      <ConfirmDialog
        open={corrupt !== null}
        title={copy.menu.corruptTitle}
        confirmLabel={corrupt?.hasBackup === true ? copy.menu.useBackup : copy.menu.newGame}
        cancelLabel={copy.common.close}
        onConfirm={corrupt?.hasBackup === true ? restoreBackup : startOver}
        onCancel={closeCorrupt}
        {...(corrupt?.hasBackup === true
          ? { secondaryLabel: copy.menu.newGame, onSecondary: startOver }
          : {})}
      >
        {corrupt?.hasBackup === true ? copy.menu.corruptBody : copy.menu.corruptNoBackup}
      </ConfirmDialog>
    </main>
  );
}

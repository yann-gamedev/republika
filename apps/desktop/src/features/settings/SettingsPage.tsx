import { useState } from 'react';
import { Link } from 'react-router-dom';

import { APP_VERSION, UI_SCALES } from '@republika/shared';

import { PageHeader } from '@/app/PageHeader';
import { copy } from '@/copy/id';
import { contentHash, definitions, gameContent } from '@/content/gameContent';
import { setApplicationFullscreen } from '@/platform';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/card';
import { IconCheck, IconLock, IconShield } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { Seal } from '@/ui/Seal';

export default function SettingsPage() {
  const settings = useAppStore((store) => store.settings);
  const setUiScale = useAppStore((store) => store.setUiScale);
  const setFullscreenPreference = useAppStore((store) => store.setFullscreenPreference);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [fullscreenBusy, setFullscreenBusy] = useState(false);

  const toggleFullscreen = async () => {
    const next = !settings.fullscreen;
    setFullscreenBusy(true);
    setFullscreenError(null);
    try {
      await setApplicationFullscreen(next);
      setFullscreenPreference(next);
    } catch {
      setFullscreenError(copy.errors.fullscreenUnavailable);
    } finally {
      setFullscreenBusy(false);
    }
  };

  return (
    <main className="min-h-screen px-10 py-8">
      <div className="mx-auto max-w-[1080px]">
        <div className="flex items-center justify-between gap-6 border-b border-border/50 pb-5">
          <Link to="/" className="flex items-center gap-3">
            <Seal label={copy.menu.sealLabel} className="h-10 w-10" />
            <span>
              <span className="block font-serif text-lg tracking-[0.16em]">{copy.app.name}</span>
              <span className="text-[0.6rem] uppercase tracking-institutional text-muted-foreground">
                {copy.settings.kicker}
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {copy.settings.back}
          </Link>
        </div>

        <div className="pt-8">
          <PageHeader
            kicker={copy.settings.kicker}
            title={copy.settings.title}
            subtitle={copy.settings.subtitle}
            actions={<Badge variant="outline">{copy.app.offline}</Badge>}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="institutional-label">{copy.settings.appearanceTitle}</p>
              <CardTitle className="mt-2">{copy.settings.scaleLabel}</CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copy.settings.scaleDescription}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2">
                {UI_SCALES.map((scale) => {
                  const active = settings.uiScale === scale;
                  return (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setUiScale(scale)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 border px-2 py-3 text-sm transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/[0.09] text-foreground'
                          : 'border-border/60 bg-card/25 text-muted-foreground hover:border-primary/30 hover:bg-card/50',
                      )}
                      aria-pressed={active}
                    >
                      <span className="numeric">{copy.settings.scaleOption(scale)}</span>
                      <span className="text-[0.55rem] uppercase tracking-[0.12em] opacity-70">
                        {active ? copy.settings.scaleActive : copy.common.available}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="institutional-label">{copy.settings.windowTitle}</p>
              <CardTitle className="mt-2">
                {settings.fullscreen ? copy.settings.fullscreenOff : copy.settings.fullscreenOn}
              </CardTitle>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {copy.settings.fullscreenDescription}
              </p>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                disabled={fullscreenBusy}
                onClick={() => {
                  void toggleFullscreen();
                }}
              >
                {settings.fullscreen ? copy.settings.fullscreenOff : copy.settings.fullscreenOn}
              </Button>
              {fullscreenError !== null && (
                <p role="alert" className="mt-3 text-xs text-red-300">
                  {fullscreenError}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div>
                <p className="institutional-label">{copy.settings.contentTitle}</p>
                <CardTitle className="mt-2">{copy.settings.contentWarningTitle}</CardTitle>
              </div>
              <Badge variant="maroon">
                {copy.settings.contentWarningBadge(gameContent.warnings.length)}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                {copy.settings.contentWarningBody(gameContent.warnings.length)}
              </p>
              <dl className="divide-y divide-border/40 border-y border-border/40">
                <div className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{copy.settings.contentHash}</dt>
                  <dd className="numeric break-all text-[0.68rem] text-foreground/85">
                    {contentHash}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{copy.settings.ruleset}</dt>
                  <dd className="numeric text-xs">{definitions.scenario.rulesetVersion}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-xs text-muted-foreground">{copy.settings.appVersion}</dt>
                  <dd className="numeric text-xs">{APP_VERSION}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[0.65rem] leading-relaxed text-muted-foreground">
                {copy.settings.persistNote}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <p className="institutional-label">{copy.app.offline}</p>
                  <CardTitle className="mt-2">{copy.settings.offlineTitle}</CardTitle>
                </div>
                <span className="grid h-9 w-9 place-items-center border border-primary/25 bg-primary/10 text-primary">
                  <IconShield className="h-4 w-4" />
                </span>
              </CardHeader>
              <CardContent>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {copy.settings.offlineBody}
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-3 text-[0.65rem] text-muted-foreground">
                  <IconLock className="h-3.5 w-3.5 text-primary/70" />
                  {copy.settings.localOnly}
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-3 border border-border/40 bg-card/20 px-4 py-3 text-[0.68rem] text-muted-foreground">
              <IconCheck className="h-4 w-4 shrink-0 text-emerald-300/80" />
              {copy.settings.persistNote}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-5">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground/60">
            {copy.menu.versionLine(APP_VERSION)}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">{copy.settings.back}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

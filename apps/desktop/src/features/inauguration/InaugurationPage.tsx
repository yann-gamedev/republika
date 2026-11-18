import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { HONORIFICS, type Honorific, type PortraitHead } from '@republika/shared';

import { sceneArt } from '@/content/art';
import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { gameController } from '@/store/controller';
import { useAppStore } from '@/store/useAppStore';
import { ArtImage } from '@/ui/ArtImage';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { IconArrowLeft } from '@/ui/icons';
import { cn } from '@/ui/lib/utils';
import { Portrait } from '@/ui/Portrait';
import { RepublicMark } from '@/ui/RepublicMark';
import { Stamp } from '@/ui/Stamp';

import { validateInauguration, type InaugurationErrors } from './validation';

const oathArt = sceneArt('inauguration-oath');

/** Pilihan penampilan per sapaan (kosmetik). */
export const LOOKS_BY_HONORIFIC: Readonly<Record<Honorific, readonly PortraitHead[]>> = {
  Bapak: ['peci', 'rambut', 'uban'],
  Ibu: ['hijab', 'panjang', 'uban'],
};

const PORTRAIT_COLORS = { skin: '#C09078', suit: '#181830', accent: '#C03018', bg: '#D8D8C0' };

type OathMode = 'sumpah' | 'janji';

const segment = (active: boolean, onPaper = false) =>
  cn(
    'h-9 flex-1 rounded-md px-3 text-[13px] font-medium transition-colors duration-150',
    active
      ? onPaper
        ? 'bg-ink text-paper'
        : 'bg-primary text-primary-foreground'
      : onPaper
        ? 'text-[#4A443A] hover:text-ink'
        : 'text-text-secondary hover:text-foreground',
  );

export default function InaugurationPage() {
  const navigate = useNavigate();
  const startYear = definitions.scenario.startYear;
  const savedLook = useAppStore((store) => store.settings.presidentLook);
  const updateSettings = useAppStore((store) => store.updateSettings);

  const [step, setStep] = useState<'dossier' | 'oath'>('dossier');
  const [presidentName, setPresidentName] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [honorific, setHonorific] = useState<Honorific>(savedLook?.honorific ?? 'Bapak');
  const [head, setHead] = useState<PortraitHead>(savedLook?.head ?? 'peci');
  const [errors, setErrors] = useState<InaugurationErrors>({});
  const [mode, setMode] = useState<OathMode>('sumpah');
  const [signing, setSigning] = useState(false);
  const [sworn, setSworn] = useState(false);

  const name = presidentName.trim();
  const cabinet = cabinetName.trim();

  const submitDossier = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInauguration({ presidentName, cabinetName });
    if (nextErrors.presidentName !== undefined || nextErrors.cabinetName !== undefined) {
      setErrors(nextErrors);
      return;
    }
    updateSettings({ presidentLook: { honorific, head } });
    setStep('oath');
  };

  const sign = () => {
    if (signing || sworn) return;
    setSigning(true);
    void gameController
      .startCampaign({ presidentName: name, cabinetName: cabinet })
      .then((result) => {
        setSigning(false);
        if (result.ok) {
          setSworn(true);
        } else {
          setErrors({ presidentName: result.message });
          setStep('dossier');
        }
      });
  };

  if (step === 'oath') {
    return (
      <main className="flex min-h-screen">
        <div className="relative min-w-0 flex-[1_1_520px] overflow-hidden bg-[#181830]">
          <ArtImage
            load={oathArt}
            alt={copy.art.scenes['inauguration-oath']}
            className="absolute inset-0 h-full w-full bg-[#181830]"
          />
          {!sworn && (
            <button
              type="button"
              onClick={() => setStep('dossier')}
              className="absolute left-6 top-5 inline-flex h-9 items-center gap-2 rounded-md bg-background/75 px-3 text-sm text-foreground"
            >
              <IconArrowLeft className="h-[18px] w-[18px]" />
              {copy.inauguration.oathBack}
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-[1_1_560px] items-center justify-center px-10 py-12">
          <article className="relative flex w-full max-w-[620px] flex-col gap-5 rounded-sm bg-paper px-12 py-10 text-ink shadow-document">
            <header className="flex flex-col items-center gap-2 border-b-2 border-primary pb-4">
              <RepublicMark size={44} />
              <span className="text-[13px] text-ink-muted">{copy.inauguration.oathAssembly}</span>
              <h1 className="text-center font-serif text-[26px] font-semibold">
                {mode === 'sumpah'
                  ? copy.inauguration.oathTitleSumpah
                  : copy.inauguration.oathTitleJanji}
              </h1>
            </header>

            <p className="font-serif text-lg leading-[30px] text-[#3A352C]">
              {copy.inauguration.oathIntro(name, definitions.scenario.maxTurns)}
            </p>
            <blockquote className="border-l-[3px] border-primary py-1 pl-5 font-serif text-[19px] leading-8">
              {copy.inauguration.oathText[mode]}
            </blockquote>
            <span className="text-xs text-ink-muted">{copy.inauguration.oathSource}</span>

            <div
              role="radiogroup"
              aria-label={copy.inauguration.oathModeLabel}
              className="flex gap-1 rounded-[10px] bg-paper-dark p-1"
            >
              {(['sumpah', 'janji'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  disabled={sworn || signing}
                  onClick={() => setMode(value)}
                  className={segment(mode === value, true)}
                >
                  {copy.inauguration.oathModes[value]}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-end justify-between gap-6">
              <span className="text-sm text-[#4A443A]">
                {copy.inauguration.oathPlace(startYear)}
              </span>
              <div className="flex min-w-[220px] flex-col items-center gap-1">
                <span
                  data-testid="signature"
                  aria-hidden={!sworn}
                  className="motion-transform h-14 font-signature text-[52px] leading-none text-[#181830] transition-[clip-path] duration-[900ms] ease-standard"
                  style={{ clipPath: sworn ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)' }}
                >
                  {name}
                </span>
                <span className="h-px w-full bg-ink" />
                <span className="text-[13px] text-[#4A443A]">{copy.inauguration.oathRole}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-3">
              {sworn ? (
                <button
                  type="button"
                  autoFocus
                  onClick={() => navigate('/game/dashboard')}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-[#2E2A22]"
                >
                  {copy.inauguration.ceremonyEnter}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={signing}
                  onClick={sign}
                  className="inline-flex h-11 flex-1 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-colors duration-150 hover:bg-[#2E2A22] disabled:opacity-60"
                >
                  {signing
                    ? copy.inauguration.signing
                    : mode === 'sumpah'
                      ? copy.inauguration.signSumpah
                      : copy.inauguration.signJanji}
                </button>
              )}
            </div>

            <div className="pointer-events-none absolute bottom-[150px] left-10">
              <Stamp
                label={copy.inauguration.stamp}
                visible={sworn}
                className="rounded-full bg-paper/50 px-5 py-6 text-lg"
              />
            </div>
            {sworn && (
              <p className="sr-only" role="status">
                {copy.inauguration.ceremonyTitle(name)}
              </p>
            )}
          </article>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-10 py-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="flex items-center justify-between gap-6 border-b border-border pb-5">
          <Link to="/" className="flex items-center gap-3">
            <RepublicMark size={28} />
            <span className="font-serif text-lg">{copy.menu.wordmark}</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-text-secondary transition-colors hover:text-foreground"
          >
            {copy.inauguration.back}
          </Link>
        </div>

        <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] gap-12 py-10">
          <section>
            <span className="text-[13px] text-text-secondary">{copy.inauguration.kicker}</span>
            <h1 className="mt-2 font-serif text-[40px] font-normal leading-tight">
              {copy.inauguration.title}
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-text-secondary">
              {copy.inauguration.intro}
            </p>

            <form className="mt-8 flex flex-col gap-8" onSubmit={submitDossier} noValidate>
              <fieldset className="flex flex-col gap-5">
                <legend className="mb-4 flex items-baseline gap-2.5 text-[17px] font-medium">
                  <span className="font-mono text-[13px] text-primary">01</span>
                  {copy.inauguration.stepIdentity}
                </legend>
                <div>
                  <Label htmlFor="president-name">{copy.inauguration.presidentLabel}</Label>
                  <Input
                    id="president-name"
                    className="mt-2 max-w-[480px]"
                    value={presidentName}
                    autoFocus
                    maxLength={40}
                    placeholder={copy.inauguration.presidentPlaceholder}
                    aria-invalid={errors.presidentName !== undefined}
                    aria-describedby={
                      errors.presidentName !== undefined ? 'president-error' : 'president-hint'
                    }
                    onChange={(event) => {
                      setPresidentName(event.target.value);
                      setErrors({});
                    }}
                  />
                  {errors.presidentName !== undefined ? (
                    <p id="president-error" role="alert" className="mt-2 text-xs text-negative">
                      {errors.presidentName}
                    </p>
                  ) : (
                    <p id="president-hint" className="mt-2 text-xs text-muted-foreground">
                      {copy.inauguration.presidentHint}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <span id="honorific-label" className="text-sm font-medium">
                    {copy.inauguration.honorificLabel}
                  </span>
                  <div
                    role="radiogroup"
                    aria-labelledby="honorific-label"
                    className="flex max-w-[240px] gap-1 rounded-[10px] border border-border bg-card p-1"
                  >
                    {HONORIFICS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={honorific === value}
                        onClick={() => {
                          setHonorific(value);
                          setHead(LOOKS_BY_HONORIFIC[value][0] ?? 'peci');
                        }}
                        className={segment(honorific === value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span id="look-label" className="text-sm font-medium">
                    {copy.inauguration.lookLabel}
                  </span>
                  <div role="radiogroup" aria-labelledby="look-label" className="flex gap-3">
                    {LOOKS_BY_HONORIFIC[honorific].map((value) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={head === value}
                        onClick={() => setHead(value)}
                        className={cn(
                          'flex flex-col items-center gap-2 rounded-[10px] p-2 text-xs transition-shadow duration-150',
                          head === value
                            ? 'shadow-[0_0_0_2px_hsl(var(--primary))]'
                            : 'shadow-[0_0_0_1px_hsl(var(--border))]',
                        )}
                      >
                        <Portrait head={value} {...PORTRAIT_COLORS} size={72} />
                        {copy.inauguration.lookOptions[value]}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {copy.inauguration.lookNote}
                  </span>
                </div>
              </fieldset>

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-4 flex items-baseline gap-2.5 text-[17px] font-medium">
                  <span className="font-mono text-[13px] text-primary">02</span>
                  {copy.inauguration.stepCabinet}
                </legend>
                <Label htmlFor="cabinet-name" className="sr-only">
                  {copy.inauguration.cabinetLabel}
                </Label>
                <Input
                  id="cabinet-name"
                  className="max-w-[480px]"
                  value={cabinetName}
                  maxLength={40}
                  placeholder={copy.inauguration.cabinetPlaceholder}
                  aria-invalid={errors.cabinetName !== undefined}
                  aria-describedby={
                    errors.cabinetName !== undefined ? 'cabinet-error' : 'cabinet-hint'
                  }
                  onChange={(event) => {
                    setCabinetName(event.target.value);
                    setErrors({});
                  }}
                />
                {errors.cabinetName !== undefined ? (
                  <p id="cabinet-error" role="alert" className="text-xs text-negative">
                    {errors.cabinetName}
                  </p>
                ) : (
                  <p id="cabinet-hint" className="text-xs text-muted-foreground">
                    {copy.inauguration.cabinetHint}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {copy.inauguration.cabinetSuggestions}
                  </span>
                  {copy.inauguration.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setCabinetName(suggestion)}
                      className="h-8 rounded-md bg-raised px-3 text-[13px] text-foreground transition-colors hover:bg-raised-hover"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </fieldset>

              <Button type="submit" size="lg" className="self-start">
                {copy.inauguration.submit}
              </Button>
            </form>
          </section>

          <aside className="self-start">
            <div className="flex flex-col gap-5 rounded-sm bg-paper p-8 text-ink shadow-document">
              <span className="text-xs font-semibold text-ink-muted">
                {copy.inauguration.summaryLabel}
              </span>
              <div className="flex items-center gap-4">
                <Portrait head={head} {...PORTRAIT_COLORS} size={96} />
                <div className="flex flex-col gap-1">
                  <span className="text-[13px] text-ink-muted">
                    {copy.inauguration.summaryPresident(honorific)}
                  </span>
                  <span className="font-serif text-2xl leading-tight">{name || '…'}</span>
                </div>
              </div>
              <div className="h-px bg-ink/15" />
              <dl className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{copy.inauguration.summaryCabinet}</dt>
                  <dd className="font-medium">{cabinet || copy.inauguration.summaryNoCabinet}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{copy.inauguration.summaryStart}</dt>
                  <dd>{`${startYear} · K1`}</dd>
                </div>
              </dl>
              <p className="text-xs text-ink-muted">{copy.inauguration.previewText(name)}</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

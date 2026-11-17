import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { definitions } from '@/content/gameContent';
import { copy } from '@/copy/id';
import { gameController } from '@/store/controller';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/ui/components/button';
import { Input } from '@/ui/components/input';
import { Label } from '@/ui/components/label';
import { Seal } from '@/ui/Seal';

import { validateInauguration, type InaugurationErrors } from './validation';

export default function InaugurationPage() {
  const navigate = useNavigate();
  const startYear = definitions.scenario.startYear;
  const [presidentName, setPresidentName] = useState('');
  const [cabinetName, setCabinetName] = useState('');
  const [errors, setErrors] = useState<InaugurationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sworn, setSworn] = useState(false);
  const inaugurated = useGameStore((store) => store.state);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateInauguration({ presidentName, cabinetName });
    if (nextErrors.presidentName !== undefined || nextErrors.cabinetName !== undefined) {
      setErrors(nextErrors);
      return;
    }
    setSubmitting(true);
    void gameController
      .startCampaign({ presidentName: presidentName.trim(), cabinetName: cabinetName.trim() })
      .then((result) => {
        setSubmitting(false);
        if (result.ok) setSworn(true);
        else setErrors({ presidentName: result.message });
      });
  };

  if (sworn && inaugurated !== null) {
    return (
      <main className="grid min-h-screen place-items-center px-10 py-8">
        <section
          aria-live="polite"
          className="ceremony-enter relative w-full max-w-[640px] bg-paper px-12 py-14 text-center text-ink shadow-document"
        >
          <Seal label={copy.menu.sealLabel} className="mx-auto h-24 w-24 text-maroon/75" />
          <p className="mt-8 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-ink/75">
            {copy.inauguration.ceremonyKicker}
          </p>
          <h1 className="mt-3 font-serif text-[2.6rem] leading-tight">
            {copy.inauguration.ceremonyTitle(inaugurated.presidentName)}
          </h1>
          {inaugurated.cabinetName !== undefined && (
            <p className="mt-2 font-serif text-lg italic text-ink/70">
              {copy.inauguration.ceremonyCabinet(inaugurated.cabinetName)}
            </p>
          )}
          <div className="mx-auto mt-8 h-px w-24 bg-ink/25" />
          <p className="mx-auto mt-6 max-w-md font-serif text-base italic leading-relaxed text-ink/80">
            “{copy.inauguration.oath}”
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink/75">
            {copy.inauguration.ceremonyBody(startYear)}
          </p>
          <Button autoFocus size="lg" className="mt-10" onClick={() => navigate('/game/dashboard')}>
            {copy.inauguration.ceremonyEnter}
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-10 py-8">
      <div className="mx-auto max-w-[1220px]">
        <div className="flex items-center justify-between gap-6 border-b border-border/50 pb-5">
          <Link to="/" className="flex items-center gap-3">
            <Seal label={copy.menu.sealLabel} className="h-10 w-10" />
            <span>
              <span className="block font-serif text-lg tracking-[0.16em]">{copy.app.name}</span>
              <span className="text-[0.6rem] uppercase tracking-institutional text-muted-foreground">
                {copy.inauguration.kicker}
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {copy.inauguration.back}
          </Link>
        </div>

        <div className="grid gap-12 py-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.98fr)]">
          <section className="max-w-xl">
            <p className="institutional-label">{copy.inauguration.kicker}</p>
            <h1 className="mt-3 text-[3.2rem] leading-[0.98]">{copy.inauguration.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {copy.inauguration.intro}
            </p>
            <div className="rule-line mt-7" />

            <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <Label htmlFor="president-name">{copy.inauguration.presidentLabel}</Label>
                <Input
                  id="president-name"
                  className="mt-2"
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
                  <p id="president-error" role="alert" className="mt-2 text-xs text-red-300">
                    {errors.presidentName}
                  </p>
                ) : (
                  <p id="president-hint" className="mt-2 text-xs text-muted-foreground">
                    {copy.inauguration.presidentHint}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cabinet-name">{copy.inauguration.cabinetLabel}</Label>
                <Input
                  id="cabinet-name"
                  className="mt-2"
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
                  <p id="cabinet-error" role="alert" className="mt-2 text-xs text-red-300">
                    {errors.cabinetName}
                  </p>
                ) : (
                  <p id="cabinet-hint" className="mt-2 text-xs text-muted-foreground">
                    {copy.inauguration.cabinetHint}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-4 border-t border-border/50 pt-6">
                <span className="mt-1 h-px w-10 shrink-0 bg-primary/60" aria-hidden="true" />
                <p className="font-serif text-sm italic leading-relaxed text-foreground/80">
                  “{copy.inauguration.oath}”
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
                {submitting ? copy.inauguration.submitting : copy.inauguration.submit}
              </Button>
            </form>
          </section>

          <section className="flex items-start justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] bg-paper p-8 text-ink shadow-document">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:linear-gradient(hsl(var(--ink)/0.4)_1px,transparent_1px)] [background-size:100%_28px]"
              />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-ink/75">
                      {copy.inauguration.previewLabel}
                    </p>
                    <p className="mt-2 font-serif text-2xl leading-tight">
                      {copy.inauguration.previewText(presidentName.trim())}
                    </p>
                  </div>
                  <Seal label={copy.menu.sealLabel} className="h-16 w-16 text-maroon/75" />
                </div>

                <div className="mt-8 h-px w-full bg-ink/20" />

                <dl className="mt-6 space-y-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/75">
                      {copy.inauguration.presidentLabel}
                    </dt>
                    <dd className="font-serif text-lg">{presidentName.trim() || '…'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/75">
                      {copy.inauguration.cabinetLabel}
                    </dt>
                    <dd className="font-serif text-lg">{cabinetName.trim() || '…'}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/75">
                      {copy.common.turn}
                    </dt>
                    <dd className="text-sm">{copy.game.turnLabel(startYear, 1)}</dd>
                  </div>
                </dl>

                <div className="mt-8 border-t border-ink/15 pt-5">
                  <p className="text-[0.62rem] uppercase tracking-[0.16em] text-ink/75">
                    {copy.inauguration.oath}
                  </p>
                  <div className="mt-6 flex items-end justify-between">
                    <span className="font-serif text-2xl italic text-ink/35">
                      {presidentName.trim() || '…'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

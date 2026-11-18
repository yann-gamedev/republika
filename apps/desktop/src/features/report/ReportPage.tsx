import { Link } from 'react-router-dom';

import { useGameState } from '@/app/useGame';
import { copy } from '@/copy/id';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/ui/components/button';

import { ReportView } from './ReportView';

function FinalBanner() {
  return (
    <div
      className="mx-auto mb-6 flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-4 rounded-lg border border-primary/40 bg-primary/[0.07] px-5 py-4"
      data-testid="campaign-summary"
    >
      <p className="font-serif text-lg">{copy.final.bannerTitle}</p>
      <Button asChild size="sm">
        <Link to="/game/final">{copy.final.open}</Link>
      </Button>
    </div>
  );
}

const inkButton =
  'mt-2 inline-flex h-11 items-center justify-center rounded-md bg-ink px-5 text-sm font-medium text-paper transition-colors duration-150 ease-standard hover:bg-[#2E2A22]';

export default function ReportPage() {
  const state = useGameState();
  const report = useGameStore((store) => store.lastReport);

  if (report === null) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-[34px] font-normal">{copy.report.title}</h1>
        <p className="text-sm text-text-secondary">{copy.report.empty}</p>
      </div>
    );
  }

  return (
    <>
      {state.status === 'completed' && <FinalBanner />}
      <ReportView
        report={report}
        maxTurns={state.maxTurns}
        titleAs="h1"
        footer={
          <Link to="/game/dashboard" className={inkButton}>
            {copy.report.continue}
          </Link>
        }
      />
    </>
  );
}

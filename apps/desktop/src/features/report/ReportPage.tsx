import { Link } from 'react-router-dom';

import { PageHeader } from '@/app/PageHeader';
import { useGameState } from '@/app/useGame';
import { copy } from '@/copy/id';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/ui/components/button';

import { ReportView } from './ReportView';

function FinalBanner() {
  return (
    <div
      className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-primary/40 bg-primary/[0.07] px-5 py-4"
      data-testid="campaign-summary"
    >
      <p className="font-serif text-lg">{copy.final.bannerTitle}</p>
      <Button asChild size="sm">
        <Link to="/game/final">{copy.final.open}</Link>
      </Button>
    </div>
  );
}

export default function ReportPage() {
  const state = useGameState();
  const report = useGameStore((store) => store.lastReport);

  return (
    <>
      <PageHeader
        kicker={copy.report.kicker}
        title={
          report === null
            ? copy.report.title
            : copy.report.reportTitle(report.presidentName, report.turn)
        }
        subtitle={copy.report.subtitle}
        actions={
          <Button asChild size="sm">
            <Link to="/game/dashboard">{copy.report.continue}</Link>
          </Button>
        }
      />
      {state.status === 'completed' && <FinalBanner />}
      {report === null ? (
        <p className="text-sm text-muted-foreground">{copy.dashboard.noReport}</p>
      ) : (
        <ReportView report={report} />
      )}
    </>
  );
}

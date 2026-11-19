import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppErrorBoundary } from '@/app/AppErrorBoundary';
import { DesktopShell } from '@/app/DesktopShell';
import { GameLayout } from '@/app/GameLayout';
import { RouteFallback } from '@/app/RouteFallback';
import { useAppStore } from '@/store/useAppStore';

const MenuPage = lazy(() => import('@/features/menu/MenuPage'));
const InaugurationPage = lazy(() => import('@/features/inauguration/InaugurationPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const PoliciesPage = lazy(() => import('@/features/policies/PoliciesPage'));
const ParliamentPage = lazy(() => import('@/features/parliament/ParliamentPage'));
const CabinetPage = lazy(() => import('@/features/cabinet/CabinetPage'));
const EventsPage = lazy(() => import('@/features/events/EventsPage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));
const SessionPage = lazy(() => import('@/features/session/SessionPage'));
const HistoryPage = lazy(() => import('@/features/history/HistoryPage'));
const ReportPage = lazy(() => import('@/features/report/ReportPage'));
const FinalReportPage = lazy(() => import('@/features/final/FinalReportPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const SavesPage = lazy(() => import('@/features/saves/SavesPage'));
const NotFoundPage = lazy(() => import('@/features/not-found/NotFoundPage'));

/** Hanya ada di build E2E: memaksa error untuk menguji error boundary per layar. */
function CrashForTest(): never {
  throw new Error('Crash uji E2E');
}

export function App() {
  const initialize = useAppStore((store) => store.initialize);
  const uiScale = useAppStore((store) => store.settings.uiScale);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale}%`;
  }, [uiScale]);

  return (
    <AppErrorBoundary>
      <DesktopShell />
      <HashRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/inauguration" element={<InaugurationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/saves" element={<SavesPage />} />

            <Route path="/game" element={<GameLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="policies" element={<PoliciesPage />} />
              <Route path="parliament" element={<ParliamentPage />} />
              <Route path="cabinet" element={<CabinetPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="session" element={<SessionPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="final" element={<FinalReportPage />} />
              {import.meta.env.MODE === 'e2e' && (
                <Route path="__crash" element={<CrashForTest />} />
              )}
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </AppErrorBoundary>
  );
}

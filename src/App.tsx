import { common } from './i18n/common';
import { useLang } from './i18n/lang';
import { tr } from './i18n/t';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ErrorBox, Loading, Screen } from './app/Shell';
import { LanguageSync } from './app/LanguageSync';
import { SessionProvider, useSession } from './app/session';
import { AddWordsScreen } from './screens/AddWords';
import { CardsScreen } from './screens/Cards';
import { DictionaryScreen } from './screens/Dictionary';
import { MainScreen } from './screens/Main';
import { MethodScreen } from './screens/Method';
import { NotRegisteredScreen } from './screens/NotRegistered';
import { OnboardingScreen } from './screens/Onboarding';
import { OutsideTelegramScreen } from './screens/OutsideTelegram';
import { ProfileScreen } from './screens/Profile';
import { ReportsScreen } from './screens/Reports';
import { StaffScreen } from './screens/Staff';
import { SubmitReportScreen } from './screens/SubmitReport';
import { TeacherWordsScreen } from './screens/TeacherWords';
import { WordScreen } from './screens/Word';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false } },
});

/** Routes a signed-in state to the right entry screen; ACTIVE students get the app. */
function Gate() {
  useLang();
  const { state, refresh } = useSession();
  const location = useLocation();
  if (state.kind === 'outside') return <OutsideTelegramScreen />;
  if (state.kind === 'loading')
    return (
      <Screen>
        <Loading text={tr(common, 'checkingAccess')} />
      </Screen>
    );
  if (state.kind === 'error')
    return (
      <Screen>
        <div style={{ paddingTop: 24 }}>
          <ErrorBox error={new Error(state.message)} retry={refresh} />
        </div>
      </Screen>
    );
  if (state.status === 'PENDING_NAME')
    return (
      <>
        <LanguageSync />
        {location.pathname === '/onboarding' ? (
          <OnboardingScreen />
        ) : (
          <Navigate to="/onboarding" replace />
        )}
      </>
    );
  if (state.status === 'STAFF') return <StaffScreen />;
  if (state.status !== 'ACTIVE')
    return <NotRegisteredScreen archived={state.status === 'ARCHIVED'} />;
  return (
    <>
      <LanguageSync />
      <Routes>
        <Route path="/" element={<MainScreen />} />
        <Route path="/onboarding" element={<Navigate to="/" replace />} />
        <Route path="/cards" element={<CardsScreen />} />
        <Route path="/words" element={<DictionaryScreen />} />
        <Route path="/words/add" element={<AddWordsScreen />} />
        <Route path="/words/teacher" element={<TeacherWordsScreen />} />
        <Route path="/words/:id" element={<WordScreen />} />
        <Route path="/reports" element={<ReportsScreen />} />
        <Route path="/reports/new" element={<SubmitReportScreen />} />
        <Route path="/reports/method" element={<MethodScreen />} />
        <Route path="/profile" element={<ProfileScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {/* Hash routing: Telegram opens one URL; deep links stay inside it. */}
        <HashRouter>
          <Gate />
        </HashRouter>
      </SessionProvider>
    </QueryClientProvider>
  );
}

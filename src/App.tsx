import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/DashboardLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicOnlyRoute } from '@/components/PublicOnlyRoute';
import { LandingExperienceEnhancer } from '@/components/LandingExperienceEnhancer';
import { LandingExploreBridge } from '@/components/LandingExploreBridge';
import { InteractiveProductDemo } from '@/components/InteractiveProductDemo';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';
/*
 * Route-level code splitting. The landing page stays in the entry chunk
 * because it is the first paint for anonymous visitors; everything behind
 * authentication is fetched on demand.
 */
import { LandingPage } from '@/pages/LandingPage';

const OverviewView = lazy(() => import('@/features/overview/OverviewView').then((m) => ({ default: m.OverviewView })));
const RequestsView = lazy(() => import('@/features/requests/RequestsView').then((m) => ({ default: m.RequestsView })));
const ProfilesView = lazy(() => import('@/features/profiles/ProfilesView').then((m) => ({ default: m.ProfilesView })));
const ProfileDetailView = lazy(() => import('@/features/profiles/ProfileDetailView').then((m) => ({ default: m.ProfileDetailView })));
const ProgressView = lazy(() => import('@/features/progress/ProgressView').then((m) => ({ default: m.ProgressView })));
const ExploreView = lazy(() => import('@/features/explore/ExploreView').then((m) => ({ default: m.ExploreView })));
const CompareView = lazy(() => import('@/features/compare/CompareView').then((m) => ({ default: m.CompareView })));
const AnalyzeView = lazy(() => import('@/features/analyze/AnalyzeView').then((m) => ({ default: m.AnalyzeView })));
const IntegrationModesView = lazy(() => import('@/features/integrations/IntegrationModesView').then((m) => ({ default: m.IntegrationModesView })));
const GitHubDataView = lazy(() => import('@/features/integrations/GitHubDataView').then((m) => ({ default: m.GitHubDataView })));
const OwnershipVerificationView = lazy(() => import('@/features/integrations/OwnershipVerificationView').then((m) => ({ default: m.OwnershipVerificationView })));
const AIInsightsView = lazy(() => import('@/features/ai-insights/AIInsightsView').then((m) => ({ default: m.AIInsightsView })));
const GoalsView = lazy(() => import('@/features/goals/GoalsView').then((m) => ({ default: m.GoalsView })));
const SettingsView = lazy(() => import('@/features/settings/SettingsView').then((m) => ({ default: m.SettingsView })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('@/pages/SignupPage').then((m) => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const OAuthConsent = lazy(() => import('@/pages/OAuthConsent').then((m) => ({ default: m.OAuthConsent })));
const NotFound = lazy(() => import('@/pages/NotFound').then((m) => ({ default: m.NotFound })));

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2, refetchOnWindowFocus: false } } });

function App() {
  return <QueryClientProvider client={queryClient}><AuthProvider><ThemeProvider><BrowserRouter basename={basename}><LandingExperienceEnhancer /><LandingExploreBridge /><InteractiveProductDemo /><Suspense fallback={<RouteFallback />}>
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/explore" element={<ExploreView />} />
    <Route element={<PublicOnlyRoute />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Route>
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/oauth-consent" element={<OAuthConsent />} />
    <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<DashboardLayout />}>
      <Route index element={<OverviewView />} /><Route path="requests" element={<RequestsView />} />
      <Route path="profiles" element={<ProfilesView />} /><Route path="profile/:id" element={<ProfileDetailView />} /><Route path="progress" element={<ProgressView />} /><Route path="explore" element={<ExploreView />} /><Route path="compare" element={<CompareView />} /><Route path="analytics" element={<AnalyzeView />} /><Route path="integrations" element={<IntegrationModesView />} /><Route path="integrations/github" element={<GitHubDataView />} /><Route path="integrations/verify/:platform" element={<OwnershipVerificationView />} /><Route path="ai-insights" element={<AIInsightsView />} /><Route path="goals" element={<GoalsView />} /><Route path="settings" element={<SettingsView />} />
    </Route></Route><Route path="*" element={<NotFound />} />
  </Routes>
  </Suspense></BrowserRouter></ThemeProvider></AuthProvider></QueryClientProvider>;
}
export default App;

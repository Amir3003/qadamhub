import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { AmbientBackground } from './components/AmbientBackground';
import { ScrollToTop } from './components/ScrollToTop';
import { RadarPage } from './pages/RadarPage';
import { MemoryPage } from './pages/MemoryPage';
import { CvLabPage } from './pages/CvLabPage';
import { NetworkPage } from './pages/NetworkPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ApplicationStudioPage } from './pages/ApplicationStudioPage';
import { JoinPage } from './pages/JoinPage';
import { AccountPortalPage } from './pages/AccountPortalPage';
import { WelcomePage } from './pages/WelcomePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { RefundPage } from './pages/RefundPage';
import { StudentAccessPage } from './pages/StudentAccessPage';
import { StudentsLandingPage } from './pages/StudentsLandingPage';
import { StartPage } from './pages/StartPage';
import { FeedbackWidget } from './components/FeedbackWidget';
import { StaffPage } from './pages/StaffPage';
import { LearnerSync } from './components/LearnerSync';
import { OnboardingWizard } from './components/OnboardingWizard';
import { CvGapsModal } from './components/CvGapsModal';
import { QuizModal } from './components/QuizModal';
import { useApp } from './context/AppContext';
import { isProfileValid } from './db/userProfile';

export const App: React.FC = () => {
  const { userProfile } = useApp();
  const location = useLocation();
  // Two ways in: a free student profile on this device (B2C, /start), or an institution
  // invite code (B2B, /student). Cohort data is protected by the database, not by this gate.
  const hasAccess = isProfileValid(userProfile);

  // Staff workspace and student sign-in work without a local profile.
  if (location.pathname === '/staff' || location.pathname === '/student') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-100 antialiased font-sans relative">
        <ScrollToTop />
        <AmbientBackground />
        {location.pathname === '/staff' ? <StaffPage /> : <StudentAccessPage />}
      </div>
    );
  }

  // Public landing and free sign-up for individual students
  if (location.pathname === '/students' || location.pathname === '/start') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-100 antialiased font-sans relative">
        <ScrollToTop />
        <AmbientBackground />
        {location.pathname === '/students' ? <StudentsLandingPage /> : <StartPage />}
      </div>
    );
  }

  // Public legal pages, readable with or without an account
  const legalPage = { '/privacy': PrivacyPage, '/terms': TermsPage, '/refund': RefundPage }[location.pathname];
  if (legalPage) {
    const LegalPage = legalPage;
    return (
      <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-100 antialiased font-sans relative">
        <ScrollToTop />
        <AmbientBackground />
        <LegalPage />
      </div>
    );
  }

  // Shared network has verified email identity and must work on a fresh device.
  if (location.pathname === '/join') return <JoinPage />;
  if (location.pathname === '/network' && !hasAccess) {
    return (
      <div className="min-h-[100dvh] bg-transparent text-slate-100 relative">
        <AmbientBackground />
        <NetworkPage />
      </div>
    );
  }

  // Without a profile every app route goes back to the public student landing.
  if (!hasAccess && location.pathname !== '/welcome') {
    return <Navigate to="/students" replace />;
  }

  // Public B2B landing for training centers, on the live ambient background
  if (location.pathname === '/welcome') {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-100 antialiased selection:bg-accent/20 selection:text-white font-sans relative">
        <ScrollToTop />
        <AmbientBackground />
        <WelcomePage />
      </div>
    );
  }

  // Dedicated Full-Page Account Portal Layout (Hides standard workspace sidebar)
  if (
    location.pathname.startsWith('/account') ||
    location.pathname === '/profile' ||
    location.pathname === '/settings' ||
    location.pathname === '/support'
  ) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-transparent text-slate-100 antialiased selection:bg-accent/20 selection:text-white font-sans relative">
        <ScrollToTop />
        <AmbientBackground />
        <AccountPortalPage />
        <OnboardingWizard />
        <FeedbackWidget />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-slate-100 flex flex-col lg:flex-row antialiased selection:bg-accent/20 selection:text-white font-sans relative">
      <ScrollToTop />
      <AmbientBackground />
      <LearnerSync />

      {/* 248px Left Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area: each view applies its own pb-28 clearance for the mobile bottom bar */}
      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        <Routes>
          <Route path="/" element={<RadarPage />} />
          <Route path="/dashboard" element={<RadarPage />} />
          <Route path="/cv" element={<CvLabPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/application-studio" element={<ApplicationStudioPage />} />
          <Route path="/logs" element={<Navigate to="/account?tab=settings" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Global Interactive Modals & Wizards */}
      <OnboardingWizard />
      <CvGapsModal />
      <QuizModal />
      <FeedbackWidget />
    </div>
  );
};

export default App;

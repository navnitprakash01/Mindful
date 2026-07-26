import React, { useState, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AmbientShaderCanvas } from './components/ui/AmbientShaderCanvas';
import { Header } from './components/layout/Header';
import { BottomNav } from './components/layout/BottomNav';
import { NotificationDrawer } from './components/layout/NotificationDrawer';
import { CommandK } from './components/ui/CommandK';
import { Toast } from './components/ui/Toast';
import { AuthModal } from './components/features/AuthModal';
import { PricingModal } from './components/features/PricingModal';

const LandingPage = lazy(() => import('./components/features/LandingPage').then(m => ({ default: m.LandingPage })));
const ZenDashboard = lazy(() => import('./components/features/ZenDashboard').then(m => ({ default: m.ZenDashboard })));
const JournalView = lazy(() => import('./components/features/JournalView').then(m => ({ default: m.JournalView })));
const MoodTrackingView = lazy(() => import('./components/features/MoodTrackingView').then(m => ({ default: m.MoodTrackingView })));
const AICompanionView = lazy(() => import('./components/features/AICompanionView').then(m => ({ default: m.AICompanionView })));
const HabitsView = lazy(() => import('./components/features/HabitsView').then(m => ({ default: m.HabitsView })));
const AnalyticsView = lazy(() => import('./components/features/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const SettingsView = lazy(() => import('./components/features/SettingsView').then(m => ({ default: m.SettingsView })));
const ProfileView = lazy(() => import('./components/features/ProfileView').then(m => ({ default: m.ProfileView })));

const ViewSkeleton = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 pt-24 pb-36 space-y-8" role="status" aria-label="Loading view">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="animate-shimmer h-32 sm:h-40 rounded-[28px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]" />
    ))}
  </div>
);

const AppContent: React.FC = () => {
  const { currentView, toastMessage } = useApp();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // If AuthContext is loading, render the ViewSkeleton
  if (isLoading) {
    return (
      <div className="min-h-screen relative font-body-md text-on-surface bg-[#09090B]">
         <ViewSkeleton />
      </div>
    );
  }

  // If not authenticated, we force the unauthenticated entry point (Landing Page)
  if (!isAuthenticated && !user) {
    return (
      <div className="min-h-screen relative font-body-md text-on-surface selection:bg-primary/10 select-none">
        <AmbientShaderCanvas opacity={0.45} />
        <main className="relative z-10">
          <LandingPage onOpenAuth={() => setIsAuthOpen(true)} />
        </main>
        <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
        <Toast message={toastMessage} />
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingPage onOpenAuth={() => setIsAuthOpen(true)} />;
      case 'dashboard':
        return <ZenDashboard />;
      case 'journal':
        return <JournalView />;
      case 'mood':
        return <MoodTrackingView />;
      case 'companion':
        return <AICompanionView />;
      case 'habits':
        return <HabitsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <ZenDashboard />;
    }
  };

  return (
    <div className="min-h-screen relative font-body-md text-on-surface selection:bg-primary/10 select-none">
      {/* Background WebGL Ambient Shader */}
      <AmbientShaderCanvas opacity={currentView === 'companion' ? 0.2 : 0.45} />

      {/* Top Header */}
      {currentView !== 'landing' && <Header />}

      {/* View Switcher */}
      <main className="relative z-10">
        <Suspense fallback={<ViewSkeleton />}>
          {renderView()}
        </Suspense>
      </main>

      {/* Floating Bottom Nav */}
      <BottomNav />

      {/* Global Overlays & Modals */}
      <CommandK />
      <NotificationDrawer />
      <PricingModal />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <Toast message={toastMessage} />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

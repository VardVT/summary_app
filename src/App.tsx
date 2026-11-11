import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppShell } from './components/AppShell';
import { Loader2 } from 'lucide-react';

// React.lazy for code splitting and page suspense
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const AppPage = lazy(() => import('./pages/AppPage').then(m => ({ default: m.AppPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })));

const SuspenseFallback: React.FC = () => (
  <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-slate-100 font-mono text-xs">
    <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
    <span className="text-cyan-400 font-bold uppercase tracking-wider">Loading Module...</span>
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <HashRouter>
              <Suspense fallback={<SuspenseFallback />}>
                <Routes>
                  {/* Main Ecosystem Routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<AppShell />}>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/apps/:appId" element={<AppPage />} />
                      <Route path="/403" element={<ForbiddenPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </HashRouter>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

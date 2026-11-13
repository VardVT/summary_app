import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  ClipboardCheck, 
  FileText, 
  Menu as MenuIcon, 
  Box, 
  Navigation, 
  Calendar, 
  TrendingUp,
  LayoutGrid,
  Monitor,
  X,
  Search,
  Users,
  RefreshCw,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { APPS_CONFIG } from '../config/apps';
import { AppAccessLevel, AppConfig } from '../types';
import { BackgroundSlideshow } from './BackgroundSlideshow';
import { SignInModal } from './SignInModal';
import { resolveEffectiveAppAccess } from '../services/teamDirectoryService';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Menu: MenuIcon,
  Box,
  Navigation,
  Calendar,
  TrendingUp,
  Users,
  GraduationCap,
};

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role, signOut } = useAuth();
  const { projects, selectedProject, hasProjects, loading: projectsLoading, requiresAuth, setProject, refreshProjects } = useProject();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState<boolean>(false);
  const [gridOverlayOpen, setGridOverlayOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [hoveredDock, setHoveredDock] = useState<{
    app: AppConfig;
    accessLevel: AppAccessLevel;
    left: number;
    top: number;
  } | null>(null);

  const isHomePage = location.pathname === '/';

  // Live time updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentApp = APPS_CONFIG.find(app => location.pathname === `/apps/${app.id}`);

  const handleAppLaunch = (app: AppConfig) => {
    navigate(`/apps/${app.id}`);
  };

  const filteredApps = APPS_CONFIG.filter(
    app =>
      app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If on HomePage, HomePage handles its own wallpaper layout completely
  if (isHomePage) {
    return <Outlet />;
  }

  // When on an App page (/apps/:appId) or internal route:
  return (
    <div className="min-h-screen bg-[#0B1F33] text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden">
      
      {/* 10-Second Auto-Rotating Background Slideshow for Framed App Mode */}
      <BackgroundSlideshow intervalMs={10000} opacityClass="opacity-20" />

      {/* Top Header Bar for App Viewport */}
      <header className="relative z-30 h-14 px-4 md:px-6 bg-[#0E1D2D]/95 border-b border-slate-700/60 backdrop-blur-xl flex items-center justify-between shrink-0 shadow-lg">
        
        {/* Top Left Widget: Back to Hub Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            title="Return to Engineering Hub"
            className="w-9 h-9 rounded-full bg-[#F59E0B] text-slate-950 flex items-center justify-center font-bold shadow-md hover:bg-amber-400 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-white font-sans leading-tight">Piping Design Hub</span>
            <span className="text-[10px] text-cyan-400 font-mono truncate max-w-[180px]">
              {currentApp ? currentApp.label : 'Engineering App'}
            </span>
          </div>
        </div>

        {/* Top Center Title */}
        {currentApp && (
          <div className="hidden md:flex items-center gap-2 font-sans font-semibold text-xs text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30 tracking-wide shadow-sm">
            <span>{currentApp.label}</span>
          </div>
        )}

          {/* Top Right: Vessel Selector & User Control */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                const next = !projectDropdownOpen;
                setProjectDropdownOpen(next);
                if (next) refreshProjects();
              }}
              className="bg-slate-800/80 border border-slate-700 rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs font-mono text-slate-200 hover:border-amber-500/50 transition-all cursor-pointer"
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  hasProjects ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-[#22D3EE] font-mono">{selectedProject.code}</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-slate-300 font-sans truncate max-w-[140px] hidden sm:inline">
                {selectedProject.name}
              </span>
            </button>

            {projectDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#0E1D2D] border border-slate-700 rounded-2xl shadow-2xl p-2.5 z-50 backdrop-blur-xl">
                <div className="px-2 py-1.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                    Select Active Vessel
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshProjects()}
                    disabled={projectsLoading}
                    title="Refresh vessels from database"
                    className="p-1 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${projectsLoading ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                </div>

                <div className="mt-1.5 space-y-1 max-h-72 overflow-y-auto pr-0.5">
                  {projects.length === 0 ? (
                    <div className="p-3 text-center text-xs font-sans text-slate-400 space-y-2">
                      <div>
                        {projectsLoading
                          ? 'Loading vessels from database...'
                          : requiresAuth
                          ? 'Sign in to load vessels from database.'
                          : 'No vessels found in database.'}
                      </div>
                      {!projectsLoading && requiresAuth && !user && (
                        <button
                          type="button"
                          onClick={() => {
                            setProjectDropdownOpen(false);
                            setSignInModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer"
                        >
                          Sign in
                        </button>
                      )}
                    </div>
                  ) : (
                    projects.map(proj => (
                      <button
                        key={proj.id}
                        onClick={() => {
                          setProject(proj.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs font-sans flex items-center justify-between gap-2 transition-colors ${
                          selectedProject.id === proj.id
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-amber-400 font-bold truncate">{proj.code}</div>
                          <div className="text-slate-200 truncate text-[11px] font-normal">{proj.name}</div>
                        </div>
                        <span className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md font-semibold shrink-0">
                          {proj.progressPercentage}%
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {user ? (
            <button
              onClick={signOut}
              className="px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold font-sans rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            >
              Sign out
            </button>
          ) : (
            <button
              onClick={() => setSignInModalOpen(true)}
              className="px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold font-sans rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      {/* Main App Content Viewport */}
      <main className="relative z-10 flex-1 w-full flex flex-col min-h-0">
        <Outlet />
      </main>

      {/* Persistent Bottom Floating Dock for App Navigation */}
      <footer className="relative z-30 w-full max-w-5xl mx-auto flex items-center justify-between gap-4 py-3 px-4">
        <button
          onClick={() => setGridOverlayOpen(true)}
          title="Open Application Grid Index"
          className="w-10 h-10 rounded-xl bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl flex items-center justify-center text-[#F59E0B] shadow-2xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
        >
          <LayoutGrid className="w-5 h-5 fill-current" />
        </button>

        <div
          onMouseLeave={() => setHoveredDock(null)}
          className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-1.5 flex items-center justify-center gap-2 shadow-2xl overflow-x-auto no-scrollbar max-w-full"
        >
          {APPS_CONFIG.map(app => {
            const IconComponent = ICON_MAP[app.icon] || CheckCircle2;
            const isSelected = location.pathname === `/apps/${app.id}`;
            const accessLevel = resolveEffectiveAppAccess(user, role, app);
            const hasPermission = accessLevel !== 'ban';

            const showTooltip = (el: HTMLElement) => {
              const rect = el.getBoundingClientRect();
              setHoveredDock({
                app,
                accessLevel,
                left: rect.left + rect.width / 2,
                top: rect.top,
              });
            };

            return (
              <button
                key={app.id}
                onClick={() => {
                  setHoveredDock(null);
                  handleAppLaunch(app);
                }}
                onMouseEnter={e => showTooltip(e.currentTarget)}
                onMouseLeave={() => setHoveredDock(prev => (prev?.app.id === app.id ? null : prev))}
                onFocus={e => showTooltip(e.currentTarget)}
                onBlur={() => setHoveredDock(prev => (prev?.app.id === app.id ? null : prev))}
                aria-label={`${app.label} (${app.tag})`}
                className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer shrink-0 ${
                  app.color || 'bg-slate-700'
                } ${isSelected ? 'ring-2 ring-amber-400 scale-105' : ''} ${!hasPermission ? 'opacity-45 grayscale' : ''}`}
              >
                <IconComponent className="w-4 h-4 stroke-[2]" />
              </button>
            );
          })}
        </div>

        {/* Unclipped Floating Dock Tooltip */}
        {hoveredDock && (
          <div
            className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: hoveredDock.left, top: hoveredDock.top - 10 }}
          >
            <div className="bg-[#0A1623]/95 border border-slate-700 text-slate-100 rounded-xl px-3 py-1.5 shadow-2xl backdrop-blur-xl whitespace-nowrap text-center">
              <div className="text-xs font-sans font-bold text-white leading-tight">
                {hoveredDock.app.label}
              </div>
              <div className="text-[11px] font-mono mt-0.5 flex items-center justify-center gap-1.5">
                <span className="text-amber-400 font-semibold">{hoveredDock.app.tag}</span>
                <span className="text-slate-600">·</span>
                <span
                  className={
                    hoveredDock.accessLevel === 'ban'
                      ? 'text-red-400 font-semibold'
                      : hoveredDock.accessLevel === 'view'
                      ? 'text-cyan-400 font-semibold'
                      : 'text-emerald-400 font-semibold'
                  }
                >
                  {hoveredDock.accessLevel === 'ban'
                    ? 'Banned'
                    : hoveredDock.accessLevel === 'view'
                    ? 'View Only'
                    : 'Edit'}
                </span>
              </div>
            </div>
            <div className="w-2 h-2 bg-[#0A1623] border-r border-b border-slate-700 rotate-45 mx-auto -mt-1" />
          </div>
        )}

        <div className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl px-3 py-1 flex items-center gap-2 shadow-2xl text-xs font-mono text-slate-300 shrink-0">
          <Monitor className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || '19:53'}</span>
        </div>
      </footer>

      {/* Grid Launcher Modal Overlay */}
      {gridOverlayOpen && (
        <div className="fixed inset-0 bg-[#0B1F33]/95 backdrop-blur-xl z-50 flex flex-col p-6 sm:p-10 animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 max-w-6xl w-full mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white font-sans">Engineering App Launcher Index</h2>
                <p className="text-xs text-slate-400 font-mono">Select a child application to launch inside the shell</p>
              </div>
            </div>

            <button
              onClick={() => setGridOverlayOpen(false)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-6xl w-full mx-auto my-6 flex-1 overflow-y-auto space-y-6">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tools by title, category, description..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredApps.map(app => {
                const IconComponent = ICON_MAP[app.icon] || CheckCircle2;
                const accessLevel = resolveEffectiveAppAccess(user, role, app);
                const hasPermission = accessLevel !== 'ban';

                return (
                  <button
                    key={app.id}
                    onClick={() => {
                      setGridOverlayOpen(false);
                      handleAppLaunch(app);
                    }}
                    className={`text-left p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/60 transition-all flex flex-col justify-between group ${
                      !hasPermission ? 'opacity-55 grayscale-[40%]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl text-white ${app.color || 'bg-slate-700'}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-xs text-amber-400 font-bold">{app.tag}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                        {app.label}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {app.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-mono text-slate-400">
                      <span>{app.category}</span>
                      <span
                        className={`font-bold ${
                          accessLevel === 'ban'
                            ? 'text-red-400'
                            : accessLevel === 'view'
                            ? 'text-cyan-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {accessLevel === 'ban' ? 'BANNED' : accessLevel === 'view' ? 'VIEW' : 'EDIT'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Sign In Popup Modal */}
      {!isHomePage && (
        <SignInModal
          isOpen={signInModalOpen}
          onClose={() => setSignInModalOpen(false)}
        />
      )}

    </div>
  );
};

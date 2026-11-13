import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  X,
  UserCheck,
  LogOut,
  ChevronDown,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { APPS_CONFIG } from '../config/apps';
import { AppAccessLevel, AppConfig, UserRole } from '../types';
import { BackgroundSlideshow } from '../components/BackgroundSlideshow';
import { SignInModal } from '../components/SignInModal';
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
};

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, role, caps, signOut, isDemoMode, setDemoRole } = useAuth();
  const { projects, selectedProject, setProject } = useProject();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState<boolean>(false);
  const [gridOverlayOpen, setGridOverlayOpen] = useState<boolean>(false);
  const [signInModalOpen, setSignInModalOpen] = useState<boolean>(false);
  const [userMenuOpen, setUserMenuOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredDock, setHoveredDock] = useState<{
    app: AppConfig;
    accessLevel: AppAccessLevel;
    left: number;
    top: number;
  } | null>(null);

  // States to toggle card visibility / minimize so user can view full wallpaper
  const [bulletinCollapsed, setBulletinCollapsed] = useState<boolean>(false);
  const [milestonesCollapsed, setMilestonesCollapsed] = useState<boolean>(false);

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

  // Time-based greeting generator
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Formatted date: "WEDNESDAY, 11 NOVEMBER 2026"
  const getFormattedDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).toUpperCase();
  };

  const handleAppLaunch = (app: AppConfig) => {
    const accessLevel = resolveEffectiveAppAccess(user, role, app);
    if (accessLevel === 'ban') {
      if (!user) {
        setSignInModalOpen(true);
        return;
      }
      navigate(`/apps/${app.id}`); // AppPage renders ForbiddenPage with Ban notice
      return;
    }
    navigate(`/apps/${app.id}`);
  };

  const filteredApps = APPS_CONFIG.filter(
    app =>
      app.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="relative min-h-screen w-full bg-[#0B1F33] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-10 font-sans overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-300">
      
      {/* 10-Second Auto-Rotating Background Slideshow */}
      <BackgroundSlideshow intervalMs={10000} opacityClass="opacity-90" />

      {/* Top Bar Header Area - Scaled Up for Legibility */}
      <header className="relative z-20 flex items-center justify-between gap-4 w-full">
        
        {/* Top Left Widget: Piping Design Hub */}
        <div className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3.5 shadow-2xl">
          <button
            onClick={() => setGridOverlayOpen(true)}
            title="Open App Launcher Grid"
            className="w-10 h-10 rounded-full bg-[#F59E0B] text-slate-950 flex items-center justify-center font-bold shadow-md hover:bg-amber-400 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div className="flex flex-col pr-1">
            <span className="text-base font-bold text-white font-sans leading-tight">Piping Design Hub</span>
            <span className="text-xs text-slate-300 font-sans leading-none mt-0.5">Engineering Portal</span>
          </div>
        </div>

        {/* Top Center: Greeting & Date - Scaled Display Headline */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-4xl sm:text-6xl font-light text-white font-sans tracking-wide drop-shadow-lg">
            {getGreeting()}
          </h1>
          <div className="text-xs sm:text-sm font-mono text-slate-200 tracking-widest uppercase mt-1.5 drop-shadow-sm font-semibold">
            {getFormattedDate()}
          </div>
        </div>

        {/* Top Right: Project Selector Widget */}
        <div className="relative">
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-full px-5 py-2.5 flex items-center gap-3 text-xs sm:text-sm font-mono shadow-2xl hover:border-amber-500/50 transition-all cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-bold text-base text-[#22D3EE] font-mono">{selectedProject.code}</span>
            <span className="text-slate-500 font-mono">|</span>
            <span className="text-slate-100 font-sans font-medium text-xs sm:text-sm hidden sm:inline">{selectedProject.name}</span>
          </button>

          {/* Project Selector Dropdown Modal */}
          {projectDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[#0E1D2D] border border-slate-700/80 rounded-2xl shadow-2xl p-3 z-50 backdrop-blur-xl">
              <div className="px-2 py-1.5 border-b border-slate-800 text-xs font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Select Active Ship Project
              </div>
              <div className="mt-2 space-y-1">
                {projects.map(proj => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      setProject(proj.id);
                      setProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between text-xs sm:text-sm font-sans ${
                      selectedProject.id === proj.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'hover:bg-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-amber-400 font-bold text-sm">{proj.code}</div>
                      <div className="text-slate-200 text-xs font-medium truncate max-w-[200px]">{proj.name}</div>
                    </div>
                    <span className="text-xs font-mono text-slate-300 bg-slate-800 px-2.5 py-1 rounded-md font-semibold">
                      {proj.progressPercentage}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Viewport: Cards Scaled Up & Pushed to Far Edges */}
      <div className="relative z-10 my-auto py-6 px-2 sm:px-6 lg:px-10 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 w-full">
        
        {/* Left Card: Department bulletin (Scaled Up & Edge Pinned) */}
        <div className={`transition-all duration-300 ${bulletinCollapsed ? 'w-auto' : 'w-full max-w-[420px]'}`}>
          {bulletinCollapsed ? (
            <button
              onClick={() => setBulletinCollapsed(false)}
              className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3 text-sm text-white shadow-2xl hover:bg-slate-800 transition-colors"
              title="Expand Department Bulletin"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
              <span className="font-bold font-sans">Bulletin</span>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </button>
          ) : (
            <div className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-5 rounded-full bg-[#22D3EE] shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-white font-sans">Department bulletin</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-300 bg-slate-800/90 px-3 py-1 rounded-full font-medium">
                    4 posts
                  </span>
                  <button
                    onClick={() => setBulletinCollapsed(true)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Minimize Bulletin"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-[440px] overflow-y-auto no-scrollbar pr-1">
                {/* Post 1 */}
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F59E0B] tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    <span>PINNED</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                    Isometric Issue freeze, Friday 17:00
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    All Block 3 piping isometrics must be checked and uploaded before the freeze.
                  </p>
                </div>

                {/* Post 2 */}
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#22D3EE] tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                    <span>UPDATE</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                    MTO template v2.1 is live
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    New columns for coating spec and insulation class.
                  </p>
                </div>

                {/* Post 3 */}
                <div className="space-y-1.5 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#22D3EE] tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                    <span>YARD</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                    Outfitting walkdown, Thursday 09:00
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    Meet at the design office lobby. Bring PPE and the latest Line List.
                  </p>
                </div>

                {/* Post 4 */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#A855F7] tracking-wider uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#A855F7]" />
                    <span>REMINDER</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                    Revision control
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed">
                    Update drawing revisions before every transmittal.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center Space: Unobstructed View of the Ship */}
        <div className="hidden lg:block flex-1 pointer-events-none" />

        {/* Right Card: Milestones (Scaled Up & Edge Pinned) */}
        <div className={`transition-all duration-300 self-center lg:self-start ${milestonesCollapsed ? 'w-auto' : 'w-full max-w-[380px]'}`}>
          {milestonesCollapsed ? (
            <button
              onClick={() => setMilestonesCollapsed(false)}
              className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-3 text-sm text-white shadow-2xl hover:bg-slate-800 transition-colors"
              title="Expand Milestones"
            >
              <ChevronLeft className="w-5 h-5 text-slate-400" />
              <span className="font-bold font-sans">Milestones</span>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </button>
          ) : (
            <div className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-5 rounded-full bg-[#22D3EE] shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold text-white font-sans">Milestones</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-slate-300 font-bold">{selectedProject.code}</span>
                  <button
                    onClick={() => setMilestonesCollapsed(true)}
                    className="text-slate-400 hover:text-white transition-colors p-1"
                    title="Minimize Milestones"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                {/* Item 1 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-sans">
                    <span className="text-slate-100 font-medium">Block 3 isometrics</span>
                    <span className="font-mono font-bold text-[#22D3EE] text-sm sm:text-base">72%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#22D3EE] rounded-full w-[72%]" />
                  </div>
                </div>

                {/* Item 2 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-sans">
                    <span className="text-slate-100 font-medium">Line List rev C</span>
                    <span className="font-mono font-bold text-[#10B981] text-sm sm:text-base">96%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#10B981] rounded-full w-[96%]" />
                  </div>
                </div>

                {/* Item 3 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-sans">
                    <span className="text-slate-100 font-medium">Hydro test packs</span>
                    <span className="font-mono font-bold text-[#22D3EE] text-sm sm:text-base">41%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#22D3EE] rounded-full w-[41%]" />
                  </div>
                </div>

                {/* Item 4 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm font-sans">
                    <span className="text-slate-100 font-medium">Support schedule</span>
                    <span className="font-mono font-bold text-[#22D3EE] text-sm sm:text-base">58%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#22D3EE] rounded-full w-[58%]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Floating Navigation Dock - Scaled Up Icons */}
      <footer className="relative z-20 w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
        
        {/* Far Left: Yellow Grid Overlay Button */}
        <button
          onClick={() => setGridOverlayOpen(true)}
          title="Open Application Grid"
          className="w-13 h-13 rounded-2xl bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl flex items-center justify-center text-[#F59E0B] shadow-2xl hover:bg-slate-800 hover:scale-105 transition-all cursor-pointer shrink-0"
        >
          <LayoutGrid className="w-6 h-6 fill-current" />
        </button>

        {/* Center Dock: Scaled Up Vibrant App Launchers */}
        <div
          onMouseLeave={() => setHoveredDock(null)}
          className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl p-2.5 flex items-center justify-center gap-2.5 sm:gap-3 shadow-2xl overflow-x-auto no-scrollbar max-w-full"
        >
          {APPS_CONFIG.map(app => {
            const IconComponent = ICON_MAP[app.icon] || CheckCircle2;
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
                className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg hover:-translate-y-1 hover:scale-110 transition-all duration-200 cursor-pointer shrink-0 ${
                  app.color || 'bg-slate-700'
                } ${!hasPermission ? 'opacity-45 grayscale' : ''}`}
              >
                <IconComponent className="w-6 h-6 stroke-[2]" />
              </button>
            );
          })}
        </div>

        {/* Unclipped Floating Dock Tooltip */}
        {hoveredDock && (
          <div
            className="fixed z-[60] pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: hoveredDock.left, top: hoveredDock.top - 12 }}
          >
            <div className="bg-[#0A1623]/95 border border-slate-700 text-slate-100 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-xl whitespace-nowrap text-center">
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
            <div className="w-2.5 h-2.5 bg-[#0A1623] border-r border-b border-slate-700 rotate-45 mx-auto -mt-1.5" />
          </div>
        )}

        {/* Far Right: Clock & User Sign In/Out Widget */}
        <div className="bg-[#0E1D2D]/90 border border-slate-700/60 backdrop-blur-xl rounded-2xl px-4 py-2 flex items-center gap-4 shadow-2xl text-xs sm:text-sm font-mono text-slate-300 shrink-0 relative">
          <div className="flex items-center gap-2 text-slate-100 font-mono text-xs sm:text-sm font-bold">
            <Monitor className="w-4.5 h-4.5 text-slate-400" />
            <span>{currentTime || '19:53'}</span>
          </div>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold font-sans rounded-xl text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer border border-slate-700"
              >
                <span className="text-amber-400 font-mono text-xs uppercase font-bold">{role}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 bottom-14 w-72 bg-[#0E1D2D] border border-slate-700 rounded-2xl shadow-2xl p-3.5 z-50 backdrop-blur-xl">
                  <div className="pb-2.5 border-b border-slate-800 mb-2 font-sans">
                    <div className="font-bold text-sm text-white">{user.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{user.email}</div>
                    <div className="text-xs text-cyan-400 font-mono mt-0.5">{user.department}</div>
                  </div>

                  {isDemoMode && (
                    <div className="py-2 border-b border-slate-800 mb-2">
                      <div className="text-xs font-mono text-amber-400 font-bold mb-1.5">Switch Role:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {(['admin', 'lead', 'engineer', 'viewer'] as UserRole[]).map(r => (
                          <button
                            key={r}
                            onClick={() => {
                              setDemoRole(r);
                              setUserMenuOpen(false);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-left font-mono capitalize ${
                              role === r ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-sans"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSignInModalOpen(true)}
              className="px-4 py-2 bg-[#F59E0B] hover:bg-amber-400 text-slate-950 font-bold font-sans rounded-xl text-xs sm:text-sm transition-colors shadow-md cursor-pointer"
            >
              Sign in
            </button>
          )}
        </div>
      </footer>

      {/* Sign In Popup Modal */}
      <SignInModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
      />

      {/* Grid Launcher Modal Overlay when clicking grid icon */}
      {gridOverlayOpen && (
        <div className="fixed inset-0 bg-[#0B1F33]/95 backdrop-blur-xl z-50 flex flex-col p-6 sm:p-10 animate-fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 max-w-6xl w-full mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white font-sans">Engineering App Launcher Index</h2>
                <p className="text-xs sm:text-sm text-slate-400 font-mono">Select a child application to launch inside the shell</p>
              </div>
            </div>

            <button
              onClick={() => setGridOverlayOpen(false)}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="max-w-6xl w-full mx-auto my-6 flex-1 overflow-y-auto space-y-6">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tools by title, category, description..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
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
                    className={`text-left p-5.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-400/60 transition-all flex flex-col justify-between group ${
                      !hasPermission ? 'opacity-55 grayscale-[40%]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-3 rounded-xl text-white ${app.color || 'bg-slate-700'}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-xs text-amber-400 font-bold">{app.tag}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                        {app.label}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {app.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs sm:text-sm font-mono text-slate-400">
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

    </div>
  );
};

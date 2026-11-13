import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Loader2, Play, Terminal, Eye } from 'lucide-react';
import { AppAccessLevel, AppConfig, ShellPostMessageContext, AppPostMessageNotification } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { useNotifications } from '../hooks/useNotifications';
import { APPS_CONFIG } from '../config/apps';
import { DrawingReviewWorkspace } from './DrawingReviewWorkspace';
import { TeamManagementWorkspace } from './TeamManagementWorkspace';
import { TrainingApp } from '../apps/training';

interface EmbeddedAppProps {
  app: AppConfig;
  accessLevel?: AppAccessLevel;
}

export const EmbeddedApp: React.FC<EmbeddedAppProps> = ({ app, accessLevel = 'edit' }) => {
  const { session, user } = useAuth();
  const { selectedProject } = useProject();
  const { addNotification } = useNotifications();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);
  const [postMessageSent, setPostMessageSent] = useState<boolean>(false);
  const [lastMessageReceived, setLastMessageReceived] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [simulatedTab, setSimulatedTab] = useState<'iframe' | 'interactive_demo'>('iframe');

  // Compute exact origin from src URL
  const getTargetOrigin = useCallback((urlStr: string): string => {
    try {
      const url = new URL(urlStr);
      return url.origin;
    } catch {
      return '*';
    }
  }, []);

  const targetOrigin = getTargetOrigin(app.src);

  // Send context postMessage to iframe
  const sendShellContext = useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;

    const payload: ShellPostMessageContext = {
      type: 'SHELL_CONTEXT',
      accessToken: session?.access_token || 'demo_token_xyz',
      refreshToken: session?.refresh_token || 'demo_refresh_xyz',
      projectId: selectedProject.id,
      user,
      accessLevel,
    };

    // Requirement: Never use '*', send to exact targetOrigin (fallback to '*' only if relative)
    const originToUse = targetOrigin !== '*' ? targetOrigin : window.location.origin;
    
    try {
      iframeRef.current.contentWindow.postMessage(payload, originToUse);
      setPostMessageSent(true);
    } catch (err) {
      console.warn('postMessage to iframe failed:', err);
    }
  }, [session, selectedProject, user, targetOrigin, accessLevel]);

  // Re-send context whenever Project or accessLevel changes
  useEffect(() => {
    if (!isLoading && !hasError) {
      sendShellContext();
    }
  }, [selectedProject, accessLevel, isLoading, hasError, sendShellContext]);

  // Handle iframe onLoad event
  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
    sendShellContext();
  };

  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Setup postMessage event listener from child apps
  useEffect(() => {
    // List of allowed origins derived from apps.ts
    const allowedOrigins = APPS_CONFIG.map(a => {
      try {
        return new URL(a.src).origin;
      } catch {
        return null;
      }
    }).filter((origin): origin is string => origin !== null);

    const handleWindowMessage = (event: MessageEvent) => {
      // Validate origin if not in local dev/demo
      if (allowedOrigins.length > 0 && !allowedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
        return;
      }

      const data = event.data as AppPostMessageNotification;
      if (data && data.type === 'NOTIFY' && data.title && data.body) {
        setLastMessageReceived(`Received NOTIFY: "${data.title}" at ${new Date().toLocaleTimeString()}`);
        addNotification(data.title, data.body, data.category || 'system', app.id);
      }
    };

    window.addEventListener('message', handleWindowMessage);
    return () => window.removeEventListener('message', handleWindowMessage);
  }, [app.id, addNotification]);

  const handleRefresh = () => {
    setIsLoading(true);
    setHasError(false);
    setPostMessageSent(false);
    setIframeKey(prev => prev + 1);
  };

  const handleOpenNewTab = () => {
    window.open(app.src, '_blank', 'noopener,noreferrer');
  };

  // Helper for simulating postMessage event from child app
  const simulateChildAppNotification = () => {
    const title = `${app.label}: Status Updated`;
    const body = `Action performed inside ${app.label} for project ${selectedProject.code}.`;
    addNotification(title, body, 'drawing', app.id);
    setLastMessageReceived(`Simulated NOTIFY: "${title}" at ${new Date().toLocaleTimeString()}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full bg-slate-950 overflow-hidden">
      {/* Loading Bar Indicator (only for iframe apps) */}
      {isLoading && app.id !== 'drawing-review' && app.id !== 'team-settings' && app.id !== 'training-app' && (
        <div className="w-full h-1 bg-slate-800 overflow-hidden relative shrink-0">
          <div className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-amber-500 animate-pulse w-full" />
        </div>
      )}

      {/* View-Only Access Notice */}
      {accessLevel === 'view' && app.id !== 'training-app' && (
        <div className="bg-cyan-950/90 border-b border-cyan-500/30 px-4 py-1.5 flex items-center justify-center gap-2 text-xs font-mono text-cyan-200 shrink-0">
          <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>View-Only Mode · Editing, creating, and deleting actions are restricted for your account.</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex flex-col">
        {app.id === 'drawing-review' ? (
          <DrawingReviewWorkspace readOnly={accessLevel === 'view'} />
        ) : app.id === 'team-settings' ? (
          <TeamManagementWorkspace readOnly={accessLevel === 'view'} />
        ) : app.id === 'training-app' ? (
          <TrainingApp accessLevel={accessLevel} />
        ) : (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={app.src.startsWith('http://') || app.src.startsWith('https://') ? app.src : (app.src.startsWith('/') ? '.' + app.src : app.src)}
            title={app.label}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          />
        )}

        {/* Error Fallback Banner overlay if needed */}
        {hasError && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl drawing-corner-box">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-2">Child Application Host Status</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                The target URL <code className="text-cyan-400 font-mono text-[11px]">{app.src}</code> could not be loaded directly.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleOpenNewTab}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs shadow-lg transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in New Tab</span>
                </button>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span>Retry Reload</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* Interactive Simulated Piping Application Component */
interface SimulatedPipingAppProps {
  app: AppConfig;
  project: any;
  user: any;
  onSimulateNotify: () => void;
}

const SimulatedPipingApp: React.FC<SimulatedPipingAppProps> = ({ app, project, user, onSimulateNotify }) => {
  const [activeTab, setActiveTab] = useState<'drawings' | 'lines' | 'mto' | 'context'>('drawings');
  const [selectedDrawing, setSelectedDrawing] = useState<string>('ISO-PP-0123 Rev B');

  return (
    <div className="w-full h-full bg-[#0F1F30] text-slate-100 flex flex-col p-6 overflow-y-auto">
      {/* Simulation Header Banner */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-5 mb-6 shadow-xl relative drawing-corner-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                Interactive Standalone App Sandbox
              </span>
              <span className="text-xs font-mono text-slate-400">Target Origin: {app.src}</span>
            </div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{app.label}</span>
              <span className="text-xs font-mono text-amber-400 font-normal">[{app.tag}]</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">{app.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onSimulateNotify}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Emit postMessage('NOTIFY')</span>
            </button>
          </div>
        </div>
      </div>

      {/* Context Verification Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Active Project</span>
          <span className="text-sm font-bold text-amber-400 font-mono block">{project.code}</span>
          <span className="text-xs text-slate-400 block truncate">{project.name}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Logged In User</span>
          <span className="text-sm font-bold text-slate-100 block truncate">{user?.name || 'Engineer'}</span>
          <span className="text-xs text-slate-400 block truncate">{user?.email || 'N/A'}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Role / Department</span>
          <span className="text-sm font-bold text-cyan-400 uppercase font-mono block">{user?.role || 'ENGINEER'}</span>
          <span className="text-xs text-slate-400 block truncate">{user?.department || 'Piping Dept.'}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Vessel Progress</span>
          <span className="text-sm font-bold text-emerald-400 font-mono block">{project.progressPercentage}% Completed</span>
          <span className="text-xs text-slate-400 block truncate">{project.vesselType}</span>
        </div>
      </div>

      {/* Functional Interactive Module Preview */}
      <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col min-h-[350px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              ENGINEERING MODULE DATA CANVAS · [{project.code}]
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">Live PostMessage Shell Synced</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Mock Pipe Lines & Drawings Table */}
          <div className="lg:col-span-2 bg-slate-950/80 rounded-lg border border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 font-mono">Drawing Index & Piping Isometric Specs</span>
              <span className="text-[11px] text-cyan-400 font-mono">4 Lines Loaded</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-slate-900 text-slate-400 font-mono uppercase text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Drawing No.</th>
                    <th className="py-2 px-3">Line Tag</th>
                    <th className="py-2 px-3">Fluid Service</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  <tr className="hover:bg-slate-900/50 cursor-pointer" onClick={() => setSelectedDrawing('ISO-PP-0123 Rev B')}>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">ISO-PP-0123 Rev B</td>
                    <td className="py-2.5 px-3">2"-CW-1501-A1B</td>
                    <td className="py-2.5 px-3 text-slate-400">Cooling Water</td>
                    <td className="py-2.5 px-3"><span className="text-emerald-400">APPROVED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-900/50 cursor-pointer" onClick={() => setSelectedDrawing('PID-ENG-402 Rev A')}>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">PID-ENG-402 Rev A</td>
                    <td className="py-2.5 px-3">4"-FO-8802-B2A</td>
                    <td className="py-2.5 px-3 text-slate-400">Fuel Oil Service</td>
                    <td className="py-2.5 px-3"><span className="text-amber-400">IN REVIEW</span></td>
                  </tr>
                  <tr className="hover:bg-slate-900/50 cursor-pointer" onClick={() => setSelectedDrawing('MTO-VALVE-009 Rev C')}>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">MTO-VALVE-009 Rev C</td>
                    <td className="py-2.5 px-3">10"-CRY-901-S3</td>
                    <td className="py-2.5 px-3 text-slate-400">Cryogenic Cargo</td>
                    <td className="py-2.5 px-3"><span className="text-emerald-400">APPROVED</span></td>
                  </tr>
                  <tr className="hover:bg-slate-900/50 cursor-pointer" onClick={() => setSelectedDrawing('LINE-SKID-881 Rev A')}>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">LINE-SKID-881 Rev A</td>
                    <td className="py-2.5 px-3">6"-SW-2201-C1A</td>
                    <td className="py-2.5 px-3 text-slate-400">Sea Water Ballast</td>
                    <td className="py-2.5 px-3"><span className="text-cyan-400">SCHEDULED</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Isometric Drawing SVG Preview Panel */}
          <div className="bg-slate-950/80 rounded-lg border border-slate-800 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300 font-mono">2D Piping Isometric Canvas</span>
                <span className="text-[10px] text-amber-400 font-mono">{selectedDrawing}</span>
              </div>
              <div className="w-full h-44 bg-slate-900 rounded border border-slate-800 p-2 flex items-center justify-center relative overflow-hidden">
                <svg className="w-full h-full text-cyan-400 stroke-current fill-none" viewBox="0 0 300 150">
                  <path d="M 30 120 L 100 120 L 100 50 L 220 50 L 220 100 L 270 100" strokeWidth="3" className="animate-pipe-flow" />
                  <circle cx="100" cy="120" r="4" fill="#F59E0B" />
                  <circle cx="100" cy="50" r="4" fill="#F59E0B" />
                  <circle cx="220" cy="50" r="4" fill="#F59E0B" />
                  <rect x="150" y="42" width="16" height="16" rx="2" fill="#0B1F33" stroke="#22D3EE" strokeWidth="2" />
                  <text x="140" y="32" fill="#94A3B8" fontSize="9" fontFamily="monospace">VALVE V-102</text>
                  <text x="35" y="140" fill="#64748B" fontSize="8" fontFamily="monospace">FRAME 42 (P)</text>
                  <text x="225" y="115" fill="#64748B" fontSize="8" fontFamily="monospace">PUMP SUCTION</text>
                </svg>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>Class Approval: DNV-GL</span>
              <span className="text-emerald-400 font-semibold">VERIFIED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

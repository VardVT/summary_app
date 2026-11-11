import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, KeyRound } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Capability } from '../types';

interface ForbiddenPageProps {
  requiredCap?: Capability;
}

export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({ requiredCap }) => {
  const navigate = useNavigate();
  const { role, isDemoMode, setDemoRole } = useAuth();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900/90 dark:bg-slate-900/90 light:bg-white/90 border border-red-500/30 dark:border-red-500/30 light:border-red-200 rounded-xl p-8 shadow-2xl relative overflow-hidden drawing-corner-box">
        {/* Background SVG blueprint lines */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" width="100%" height="100%">
            <pattern id="forbiddenGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#forbiddenGrid)" />
          </svg>
        </div>

        {/* Icon Header */}
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6 text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="inline-block px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded text-[11px] font-mono text-red-400 tracking-wider uppercase mb-3">
          Error 403 · Access Denied
        </div>

        <h1 className="text-2xl font-bold text-slate-100 dark:text-slate-100 light:text-slate-900 mb-3">
          Insufficient Clearance Level
        </h1>

        <p className="text-sm text-slate-400 dark:text-slate-400 light:text-slate-600 mb-6 leading-relaxed">
          Your current account role <strong className="text-amber-400 font-mono">[{role.toUpperCase()}]</strong> does not possess the required engineering capability{' '}
          {requiredCap && <span className="font-mono text-cyan-400">"{requiredCap}"</span>} to access this application or module.
        </p>

        {isDemoMode && (
          <div className="mb-6 p-4 bg-slate-800/80 dark:bg-slate-800/80 light:bg-slate-100 border border-amber-500/30 rounded-lg text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-2">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>Demo Mode Privilege Switcher</span>
            </div>
            <p className="text-xs text-slate-400 mb-3">Switch role to preview elevated access privileges:</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDemoRole('admin')}
                className="px-2.5 py-1.5 text-xs font-mono font-medium rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
              >
                Switch to Admin
              </button>
              <button
                onClick={() => setDemoRole('lead')}
                className="px-2.5 py-1.5 text-xs font-mono font-medium rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-colors"
              >
                Switch to Lead
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium text-slate-900 bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Launcher</span>
          </button>
        </div>
      </div>
    </div>
  );
};

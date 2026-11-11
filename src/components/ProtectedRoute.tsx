import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1F33] text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="relative flex flex-col items-center max-w-sm text-center p-8 bg-slate-900/80 border border-slate-800 rounded-xl shadow-2xl backdrop-blur-md drawing-corner-box">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4 text-amber-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <span className="font-mono text-xs tracking-widest text-cyan-400 uppercase mb-1">Authenticating Session</span>
          <h2 className="text-lg font-bold text-slate-100 mb-2">Naval Piping Ecosystem</h2>
          <p className="text-xs text-slate-400">Verifying security clearances and user privileges...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

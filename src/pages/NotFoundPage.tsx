import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, ArrowLeft, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-xl p-8 shadow-2xl relative overflow-hidden drawing-corner-box">
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <svg className="w-full h-full" width="100%" height="100%">
            <pattern id="404grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#404grid)" />
          </svg>
        </div>

        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 text-amber-400">
          <FileQuestion className="w-8 h-8" />
        </div>

        <div className="inline-block px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] font-mono text-amber-400 tracking-wider uppercase mb-3">
          Error 404 · Drawing / Route Not Found
        </div>

        <h1 className="text-2xl font-bold text-slate-100 mb-3 font-sans">
          Module Unreachable
        </h1>

        <p className="text-sm text-slate-400 mb-6 leading-relaxed">
          The application route or isometric drawing path you requested does not exist in the central ecosystem registry.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-medium text-slate-950 bg-amber-500 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 font-sans font-bold"
          >
            <Home className="w-4 h-4" />
            <span>Return to App Launcher</span>
          </button>
        </div>
      </div>
    </div>
  );
};

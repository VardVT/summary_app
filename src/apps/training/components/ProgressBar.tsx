import React from 'react';

interface ProgressBarProps {
  percent: number;
  label?: string;
  sublabel?: string;
  accent?: 'cyan' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  label,
  sublabel,
  accent = 'cyan',
  size = 'md',
}) => {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  const fillClass =
    accent === 'emerald'
      ? 'bg-emerald-500'
      : accent === 'amber'
      ? 'bg-amber-500'
      : 'bg-cyan-400';

  const textClass =
    accent === 'emerald'
      ? 'text-emerald-400'
      : accent === 'amber'
      ? 'text-amber-400'
      : 'text-cyan-400';

  return (
    <div className="space-y-1.5 w-full">
      {(label || sublabel) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-slate-300 font-medium truncate">{label}</span>
          <div className="flex items-center gap-2 shrink-0">
            {sublabel && <span className="text-slate-400 font-mono">{sublabel}</span>}
            <span className={`font-mono font-bold tabular-nums ${textClass}`}>{clamped}%</span>
          </div>
        </div>
      )}
      <div
        className={`w-full bg-slate-800/90 rounded-full overflow-hidden ${
          size === 'sm' ? 'h-1.5' : 'h-2.5'
        }`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${fillClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

import { MemoryStick, Database, Activity, HardDrive, AlertCircle, Info } from 'lucide-react';

const deviceMessages = {
  no_device: ['No Device Detected', 'Connect your J7 Max via USB with USB Debugging enabled'],
  unauthorized: ['Device Unauthorized', 'Accept the RSA fingerprint prompt on your phone'],
  adb_not_found: ['ADB Not Found', 'Install Android platform tools or set ADB_PATH env var'],
};

function formatKb(kb) {
  if (!kb || kb === 0) return '—';
  if (kb >= 1048576) return (kb / 1048576).toFixed(1) + ' GB';
  if (kb >= 1024) return (kb / 1024).toFixed(1) + ' MB';
  return kb + ' KB';
}

function memPercentColor(pct) {
  if (pct < 50) return 'text-emerald-400';
  if (pct < 75) return 'text-cyan-400';
  if (pct < 90) return 'text-amber-400';
  return 'text-red-400';
}

function memBarColor(pct) {
  if (pct < 50) return 'bg-emerald-400';
  if (pct < 75) return 'bg-cyan-400';
  if (pct < 90) return 'bg-amber-400';
  return 'bg-red-400';
}

export default function MemoryAllocationsCard({ memory, deviceError }) {
  if (!memory || !memory.totalKb) {
    const msg = deviceMessages[deviceError];
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <AlertCircle size={36} className={deviceError ? 'text-amber-400' : 'animate-pulse text-slate-500'} />
          <span className="text-sm font-medium">{msg?.[0] || 'Awaiting memory data...'}</span>
          {msg?.[1] && <span className="text-xs text-slate-600">{msg[1]}</span>}
        </div>
      </div>
    );
  }

  const total = memory.totalKb;
  const used = memory.usedKb;
  const free = memory.freeKb;
  const available = memory.availableKb || free;
  const usedPct = total > 0 ? (used / total) * 100 : 0;
  const availPct = total > 0 ? (available / total) * 100 : 0;

  const RING_RADIUS = 72;
  const RING_CIRCUM = 2 * Math.PI * RING_RADIUS;
  const ringOffset = RING_CIRCUM - (RING_CIRCUM * availPct) / 100;

  return (
    <div className="glass p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="stat-label flex items-center gap-2">
          <MemoryStick size={14} className="text-cyan-400" />
          Memory Allocation
        </h2>
        <span className={`stat-value text-xs ${memPercentColor(usedPct)}`}>
          {usedPct.toFixed(1)}% Used
        </span>
      </div>

      <div className="flex items-center gap-8">
        <div className="relative shrink-0">
          <svg width="180" height="180" className="transform -rotate-90">
            <circle
              cx="90" cy="90" r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="12"
            />
            <circle
              cx="90" cy="90" r={RING_RADIUS}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUM}
              strokeDashoffset={ringOffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold text-slate-100">
              {formatKb(available)}
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">Available</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label flex items-center gap-1.5">
                <Activity size={10} className="text-red-400" />
                Used
              </span>
              <span className="text-xs font-mono text-red-400 font-medium">{formatKb(used)}</span>
            </div>
            <div className="h-2 glass rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${memBarColor(usedPct)}`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="stat-label flex items-center gap-1.5">
                <Activity size={10} className="text-cyan-400" />
                Available
              </span>
              <span className="text-xs font-mono text-cyan-400 font-medium">{formatKb(available)}</span>
            </div>
            <div className="h-2 glass rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                style={{ width: `${Math.min(availPct, 100)}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <HardDrive size={10} /> Truly Free
              </span>
              <span className="font-mono text-slate-400 font-medium">{formatKb(free)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Info size={10} /> Cached
              </span>
              <span className="font-mono text-slate-400 font-medium">{formatKb(memory.cachedKb)}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 flex items-center gap-1">
                <Database size={10} /> Total
              </span>
              <span className="font-mono text-slate-300 font-semibold">{formatKb(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

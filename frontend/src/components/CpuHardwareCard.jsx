import { Cpu, ShieldCheck, ShieldAlert, Gauge, Hash, AlertCircle } from 'lucide-react';

const deviceMessages = {
  no_device: ['No Device Detected', 'Connect your J7 Max via USB with USB Debugging enabled'],
  unauthorized: ['Device Unauthorized', 'Accept the RSA fingerprint prompt on your phone'],
  adb_not_found: ['ADB Not Found', 'Install Android platform tools or set ADB_PATH env var'],
};

function cpuLoadColor(pct) {
  if (pct < 30) return 'bg-emerald-400';
  if (pct < 60) return 'bg-cyan-400';
  if (pct < 80) return 'bg-amber-400';
  return 'bg-red-400';
}

function cpuTextColor(pct) {
  if (pct < 30) return 'text-emerald-400';
  if (pct < 60) return 'text-cyan-400';
  if (pct < 80) return 'text-amber-400';
  return 'text-red-400';
}

export default function CpuHardwareCard({ cpu, cpuInfo, governor, gpu, deviceError }) {
  if (!cpu) {
    const msg = deviceMessages[deviceError];
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <AlertCircle size={36} className={deviceError ? 'text-amber-400' : 'animate-pulse text-slate-500'} />
          <span className="text-sm font-medium">{msg?.[0] || 'Awaiting CPU data...'}</span>
          {msg?.[1] && <span className="text-xs text-slate-600">{msg[1]}</span>}
        </div>
      </div>
    );
  }

  const usage = cpu.usagePercent ?? 0;
  const restricted = governor?.restricted ?? false;
  const cores = cpuInfo?.cores || 0;
  const maxFreq = cpuInfo?.maxFreqMhz || 0;
  const freqLabel = maxFreq ? `${(maxFreq / 1000).toFixed(1)} GHz` : '';
  const cpuModel = cpuInfo?.governor || '';

  return (
    <div className="glass p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="stat-label flex items-center gap-2">
          <Cpu size={14} className="text-cyan-400" />
          CPU & Hardware{cores ? ` (${cores} Cores)` : ''}
        </h2>
        <span className={`badge-${restricted ? 'emerald' : 'amber'} text-[10px]`}>
          {restricted ? 'Capped' : 'Uncapped'}
        </span>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <span className="stat-label">Total CPU Load</span>
          <span className={`stat-value text-2xl ${cpuTextColor(usage)}`}>
            {usage.toFixed(1)}<span className="text-xs text-slate-500 ml-0.5">%</span>
          </span>
        </div>
        <div className="h-3 glass rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${cpuLoadColor(usage)}`}
            style={{ width: `${Math.min(usage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
          <span>Idle</span>
          <span>Max</span>
        </div>
      </div>

      <div className={`glass rounded-xl px-4 py-3.5 border ${restricted ? 'border-emerald-500/20' : 'border-amber-500/20'} mb-3`}>
        {restricted ? (
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">Hardware Protection Active</p>
              <p className="text-xs text-slate-400 mt-0.5">
                CPU Capped{freqLabel ? ` (${freqLabel} Max)` : ''}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                {freqLabel && <span className="flex items-center gap-1"><Gauge size={10} /> {freqLabel} Max</span>}
                {cores > 0 && <span className="flex items-center gap-1"><Hash size={10} /> {cores} Cores</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-400">CPU Performance Uncapped</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard Mode{freqLabel ? ` (${freqLabel} Max)` : ''}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                {freqLabel && <span className="flex items-center gap-1"><Gauge size={10} /> {freqLabel} Max</span>}
                {cores > 0 && <span className="flex items-center gap-1"><Hash size={10} /> {cores} Cores</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {gpu && (
        <div className="glass rounded-xl px-4 py-3 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="stat-label flex items-center gap-1.5">
              <Cpu size={10} className="text-cyan-400" />
              GPU
            </span>
            <span className="text-xs text-slate-500">{gpu.model || ''}</span>
          </div>
          {gpu.usagePercent != null ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 glass rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                  style={{ width: `${Math.min(gpu.usagePercent, 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs font-semibold text-cyan-400 w-10 text-right">
                {gpu.usagePercent.toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">Usage data unavailable</div>
          )}
        </div>
      )}
    </div>
  );
}

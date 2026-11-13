import { Terminal, AlertTriangle, Cpu, AlertCircle } from 'lucide-react';

const deviceMessages = {
  no_device: ['No Device Detected', 'Connect your J7 Max via USB with USB Debugging enabled'],
  unauthorized: ['Device Unauthorized', 'Accept the RSA fingerprint prompt on your phone'],
  adb_not_found: ['ADB Not Found', 'Install Android platform tools or set ADB_PATH env var'],
};

function cpuColor(pct) {
  if (pct < 5) return 'text-emerald-400';
  if (pct < 15) return 'text-cyan-400';
  if (pct < 30) return 'text-amber-400';
  return 'text-red-400';
}

function cpuBarColor(pct) {
  if (pct < 5) return 'bg-emerald-400';
  if (pct < 15) return 'bg-cyan-400';
  if (pct < 30) return 'bg-amber-400';
  return 'bg-red-400';
}

function isRogue(pct) {
  return pct >= 20;
}

export default function ProcessTable({ processes, deviceError }) {
  if (!processes || processes.length === 0) {
    const msg = deviceMessages[deviceError];
    return (
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="stat-label flex items-center gap-2">
            <Terminal size={14} className="text-cyan-400" />
            Active Processes
          </h2>
          <span className="text-[10px] text-slate-500">Top 8 Tasks</span>
        </div>
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-center max-w-xs mx-auto">
          <AlertCircle size={32} className={deviceError ? 'text-amber-400 mb-2' : 'animate-pulse text-slate-500 mb-2'} />
          <span className="text-sm font-medium">{msg?.[0] || 'Awaiting process data...'}</span>
          {msg?.[1] && <span className="text-xs text-slate-600 mt-1">{msg[1]}</span>}
        </div>
      </div>
    );
  }

  const maxCpu = Math.max(...processes.map(p => p.cpu), 1);

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="stat-label flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          Active Processes
        </h2>
        <span className="text-[10px] text-slate-500">
          {processes.length} Tasks · Top by CPU
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="text-left py-2.5 pr-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">PID</th>
              <th className="text-left py-2.5 px-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Process Name</th>
              <th className="text-right py-2.5 pl-4 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CPU %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {processes.map((proc) => (
              <tr key={proc.pid} className="group hover:bg-white/[0.02] transition-colors">
                <td className="py-3 pr-4">
                  <span className="font-mono text-xs text-slate-400">{proc.pid}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {isRogue(proc.cpu) && (
                      <AlertTriangle size={12} className="text-red-400 shrink-0" title="High CPU usage" />
                    )}
                    <span className="font-mono text-xs text-slate-200 truncate max-w-[200px]">
                      {proc.name}
                    </span>
                  </div>
                </td>
                <td className="py-3 pl-4">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-1.5 glass rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${cpuBarColor(proc.cpu)}`}
                        style={{ width: `${Math.min((proc.cpu / maxCpu) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`font-mono text-xs font-semibold w-10 text-right ${cpuColor(proc.cpu)}`}>
                      {proc.cpu.toFixed(1)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

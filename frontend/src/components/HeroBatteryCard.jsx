import { Battery, Zap, Thermometer, Clock, ShieldCheck, AlertCircle, Heart } from 'lucide-react';

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const deviceMessages = {
  no_device: ['No Device Detected', 'Connect your J7 Max via USB with USB Debugging enabled'],
  unauthorized: ['Device Unauthorized', 'Accept the RSA fingerprint prompt on your phone'],
  adb_not_found: ['ADB Not Found', 'Install Android platform tools or set ADB_PATH env var'],
};

function tempColor(celsius) {
  if (celsius < 38) return 'text-emerald-400';
  if (celsius < 48) return 'text-amber-400';
  return 'text-red-400';
}

function tempGlow(celsius) {
  if (celsius < 38) return 'glow-emerald';
  if (celsius < 48) return 'glow-amber';
  return 'shadow-[0_0_20px_rgba(248,113,113,0.15)]';
}

function voltageColor(mV) {
  if (mV >= 4000) return 'text-emerald-400';
  if (mV >= 3700) return 'text-cyan-400';
  return 'text-amber-400';
}

function cycleStatus(count) {
  if (count === null || count === undefined) return null;
  if (count < 300) return { label: 'Like New', color: 'text-emerald-400', icon: Heart };
  if (count < 800) return { label: 'Healthy', color: 'text-emerald-400', icon: ShieldCheck };
  if (count < 1500) return { label: 'Normal Wear', color: 'text-cyan-400', icon: ShieldCheck };
  if (count < 2500) return { label: 'Aged', color: 'text-amber-400', icon: ShieldCheck };
  return { label: 'Legendary Status', color: 'text-emerald-400', icon: ShieldCheck };
}

function formatCycleCount(count) {
  if (count === null || count === undefined) return null;
  return count.toLocaleString();
}

export default function HeroBatteryCard({ battery, batteryHealth, deviceError }) {
  if (!battery) {
    const msg = deviceMessages[deviceError];
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <AlertCircle size={36} className={deviceError ? 'text-amber-400' : 'animate-pulse text-slate-500'} />
          <span className="text-sm font-medium">{msg?.[0] || 'Awaiting battery data...'}</span>
          {msg?.[1] && <span className="text-xs text-slate-600">{msg[1]}</span>}
        </div>
      </div>
    );
  }

  const level = battery.level ?? 0;
  const voltage = battery.voltage ?? 0;
  const temp = battery.temperature ?? 0;
  const tech = battery.technology ?? 'Li-ion';
  const health = battery.health ?? 'Unknown';
  const status = battery.status ?? 'Unknown';

  const offset = CIRCUMFERENCE - (CIRCUMFERENCE * level) / 100;

  const gaugeColor = level > 20 ? '#22d3ee' : '#f87171';

  return (
    <div className="glass p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="stat-label flex items-center gap-2">
          <Battery size={14} className="text-cyan-400" />
          Battery Status
        </h2>
        <span className={`badge-${health === 'Good' ? 'emerald' : 'amber'} text-[10px]`}>
          {health}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative">
          <svg width="200" height="200" className="transform -rotate-90">
            <circle
              cx="100" cy="100" r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="10"
            />
            <circle
              cx="100" cy="100" r={RADIUS}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="transition-all duration-700 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${gaugeColor}40)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-mono font-bold text-slate-100 tracking-tight">
              {level}
            </span>
            <span className="text-sm font-medium text-slate-400">%</span>
          </div>
        </div>

        <div className="w-full mt-6 grid grid-cols-2 gap-4">
          <div className="glass px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={12} className={voltageColor(voltage)} />
              <span className="stat-label">Voltage</span>
            </div>
            <span className={`stat-value text-lg ${voltageColor(voltage)}`}>
              {(voltage / 1000).toFixed(3)}<span className="text-xs text-slate-500 ml-1">V</span>
            </span>
            <span className="block text-[10px] text-slate-500">
              {voltage} mV
            </span>
          </div>

          <div className="glass px-4 py-3 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer size={12} className={tempColor(temp)} />
              <span className="stat-label">Thermal</span>
            </div>
            <span className={`stat-value text-lg ${tempColor(temp)}`}>
              {temp.toFixed(1)}<span className="text-xs text-slate-500 ml-1">°C</span>
            </span>
            <span className="block text-[10px] text-slate-500">
              {temp < 38 ? 'Steady' : temp < 48 ? 'Elevated' : 'Critical'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/[0.06]">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={12} />
            <span className="stat-label">Technology</span>
            <span className="text-slate-300 font-mono">{tech}</span>
          </div>
          {(() => {
            const cycles = batteryHealth?.cycleCount;
            const status = cycleStatus(cycles);
            const formatted = formatCycleCount(cycles);
            if (status && formatted) {
              const StatusIcon = status.icon;
              return (
                <div className="flex items-center gap-2">
                  <StatusIcon size={12} className={status.color} />
                  <span className={`font-mono text-[10px] font-semibold ${status.color}/80`}>
                    {formatted} Cycles ({status.label})
                  </span>
                </div>
              );
            }
            if (batteryHealth) {
              return (
                <div className="flex items-center gap-2 text-slate-500">
                  <Heart size={12} />
                  <span className="font-mono text-[10px]">Cycles: Unknown</span>
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-5 pointer-events-none ${tempGlow(temp)}`}
        style={{ background: `radial-gradient(circle, ${gaugeColor}20, transparent)` }}
      />
    </div>
  );
}

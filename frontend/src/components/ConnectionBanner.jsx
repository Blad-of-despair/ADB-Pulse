import { Plug, PlugZap, RefreshCw, Smartphone, ShieldOff, ShieldAlert } from 'lucide-react';

const errorDetails = {
  adb_not_found: {
    title: 'ADB Not Found on System',
    message: 'Install Android platform-tools and ensure adb is in your PATH, or set ADB_PATH env var.',
    icon: ShieldOff,
  },
  unauthorized: {
    title: 'Device Unauthorized',
    message: 'Accept the RSA fingerprint prompt on your J7 Max screen to allow USB debugging.',
    icon: ShieldAlert,
  },
  no_device: {
    title: 'No USB Device Detected',
    message: 'Plug in your J7 Max via USB and ensure USB Debugging is enabled in Developer Options.',
    icon: PlugZap,
  },
};

export default function ConnectionBanner({ connected, adbConnected, deviceError, lastUpdate, deviceSerial }) {
  const wsAlive = connected;

  if (wsAlive && adbConnected) {
    return (
      <div className="flex items-center justify-between px-5 py-2.5 rounded-xl glass border border-emerald-500/10">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
          </span>
          <span className="text-xs font-medium text-emerald-400">USB Device Connected</span>
          {deviceSerial && (
            <span className="text-[10px] font-mono text-slate-500 ml-1">
              {deviceSerial.length > 12 ? deviceSerial.slice(0, 12) + '…' : deviceSerial}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[10px] text-slate-500 font-mono">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
          <Plug size={14} className="text-emerald-400/60" />
        </div>
      </div>
    );
  }

  if (wsAlive && !adbConnected && deviceError) {
    const detail = errorDetails[deviceError] || errorDetails.no_device;
    const Icon = detail.icon;
    return (
      <div className="flex items-center justify-between px-5 py-3 rounded-xl glass border border-amber-500/20 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
          </span>
          <div>
            <p className="text-sm font-semibold text-amber-400">{detail.title}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{detail.message}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Icon size={16} className="text-amber-400/60" />
          <RefreshCw size={16} className="text-amber-400/60 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 rounded-xl glass border border-red-500/20 bg-red-500/5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400" />
        </span>
        <div>
          <p className="text-sm font-semibold text-red-400">Backend Connection Lost</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ensure the relay server is running on port 3400. Start it with <span className="font-mono text-slate-400">cd backend && npm start</span>.
          </p>
        </div>
      </div>
      <RefreshCw size={16} className="text-red-400/60 animate-spin shrink-0" />
    </div>
  );
}

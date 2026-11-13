import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Smartphone,
  Monitor,
  Menu,
  X,
  Cpu,
  Battery,
  MemoryStick,
  Terminal,
  Activity,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import HeroBatteryCard from './components/HeroBatteryCard';
import CpuHardwareCard from './components/CpuHardwareCard';
import MemoryAllocationsCard from './components/MemoryAllocationsCard';
import ProcessTable from './components/ProcessTable';
import CpuFreqChart from './components/CpuFreqChart';
import AdbTerminal from './components/AdbTerminal';
import ConnectionBanner from './components/ConnectionBanner';

const WS_URL = `ws://${window.location.hostname}:3400`;
const API_BASE = `http://${window.location.hostname}:3400`;

export default function App() {
  const [stats, setStats] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [activeSerial, setActiveSerial] = useState(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const switchDevice = useCallback((serial) => {
    fetch(`${API_BASE}/api/select-device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serial }),
    }).catch(() => {});
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'devices') {
          setAvailableDevices(data.devices || []);
          if (data.activeSerial) setActiveSerial(data.activeSerial);
        } else if (data.type === 'device-selected') {
          setActiveSerial(data.serial);
        } else if (data.type === 'stats' || data.timestamp) {
          setStats(data);
          if (data.activeSerial) setActiveSerial(data.activeSerial);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();
    const onKey = (e) => {
      if (e.key === 'Escape') setTerminalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) wsRef.current.close();
      document.removeEventListener('keydown', onKey);
    };
  }, [connect]);

  return (
    <div className="min-h-screen flex">
      <div className="scanline" />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 glass border-r border-white/[0.06] 
          flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-16'}`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06] shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center">
            <Activity size={16} className="text-slate-950" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">
                {stats?.deviceInfo?.model ? stats.deviceInfo.model.split(' ').slice(0, 2).join(' ') : 'Device'}
              </h1>
              <p className="text-[9px] text-slate-500 font-medium">
                {stats?.deviceInfo?.manufacturer || 'System'} Monitor
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <div className={`${sidebarOpen ? '' : 'flex flex-col items-center'} space-y-0.5`}>
            <div className={`${sidebarOpen ? 'text-[10px] text-slate-600 font-semibold uppercase tracking-wider px-3 pb-1 pt-2' : 'sr-only'}`}>
              Devices
            </div>
            {availableDevices.length === 0 && (
              <div className={`sidebar-item w-full ${!sidebarOpen ? 'justify-center px-2' : ''} text-slate-600 cursor-default`}>
                <Smartphone size={18} />
                {sidebarOpen && <span className="text-xs">No device connected</span>}
              </div>
            )}
            {availableDevices.map((dev) => (
              <button
                key={dev.serial}
                onClick={() => switchDevice(dev.serial)}
                className={`sidebar-item w-full ${!sidebarOpen ? 'justify-center px-2' : ''} 
                  ${activeSerial === dev.serial ? 'active' : ''}`}
                title={!sidebarOpen ? dev.model || dev.serial : undefined}
              >
                {activeSerial === dev.serial
                  ? <CheckCircle2 size={16} className="text-cyan-400" />
                  : <Circle size={16} className="text-slate-500" />
                }
                {sidebarOpen && (
                  <span className="truncate text-xs">{dev.model || dev.serial.slice(0, 14)}</span>
                )}
              </button>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          {sidebarOpen && (
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 text-[10px] text-slate-500">
                <Smartphone size={12} />
                <span className="truncate">
                  {stats?.deviceInfo
                    ? `${stats.deviceInfo.model} · ${stats.deviceInfo.platform || stats.deviceInfo.manufacturer}`
                    : 'No device'}
                </span>
              </div>
              {stats?.deviceInfo?.androidVersion && (
                <div className="text-[9px] text-slate-600 pl-[22px]">
                  Android {stats.deviceInfo.androidVersion}
                </div>
              )}
              {stats?.cpuInfo?.cores && (
                <div className="text-[9px] text-slate-600 pl-[22px]">
                  {stats.cpuInfo.cores} Cores · {stats.cpuInfo.maxFreqMhz ? `${(stats.cpuInfo.maxFreqMhz / 1000).toFixed(1)} GHz` : ''}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 glass border-b border-white/[0.06] px-5 h-16 flex items-center justify-between backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/[0.06] rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="text-sm font-semibold text-slate-100 hidden sm:block">
              {stats?.deviceInfo?.model || 'System Monitor'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTerminalOpen(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors"
              title="Open ADB Terminal"
            >
              <Terminal size={16} />
            </button>
            <ConnectionBanner
              connected={connected}
              adbConnected={stats?.connected}
              deviceError={stats?.device?.error}
              lastUpdate={stats?.timestamp}
              deviceSerial={stats?.device?.serial}
            />
          </div>
        </header>

        <main className="p-5 lg:p-6 space-y-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HeroBatteryCard battery={stats?.battery} batteryHealth={stats?.batteryHealth} deviceError={stats?.device?.error} />
            <CpuHardwareCard cpu={stats?.cpu} cpuInfo={stats?.cpuInfo} governor={stats?.governor} gpu={stats?.gpu} deviceError={stats?.device?.error} />
          </div>

          <CpuFreqChart
            perCoreFrequencies={stats?.perCoreFrequencies}
            temperature={stats?.temperature}
            gpuFreqLevel={stats?.gpuFreqLevel}
            deviceError={stats?.device?.error}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MemoryAllocationsCard memory={stats?.memory} deviceError={stats?.device?.error} />
            <ProcessTable processes={stats?.processes} deviceError={stats?.device?.error} />
          </div>

        </main>
      </div>

      {terminalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setTerminalOpen(false); }}
        >
          <div className="w-full max-w-4xl mx-4 animate-in">
            <div className="relative">
              <button
                onClick={() => setTerminalOpen(false)}
                className="absolute -top-3 -right-3 z-10 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-100 border border-white/[0.06] transition-colors"
              >
                <X size={16} />
              </button>
              <AdbTerminal deviceError={stats?.device?.error} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

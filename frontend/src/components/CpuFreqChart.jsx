import { useState, useEffect, useRef } from 'react';
import { Thermometer, Cpu, Gauge, AlertCircle } from 'lucide-react';

const deviceMessages = {
  no_device: ['No Device Detected', 'Connect your J7 Max via USB with USB Debugging enabled'],
  unauthorized: ['Device Unauthorized', 'Accept the RSA fingerprint prompt on your phone'],
  adb_not_found: ['ADB Not Found', 'Install Android platform tools or set ADB_PATH env var'],
};

const MAX_SAMPLES = 60;
const CHART_HEIGHT = 220;
const PAD = { top: 20, right: 52, bottom: 28, left: 48 };
const CORE_COLORS = [
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#4ade80',
  '#f87171',
];

export default function CpuFreqChart({ perCoreFrequencies, temperature, gpuFreqLevel, deviceError }) {
  const [history, setHistory] = useState([]);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!perCoreFrequencies) return;
    setHistory((prev) => {
      const next = [...prev, {
        timestamp: Date.now(),
        cores: perCoreFrequencies.map((c) => c.freqMhz),
        temp: temperature?.celsius ?? null,
        gpuLvl: gpuFreqLevel ?? null,
      }];
      if (next.length > MAX_SAMPLES) return next.slice(next.length - MAX_SAMPLES);
      return next;
    });
  }, [perCoreFrequencies, temperature, gpuFreqLevel]);

  if (!perCoreFrequencies || perCoreFrequencies.length === 0) {
    const isError = deviceError && deviceMessages[deviceError];
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <AlertCircle size={36} className={isError ? 'text-amber-400' : 'animate-pulse text-slate-500'} />
          <span className="text-sm font-medium">{isError ? deviceMessages[deviceError][0] : 'Awaiting CPU frequency data...'}</span>
          {isError && <span className="text-xs text-slate-600">{deviceMessages[deviceError][1]}</span>}
        </div>
      </div>
    );
  }

  const activeCores = perCoreFrequencies.filter((c) => c.freqMhz != null);
  if (activeCores.length === 0) {
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <Cpu size={36} className="text-slate-500" />
          <span className="text-sm font-medium">Per-core frequency data unavailable</span>
          <span className="text-xs text-slate-600">Device may not expose scaling_cur_freq</span>
        </div>
      </div>
    );
  }

  const cw = width - PAD.left - PAD.right;
  const ch = CHART_HEIGHT - PAD.top - PAD.bottom;

  let yMax = 0;
  let yMin = Infinity;
  for (const c of activeCores) {
    if (c.freqMhz > yMax) yMax = c.freqMhz;
    if (c.freqMhz < yMin) yMin = c.freqMhz;
  }
  for (const entry of history) {
    for (const freq of entry.cores) {
      if (freq != null) {
        if (freq > yMax) yMax = freq;
        if (freq < yMin) yMin = freq;
      }
    }
  }
  if (yMax === 0) yMax = 2000;
  if (yMin === Infinity) yMin = 0;
  const yRange = yMax - yMin || 1;
  const yPad = yRange * 0.1;
  const yLow = Math.max(0, yMin - yPad);
  const yHigh = yMax + yPad;

  const toX = (i) => PAD.left + (i / (MAX_SAMPLES - 1)) * cw;
  const toY = (v) => PAD.top + ch - ((v - yLow) / (yHigh - yLow)) * ch;

  const gridLines = 5;
  const gridValues = [];
  for (let i = 0; i <= gridLines; i++) {
    gridValues.push(yLow + (yHigh - yLow) * (i / gridLines));
  }

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="stat-label flex items-center gap-2">
          <Cpu size={14} className="text-cyan-400" />
          Per-Core Frequencies
        </h2>
        <div className="flex items-center gap-3">
          {temperature?.celsius != null && (
            <span className="badge-cyan text-[10px]">
              <Thermometer size={10} />
              {temperature.celsius.toFixed(1)}°C
            </span>
          )}
          {gpuFreqLevel != null && (
            <span className={`text-[10px] ${gpuFreqLevel === '0' ? 'badge-emerald' : 'badge-amber'}`}>
              <Gauge size={10} />
              GPU: {gpuFreqLevel === '0' ? 'MAX' : `Lvl ${gpuFreqLevel}`}
            </span>
          )}
        </div>
      </div>

      <div ref={containerRef}>
        <svg width={width} height={CHART_HEIGHT} className="overflow-visible">
          {gridValues.map((v, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={toY(v)}
                x2={PAD.left + cw} y2={toY(v)}
                stroke="#334155" strokeWidth={1} strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8} y={toY(v) + 3}
                textAnchor="end" className="text-[10px] fill-slate-500 font-mono"
              >
                {Math.round(v)}
              </text>
            </g>
          ))}

          <text
            x={14} y={PAD.top + ch / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${PAD.top + ch / 2})`}
            className="text-[9px] fill-slate-600 font-mono uppercase tracking-wider"
          >
            MHz
          </text>

          {history.length > 1 && perCoreFrequencies.map((_core, coreIdx) => {
            const coreHistory = history.map((e) => e.cores[coreIdx]);
            const validPoints = coreHistory.map((freq, i) => {
              if (freq == null) return null;
              return `${toX(i)},${toY(freq)}`;
            }).filter(Boolean);
            if (validPoints.length < 2) return null;
            return (
              <polyline
                key={coreIdx}
                points={validPoints.join(' ')}
                fill="none"
                stroke={CORE_COLORS[coreIdx % CORE_COLORS.length]}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })}

          {perCoreFrequencies.map((core, coreIdx) =>
            core.freqMhz != null && (
              <g key={`dot-${coreIdx}`}>
                <circle
                  cx={toX(MAX_SAMPLES - 1)}
                  cy={toY(core.freqMhz)}
                  r={3}
                  fill={CORE_COLORS[coreIdx % CORE_COLORS.length]}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
                <text
                  x={PAD.left + cw + 8}
                  y={toY(core.freqMhz) + 3}
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  C{coreIdx}
                </text>
              </g>
            )
          )}

          <text x={PAD.left} y={CHART_HEIGHT - 4} className="text-[9px] fill-slate-600 font-mono">
            -{Math.round(MAX_SAMPLES * 2 / 60)}m
          </text>
          <text x={PAD.left + cw} y={CHART_HEIGHT - 4} textAnchor="end" className="text-[9px] fill-slate-600 font-mono">
            now
          </text>
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {perCoreFrequencies.map((core, coreIdx) => (
          <div key={coreIdx} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CORE_COLORS[coreIdx % CORE_COLORS.length] }}
            />
            <span className="text-[10px] font-mono text-slate-400">
              CPU{coreIdx}: {core.freqMhz != null ? `${core.freqMhz} MHz` : 'OFF'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

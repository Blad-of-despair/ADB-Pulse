import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, AlertCircle } from 'lucide-react';

const API_BASE = `http://${window.location.hostname}:3400`;

export default function AdbTerminal({ deviceError }) {
  const [entries, setEntries] = useState([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [entries]);

  const runCommand = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    setEntries((prev) => [...prev, { type: 'input', text: trimmed }]);
    setHistory((prev) => [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 100));
    setHistoryIdx(-1);
    setRunning(true);
    setInput('');
    try {
      const res = await fetch(`${API_BASE}/api/adb/shell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();
      const output = data.success ? (data.output || '(empty)') : (data.output || data.error || 'Request failed');
      setEntries((prev) => [...prev, { type: 'output', text: output, error: !data.success }]);
    } catch (err) {
      setEntries((prev) => [...prev, { type: 'output', text: err.message, error: true }]);
    }
    setRunning(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      runCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput('');
        return;
      }
      const nextIdx = historyIdx - 1;
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
    }
  };

  if (deviceError) {
    return (
      <div className="glass p-6 flex items-center justify-center h-72">
        <div className="flex flex-col items-center gap-3 text-slate-500 text-center max-w-xs">
          <AlertCircle size={36} className="text-amber-400" />
          <span className="text-sm font-medium">No Device Connected</span>
          <span className="text-xs text-slate-600">Connect a device to use the ADB shell</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="stat-label flex items-center gap-2">
          <Terminal size={14} className="text-cyan-400" />
          ADB Shell
        </h2>
        {entries.length > 0 && (
          <button
            onClick={() => setEntries([])}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-colors"
            title="Clear terminal"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div
        ref={outputRef}
        className="bg-[#0a0a0f] rounded-xl p-4 h-72 overflow-y-auto font-mono text-xs space-y-1 border border-white/[0.06] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {entries.length === 0 && (
          <div className="text-slate-600 italic leading-relaxed">
            Type a command and press Enter.<br />
            Examples:{' '}
            <span className="text-cyan-600 not-italic">top -n 1</span>,{' '}
            <span className="text-cyan-600 not-italic">free -m</span>,{' '}
            <span className="text-cyan-600 not-italic">cat /proc/cpuinfo</span>
          </div>
        )}
        {entries.map((entry, i) => (
          <div key={i} className="leading-relaxed whitespace-pre-wrap break-all">
            {entry.type === 'input' ? (
              <span><span className="text-cyan-400">$ </span><span className="text-slate-100">{entry.text}</span></span>
            ) : (
              <span className={entry.error ? 'text-red-400' : 'text-slate-400'}>{entry.text}</span>
            )}
          </div>
        ))}
        {running && <div className="text-slate-600 animate-pulse">▌</div>}
      </div>

      <div className="flex items-center gap-2 mt-3 px-1">
        <span className="text-cyan-400 font-mono text-xs select-none">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="adb shell command..."
          className="flex-1 bg-transparent text-sm font-mono text-slate-100 placeholder-slate-600 outline-none"
          disabled={running}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={() => runCommand(input)}
          disabled={running || !input.trim()}
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-white/[0.06] transition-colors disabled:opacity-30"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

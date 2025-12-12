// client/src/components/dashboard/CommandGenerator.jsx
import { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { generateCommand } from '../../services/aiService';
import { parseAIResponse } from '../../utils/formatter';
import LoadingSpinner from '../ui/LoadingSpinner';
import CodeBlock from '../ui/CodeBlock';

export default function CommandGenerator({ disabled: guestDisabled }) {
  const { t, lang } = useLanguage();
  const { isGuestLimitReached } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState('generate');
  const [os, setOs] = useState('linux');
  const [device, setDevice] = useState('none');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // اضافه کردن این لاگ برای چک کردن اینکه کامپوننت mount می‌شه یا نه
  useEffect(() => {
    console.log("CommandGenerator: Component mounted");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("CommandGenerator: handleSubmit called"); // اضافه کردن این لاگ

    if (!prompt.trim()) {
      setError(t('promptIsRequired'));
      return;
    }

    if (guestDisabled || isGuestLimitReached()) {
      setError(t('guestLimitReached'));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = {
        mode,
        os,
        device: ['cisco', 'mikrotik', 'fortigate'].includes(os) ? device : undefined,
        skillLevel,
        user_request: prompt.trim(),
        lang
      };

      console.log("CommandGenerator: Sending data to API:", data); // لاگ برای چک کردن داده

      const response = await generateCommand(data);
      console.log("CommandGenerator: Raw server response:", response); // چک کردن پاسخ سرور

      if (!response.output) {
        throw new Error("Server returned empty output");
      }

      const parsed = parseAIResponse(response.output);
      console.log("CommandGenerator: Parsed result:", parsed); // چک کردن نتیجه پارس شده

      setResult(parsed);
    } catch (err) {
      console.error("CommandGenerator: Error in handleSubmit:", err); // لاگ خطا
      setError(err.message || t('unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const osOptions = [
    { value: 'linux', label: 'Linux' },
    { value: 'windows', label: 'Windows' },
    { value: 'macos', label: 'macOS' },
    { value: 'cisco', label: 'Cisco' },
    { value: 'mikrotik', label: 'MikroTik' },
    { value: 'fortigate', label: 'FortiGate' }
  ];

  const deviceOptions = {
    cisco: ['asa', 'ios', 'ios-xr', 'nx-os'],
    mikrotik: ['routeros', 'chr'],
    fortigate: ['fortios']
  };

  const skillOptions = [
    { value: 'beginner', label: t('beginner') },
    { value: 'intermediate', label: t('intermediate') },
    { value: 'advanced', label: t('advanced') }
  ];

  return (
    <div className="bg-ccg-card border border-ccg-border rounded-xl p-4">
      <h3 className="text-lg font-bold text-blue-400 mb-4">⚡ {t('commandGenerator')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">{t('mode')}</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white"
              disabled={loading}
            >
              <option value="generate">{t('generateCommand')}</option>
              <option value="explain">{t('explainCommand')}</option>
              <option value="script">{t('generateScript')}</option>
              <option value="error">{t('analyzeError')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">OS</label>
            <select
              value={os}
              onChange={(e) => {
                setOs(e.target.value);
                if (!['cisco', 'mikrotik', 'fortigate'].includes(e.target.value)) {
                  setDevice('none');
                }
              }}
              className="w-full bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white"
              disabled={loading}
            >
              {osOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {['cisco', 'mikrotik', 'fortigate'].includes(os) && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">{t('deviceType')}</label>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value)}
                className="w-full bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white"
                disabled={loading}
              >
                <option value="none">{t('none')}</option>
                {deviceOptions[os]?.map(d => (
                  <option key={d} value={d}>{d.toUpperCase()}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm text-slate-300 mb-1">{t('skillLevel')}</label>
            <select
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              className="w-full bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white"
              disabled={loading}
            >
              {skillOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">
            {mode === 'generate' ? t('describeYourGoal') : t('enterCommand')}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('promptPlaceholder')}
            className="w-full min-h-[120px] bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white font-mono text-sm"
            disabled={loading || guestDisabled}
          />
        </div>

        <button
          type="submit"
          disabled={loading || guestDisabled || !prompt.trim()}
          className={`w-full py-3 rounded font-medium ${
            (guestDisabled || loading)
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {loading ? <LoadingSpinner /> : t('generateCommand')}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          {result.explanation && (
            <div className="p-4 bg-slate-800 border border-ccg-border rounded-lg">
              <h4 className="font-medium text-amber-300 mb-2">💡 {t('explanation')}</h4>
              <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: result.explanation }} />
            </div>
          )}

          {result.command && (
            <div>
              <h4 className="font-medium text-blue-300 mb-2">💻 {t('command')}</h4>
              <CodeBlock code={result.command} language={os === 'windows' ? 'powershell' : 'bash'} />
            </div>
          )}

          {result.suggestions && (
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
              <h4 className="font-medium text-green-300 mb-2">✨ {t('suggestions')}</h4>
              <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: result.suggestions }} />
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 bg-rose-900/30 border border-rose-700 rounded text-rose-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

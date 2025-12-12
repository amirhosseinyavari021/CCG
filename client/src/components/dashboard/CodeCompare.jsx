// client/src/components/dashboard/CodeCompare.jsx
import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { compareCode } from '../../services/aiService';
import { parseAIResponse } from '../../utils/formatter';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function CodeCompare({ disabled }) {
  const { t } = useLanguage();
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code1.trim() || !code2.trim() || disabled) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await compareCode({ code1, code2 });
      const parsed = parseAIResponse(response.output);

      setResult(parsed);
    } catch (err) {
      setError(err.message || t('unknownError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-ccg-card border border-ccg-border rounded-xl p-4">
      <h3 className="text-lg font-bold text-blue-400 mb-4">↔️ {t('codeCompare')}</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">{t('firstCode')}</label>
            <textarea
              value={code1}
              onChange={(e) => setCode1(e.target.value)}
              placeholder={t('pasteCode')}
              className="w-full min-h-[150px] bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white font-mono text-sm"
              disabled={loading || disabled}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">{t('secondCode')}</label>
            <textarea
              value={code2}
              onChange={(e) => setCode2(e.target.value)}
              placeholder={t('pasteCode')}
              className="w-full min-h-[150px] bg-slate-800 border border-ccg-border rounded px-3 py-2 text-white font-mono text-sm"
              disabled={loading || disabled}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || disabled || !code1.trim() || !code2.trim()}
          className={`w-full py-3 rounded font-medium ${
            disabled || loading
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {loading ? <LoadingSpinner /> : t('compareCodes')}
        </button>
      </form>

      {/* Result */}
      {result && (
        <div className="mt-6 p-4 bg-slate-800 border border-ccg-border rounded-lg">
          <div className="text-slate-300" dangerouslySetInnerHTML={{ __html: result.html }} />
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

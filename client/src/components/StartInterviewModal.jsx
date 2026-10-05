import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useNavigate } from 'react-router-dom';

const levels    = ['Junior', 'Mid-level', 'Senior', 'Lead'];
const quickRoles = ['Frontend Engineer', 'Backend Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer', 'Product Manager'];

const MODES = [
  {
    id: 'mcq',
    icon: '⚡',
    label: 'MCQ Quiz',
    desc: '15 multiple-choice questions · 15 min timer · Instant auto-score',
    color: 'border-indigo-500 bg-indigo-500/15 text-indigo-300',
    pill: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  },
  {
    id: 'ai-mock',
    icon: '🤖',
    label: 'AI Mock Interview',
    desc: '15 open-ended questions · Voice or text · AI-evaluated feedback',
    color: 'border-emerald-500 bg-emerald-500/15 text-emerald-300',
    pill: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  },
];

function StartInterviewModal({ isOpen, onClose }) {
  const { token }  = useAuth();
  const toast      = useToast();
  const navigate   = useNavigate();
  const [mode, setMode]                       = useState('mcq');
  const [jobTitle, setJobTitle]               = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-level');
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!jobTitle.trim()) { setError('Please enter a job title.'); return; }
    if (!token)            { setError('Not authenticated. Please login again.'); return; }

    setLoading(true);
    try {
      const endpoint = mode === 'ai-mock' ? '/api/interviews/generate-ai-mock' : '/api/interviews/generate';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobTitle: jobTitle.trim(), experienceLevel }),
      });
      let data = null;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) { data = await res.json(); }
      else { const text = await res.text(); try { data = text ? JSON.parse(text) : {}; } catch { throw new Error(`Server error (${res.status}): ${text.slice(0, 120)}`); } }
      if (res.status === 401) throw new Error('Session expired. Please login again.');
      if (!res.ok) throw new Error(data?.message || `Failed to generate (${res.status})`);
      const sessionId = data.sessionId || data.session?._id;
      if (!sessionId) throw new Error('No session ID returned');
      const path = mode === 'ai-mock' ? `/ai-interview/${sessionId}` : `/interview/${sessionId}`;
      toast.info('Session ready!', `Starting ${mode === 'ai-mock' ? 'AI Mock Interview' : 'MCQ Quiz'} for ${jobTitle}`);
      navigate(path);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 p-7 shadow-2xl shadow-black/60"
            style={{ background: 'rgba(15,13,38,0.98)', backdropFilter: 'blur(24px)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
                  <span className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">New Session</span>
                </div>
                <h3 className="text-xl font-bold text-white">Start Interview</h3>
                <p className="text-slate-400 text-sm mt-1">Choose your interview mode below</p>
              </div>
              <button onClick={onClose} className="h-8 w-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all text-sm">✕</button>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {MODES.map((m) => (
                <button key={m.id} type="button" onClick={() => setMode(m.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition-all duration-200 ${mode === m.id ? m.color : 'border-white/8 hover:border-white/15'}`}>
                  <div className="text-2xl mb-2">{m.icon}</div>
                  <p className="text-sm font-semibold text-white">{m.label}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{m.desc}</p>
                  {mode === m.id && (
                    <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${m.pill}`}>Selected</span>
                  )}
                </button>
              ))}
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Job title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. React Frontend Engineer"
                  className="w-full rounded-2xl border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20"
                  style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickRoles.map((r) => (
                    <button key={r} type="button" onClick={() => setJobTitle(r)}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${jobTitle === r ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-slate-500 hover:border-indigo-500/40 hover:text-slate-300'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience level */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Experience Level</label>
                <div className="grid grid-cols-4 gap-2">
                  {levels.map((lvl) => (
                    <button key={lvl} type="button" onClick={() => setExperienceLevel(lvl)}
                      className={`rounded-2xl border py-2.5 text-sm font-medium transition-all ${experienceLevel === lvl ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'}`}>
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info strip */}
              <div className="flex items-center gap-4 rounded-2xl border border-white/6 px-4 py-3" style={{ background: 'rgba(99,102,241,0.06)' }}>
                {(mode === 'mcq'
                  ? ['15 questions', '15 min', 'Auto-scored']
                  : ['15 questions', '30 min', 'AI-evaluated']
                ).map((t, i, arr) => (
                  <div key={t} className={`flex-1 text-center ${i < arr.length - 1 ? 'border-r border-white/8' : ''}`}>
                    <p className="text-white font-semibold text-sm">{t.split(' ')[0]}</p>
                    <p className="text-slate-500 text-xs">{t.split(' ').slice(1).join(' ')}</p>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-1">
                <button type="button" onClick={onClose} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-white/20 transition-all">Cancel</button>
                <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.98 }}
                  className="flex-[2] btn-primary rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {loading
                    ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Generating...</span>
                    : mode === 'ai-mock' ? '🤖 Start AI Mock Interview' : '⚡ Start MCQ Quiz'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default StartInterviewModal;


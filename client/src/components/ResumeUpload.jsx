import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const parseResumeData = (data) => ({
  skills:          Array.isArray(data.skills) ? data.skills : [],
  experienceLevel: data.experienceLevel || 'Unknown',
  pastRoles:       Array.isArray(data.pastRoles) ? data.pastRoles : [],
  summary:         data.summary || '',
});

export default function ResumeUpload({ onContinue }) {
  const navigate     = useNavigate();
  const { token }    = useAuth();
  const [file, setFile]         = useState(null);
  const [drag, setDrag]         = useState(false);
  const [error, setError]       = useState('');
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile]   = useState(null);

  const handleFileChange = (e) => {
    setError('');
    const f = e.target.files?.[0];
    if (f && f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    setFile(f || null);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') { setError('Please upload a PDF file.'); return; }
    setError('');
    setFile(f);
  }, []);

  const handleUpload = async () => {
    if (!file) { setError('Please select a PDF file first.'); return; }
    setError('');
    setUploading(true);
    setProfile(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      const res  = await fetch('/api/resume/upload', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : undefined }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed.');
      setProfile(parseResumeData(data.parsedData || {}));
    } catch (err) {
      setError(err.message || 'Unexpected upload error.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => { setFile(null); setError(''); setProfile(null); };
  const continueAction = () => { if (typeof onContinue === 'function') { onContinue(); return; } navigate('/dashboard'); };

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!profile ? (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragEnter={() => setDrag(true)}
              onDragLeave={() => setDrag(false)}
              className={`relative rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 cursor-pointer
                ${drag ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/15 hover:border-indigo-500/50 hover:bg-white/4'}
                ${file ? 'border-emerald-500/40 bg-emerald-500/5' : ''}
              `}
            >
              <input type="file" accept="application/pdf" onChange={handleFileChange} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
              <div className="pointer-events-none space-y-3">
                <motion.div animate={{ y: drag ? -6 : 0 }} transition={{ type: 'spring', stiffness: 300 }}
                  className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center text-3xl
                    ${file ? 'bg-emerald-500/20' : 'bg-indigo-500/15'}`}>
                  {file ? '✅' : '📄'}
                </motion.div>
                {file ? (
                  <div>
                    <p className="text-emerald-400 font-semibold text-sm">{file.name}</p>
                    <p className="text-slate-500 text-xs mt-1">{(file.size / 1024).toFixed(0)} KB · Ready to upload</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-white font-semibold">Drop your resume PDF here</p>
                    <p className="text-slate-500 text-sm mt-1">or click to browse files</p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.div>
            )}

            {uploading && (
              <div className="flex items-center gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/8 px-5 py-4">
                <div className="h-5 w-5 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Parsing your resume...</p>
                  <p className="text-slate-400 text-xs">Extracting skills, roles and experience level</p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <motion.button type="button" onClick={handleUpload} disabled={uploading || !file} whileTap={{ scale: 0.98 }}
                className="btn-primary flex-1 rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? 'Uploading...' : '⬆ Upload Resume'}
              </motion.button>
              {file && (
                <button type="button" onClick={reset}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">Resume Parsed</p>
                <h3 className="text-lg font-bold text-white mt-1">Candidate Profile</h3>
              </div>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-300">
                {profile.experienceLevel}
              </span>
            </div>

            {/* Skills */}
            <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Skills Detected</p>
              <div className="flex flex-wrap gap-2">
                {profile.skills.length
                  ? profile.skills.map((s) => (
                    <span key={s} className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">{s}</span>
                  ))
                  : <p className="text-slate-500 text-sm">No skills detected</p>
                }
              </div>
            </div>

            {/* Past roles + summary grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Past Roles</p>
                <div className="space-y-2">
                  {profile.pastRoles.length
                    ? profile.pastRoles.map((r) => (
                      <div key={r} className="rounded-xl border border-white/6 px-3 py-2 text-xs text-slate-300" style={{ background: 'rgba(255,255,255,0.04)' }}>{r}</div>
                    ))
                    : <p className="text-slate-500 text-sm">No roles found</p>
                  }
                </div>
              </div>
              <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Summary</p>
                <p className="text-sm text-slate-300 leading-relaxed">{profile.summary || 'No summary available.'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={reset}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
                Re-upload
              </button>
              <motion.button type="button" onClick={continueAction} whileTap={{ scale: 0.98 }}
                className="btn-primary flex-1 rounded-2xl py-3 text-sm font-semibold text-white">
                🚀 Start Mock Interview
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

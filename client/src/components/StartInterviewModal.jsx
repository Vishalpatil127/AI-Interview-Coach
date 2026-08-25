import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

function StartInterviewModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Mid-level');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!jobTitle.trim()) {
      setError('Please enter a job title.');
      return;
    }

    if (!token) {
      setError('You are not authenticated. Please login again.');
      return;
    }

    setLoading(true);
    try {
      console.log('StartInterview: sending request', { jobTitle: jobTitle.trim(), experienceLevel, token });
      const res = await fetch('/api/interviews/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ jobTitle: jobTitle.trim(), experienceLevel }),
      });

      // Try to parse JSON, but fall back to text for HTML/error pages (helps with DOCTYPE responses)
      let data = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          // Not JSON — throw with the raw text so UI shows useful info
          throw new Error(`Server returned non-JSON response (status ${res.status}): ${text.slice(0, 200)}`);
        }
      }

      console.log('StartInterview: response', { status: res.status, data });

      if (res.status === 401) {
        // explicit handling so user doesn't get auto-signed-out silently
        throw new Error('Unauthorized — your session may have expired. Please login again.');
      }

      if (!res.ok) throw new Error(data.message || `Failed to generate interview (status ${res.status})`);

      const sessionId = data.sessionId || data.session?._id || null;
      if (!sessionId) throw new Error('No session id returned');

      // navigate first, then close modal
      navigate(`/interview/${sessionId}`);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold tracking-tight text-slate-900">Start New Mock Interview</h3>
            <p className="mt-2 text-sm text-slate-500">Generate tailored questions for your next role.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && <div className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <label className="block text-sm font-medium text-slate-700">
            Job title
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Java Backend Engineer"
              className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Experience level
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="mt-2 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-all duration-200 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              <option>Junior</option>
              <option>Mid-level</option>
              <option>Senior</option>
              <option>Lead</option>
            </select>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-sky-700 disabled:opacity-70"
            >
              {loading ? (
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : null}
              {loading ? 'Generating...' : 'Start Interview'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StartInterviewModal;

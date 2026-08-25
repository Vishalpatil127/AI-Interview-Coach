import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Tooltip, CartesianGrid, XAxis, YAxis } from 'recharts';

const pageVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: 'easeIn' } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

export default function InterviewPage() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/interviews/${sessionId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Failed to fetch session (${res.status})`);
        }
        const data = await res.json();
        if (!mounted) return;
        const payload = data?.session || data;
        setSession(payload);
        const initAnswers = (payload.questions || []).map((q) => ({
          questionId: q.id ?? q._id ?? null,
          questionText: q.question || '',
          selectedIndex: null,
          selectedAnswer: '',
        }));
        setAnswers(initAnswers);
        setCurrentIndex(0);
        setSecondsRemaining(payload.timerSeconds ?? 900);
        // load recent performance history for charts
        try {
          const hres = await fetch('/api/interviews/history', {
            headers: { Authorization: token ? `Bearer ${token}` : undefined },
          });
          if (hres.ok) {
            const hdata = await hres.json();
            if (mounted) setHistory(hdata.sessions || []);
          }
        } catch (e) {
          // ignore history errors
        }
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load session');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [sessionId, token]);

  useEffect(() => {
    if (!session || secondsRemaining <= 0) return;
    const intervalId = window.setInterval(() => {
      setSecondsRemaining((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [session, secondsRemaining]);

  useEffect(() => {
    if (secondsRemaining !== 0) return;
    if (!session || loading) return;
    handleSubmit();
  }, [secondsRemaining]);

  const updateSelection = (index, selectedIndex, selectedAnswer) => {
    if (submitting || secondsRemaining === 0) return;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...(copy[index] || {}),
        questionId: copy[index]?.questionId ?? session.questions[index]?.id ?? session.questions[index]?._id ?? null,
        questionText: session.questions[index]?.question || '',
        selectedIndex,
        selectedAnswer,
      };
      return copy;
    });
  };

  const goNext = () => {
    if (!session) return;
    setCurrentIndex((i) => Math.min(i + 1, (session.questions || []).length - 1));
  };
  const goPrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleSubmit = useCallback(async () => {
    if (!session) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interviews/${sessionId}/submit`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userAnswers: answers }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Submit failed (${res.status})`);
      }
      navigate(`/results/${sessionId}`);
    } catch (err) {
      console.error('Submit error', err);
      setError(err.message || 'Failed to submit interview');
      setSubmitting(false);
    }
  }, [answers, navigate, session, sessionId, token, submitting]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
          <div className="h-48 animate-pulse rounded-3xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-rose-200 bg-white p-8 shadow-sm shadow-rose-100">
          <h2 className="text-2xl font-semibold tracking-tight text-rose-600">Unable to load interview</h2>
          <p className="mt-4 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Session not found</h2>
          <p className="mt-4 text-slate-600">The requested interview session could not be loaded.</p>
        </div>
      </div>
    );
  }

  const total = (session.questions || []).length;
  const question = session.questions[currentIndex] || {};
  const selectedAnswer = answers[currentIndex] || {};
  const progressPercent = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;
  const answeredCount = answers.filter((item) => typeof item.selectedIndex === 'number').length;
  const answeredPercent = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const sparkData = (history || []).map((s) => ({ date: new Date(s.createdAt).toLocaleDateString(), score: s.evaluationResult?.overallScore ?? null })).filter((p) => p.score !== null).slice(0, 12).reverse();

  return (
    <motion.div
      className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={cardVariants} className="col-span-2 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Timed MCQ Test</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{session.jobTitle || 'Role-based assessment'}</h2>
            <p className="mt-2 text-sm text-slate-600">Question <span className="font-medium">{currentIndex + 1}</span> of <span className="font-medium">{total}</span> — answer quickly and accurately.</p>
          </div>
          <div className="space-y-3 text-right">
            <div className="rounded-3xl bg-slate-100 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-600">{progressPercent}% complete</div>
            <div className="rounded-3xl bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white">{formatTime(secondsRemaining)}</div>
            <div className="mt-2 w-40">
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div style={{ width: `${Math.max(0, Math.min(100, Math.round((secondsRemaining / (session.timerSeconds ?? 900)) * 100)))}%` }} className="h-full bg-sky-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8 shadow-inner shadow-slate-200/50">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">MCQ</span>
            <span className="text-sm text-slate-500">Question ID: {question.id}</span>
          </div>
          <h3 className="text-2xl font-semibold text-slate-900">{question.question}</h3>
          <p className="mt-4 text-sm text-slate-600">Choose the single best answer for this role-based question.</p>
        </div>

        <motion.div variants={cardVariants} className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200 transition-all duration-200 hover:-translate-y-0.5">
          <div className="space-y-4">
            {(question.choices || []).map((choice, index) => {
              const selected = selectedAnswer.selectedIndex === index;
              const isDisabled = submitting || secondsRemaining === 0;
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => updateSelection(currentIndex, index, choice)}
                  className={`w-full rounded-3xl border px-5 py-4 text-left text-sm font-medium transition-all duration-200 ${selected ? 'border-sky-600 bg-sky-100 text-slate-900 shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100'} ${isDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm ${selected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300 bg-white text-slate-700'}`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span>{choice}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-3xl bg-slate-100 px-4 py-3 text-sm text-slate-700">Answered {answeredCount} of {total} questions.</div>
            <div className="flex flex-wrap gap-3">
              <button onClick={goPrev} disabled={currentIndex === 0 || submitting || secondsRemaining === 0} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:opacity-50">
                Previous
              </button>
              <button onClick={goNext} disabled={currentIndex === total - 1 || submitting || secondsRemaining === 0} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-200 disabled:opacity-50">
                Next
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-between flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-sm text-slate-500">You will be automatically submitted when the timer hits zero.</div>
            <button onClick={handleSubmit} disabled={submitting || secondsRemaining === 0} className="rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting || secondsRemaining === 0 ? 'Submitting...' : 'Submit Answers'}
            </button>
          </div>
        </motion.div>
        </motion.div>

        {/* Right column: charts and status */}
        <motion.aside variants={cardVariants} className="col-span-1 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Answered</p>
                  <p className="text-lg font-semibold text-slate-900">{answeredCount} / {total}</p>
                </div>
                <div className="relative h-24 w-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[{ name: 'Answered', value: answeredPercent }, { name: 'Remaining', value: 100 - answeredPercent }]}
                        innerRadius={32}
                        outerRadius={48}
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                      >
                        <Cell key="answered" fill="#0ea5e9" />
                        <Cell key="remaining" fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900">{answeredPercent}%</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500">Answered progress</div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Recent performance</p>
              <p className="text-lg font-semibold text-slate-900">Score trend</p>
              <div className="mt-3 h-36">
                {sparkData.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sparkData} margin={{ top: 6, right: 6, left: -10, bottom: 6 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => `${v} / 10`} />
                      <Bar dataKey="score" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No recent scores</div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              <div className="font-medium text-slate-900">Tips</div>
              <ul className="mt-2 space-y-1">
                <li>Read each question carefully before selecting.</li>
                <li>Use the timer bar to pace yourself.</li>
                <li>Unanswered questions will be auto-submitted when time expires.</li>
              </ul>
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}

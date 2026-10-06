import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import confetti from 'canvas-confetti';
import { ResultsSkeleton } from '../components/Skeleton.jsx';

/* ── helpers ── */
function StatusBadge({ score }) {
  const label = score >= 8 ? 'Excellent' : score >= 5 ? 'Needs Practice' : 'Action Required';
  const tone  = score >= 8 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              : score >= 5 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              :               'bg-red-500/20 text-red-300 border-red-500/30';
  return <span className={`rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest ${tone}`}>{label}</span>;
}

function fireConfetti() {
  const end = Date.now() + 2200;
  const colors = ['#818cf8', '#a78bfa', '#34d399', '#38bdf8', '#fbbf24'];
  const frame = () => {
    confetti({ particleCount: 3, angle: 60,  spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const { token }     = useAuth();
  const navigate      = useNavigate();
  const toast         = useToast();
  const reportRef     = useRef(null);
  const confettiFired = useRef(false);

  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [session, setSession]     = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [retaking, setRetaking]   = useState(false);

  /* load session */
  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/interviews/${sessionId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!res.ok) throw new Error(await res.text() || `Failed (${res.status})`);
        const data = await res.json();
        if (!mounted) return;
        setSession(data.session || data);
      } catch (err) {
        if (mounted) { setError(err.message); toast.error('Failed to load results', err.message); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSession();
    return () => { mounted = false; };
  }, [sessionId, token]);

  /* fire confetti once when high score loads */
  const evaluation  = session?.evaluationResult || null;
  const overallScore = evaluation && typeof evaluation.overallScore === 'number' ? evaluation.overallScore : null;

  useEffect(() => {
    if (overallScore !== null && overallScore >= 8 && !confettiFired.current) {
      confettiFired.current = true;
      setTimeout(() => {
        fireConfetti();
        toast.success('Outstanding! 🎉', `You scored ${overallScore}/10 — excellent performance!`, { duration: 5000 });
      }, 600);
    }
  }, [overallScore]);

  /* retake interview */
  const handleRetake = async () => {
    if (!session?.jobTitle || retaking) return;
    setRetaking(true);
    try {
      const res = await fetch('/api/interviews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ jobTitle: session.jobTitle, experienceLevel: session.experienceLevel || 'Mid-level' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate');
      const id = data.sessionId || data.session?._id;
      if (!id) throw new Error('No session ID returned');
      toast.info('New session ready', `Starting interview for ${session.jobTitle}`);
      navigate(`/interview/${id}`);
    } catch (err) {
      toast.error('Retake failed', err.message);
    } finally {
      setRetaking(false);
    }
  };

  /* PDF */
  const handleDownloadPDF = async () => {
    if (!reportRef.current || !evaluation) return;
    setSavingPdf(true);
    try {
      const lib = await new Promise((resolve, reject) => {
        if (window.html2pdf) return resolve(window.html2pdf);
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
        s.async = true; s.dataset.html2pdf = 'true';
        s.onload  = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf not available'));
        s.onerror = () => reject(new Error('Failed to load html2pdf from CDN'));
        document.body.appendChild(s);
      });
      await lib().set({
        margin: 10, filename: `Interview_Report_${sessionId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(reportRef.current).save();
      toast.success('PDF saved', 'Your interview report has been downloaded.');
    } catch (err) {
      toast.error('PDF failed', err.message);
    } finally {
      setSavingPdf(false);
    }
  };

  const createdAt = session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown date';

  /* ── states ── */
  if (loading) return <ResultsSkeleton />;

  if (error && !session) return (
    <div className="min-h-screen bg-[#070614] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/8 p-8 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-white mb-2">Unable to load results</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')}
          className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white">
          Back to Dashboard
        </button>
      </div>
    </div>
  );

  if (!session) return null;

  return (
    <div className="min-h-screen bg-[#070614] bg-grid text-white">
      <div className="orb orb-1" style={{ opacity: 0.12 }} />
      <div className="orb orb-2" style={{ opacity: 0.1  }} />

      {/* ── header ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 border-b border-white/6"
        style={{ background: 'rgba(7,6,20,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
            <span className="font-semibold text-white tracking-tight hidden sm:block">Interview Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
              ← Dashboard
            </button>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">

        {/* ── score hero ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border border-white/8 p-8"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)' }}>
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-600 opacity-10 blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 h-40 w-40 rounded-full bg-purple-600 opacity-10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest">Interview Report</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{session.jobTitle || 'Mock Interview'}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span>{createdAt}</span>
                <span className="h-1 w-1 rounded-full bg-slate-600" />
                <span>{session.experienceLevel || 'Unspecified level'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StatusBadge score={overallScore ?? 0} />
              </div>
            </div>

            {/* score ring */}
            <div className="flex flex-col items-center gap-2">
              <div className={`relative h-32 w-32 rounded-full flex items-center justify-center border-4 ${
                overallScore >= 8 ? 'border-emerald-500/40 shadow-[0_0_32px_rgba(52,211,153,0.3)]'
                : overallScore >= 5 ? 'border-amber-500/40 shadow-[0_0_32px_rgba(251,191,36,0.3)]'
                : 'border-red-500/40 shadow-[0_0_32px_rgba(248,113,113,0.3)]'
              }`} style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="text-center">
                  <p className={`text-4xl font-bold ${overallScore >= 8 ? 'text-emerald-400' : overallScore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {overallScore !== null ? overallScore.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">out of 10</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">Overall Score</p>
            </div>
          </div>

          {/* action buttons */}
          <div className="relative z-10 mt-7 flex flex-wrap gap-3">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleRetake} disabled={retaking}
              className="btn-primary flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {retaking
                ? <><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating...</>
                : '🔁 Retake Interview'}
            </motion.button>
            <button onClick={handleDownloadPDF} disabled={savingPdf || !evaluation}
              className="flex items-center gap-2 rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 transition-all disabled:opacity-50">
              {savingPdf ? 'Preparing...' : '⬇ Download PDF'}
            </button>
            <button onClick={() => navigate('/dashboard')}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
              ← Dashboard
            </button>
          </div>
        </motion.div>

        {/* ── summary ── */}
        <motion.div ref={reportRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-3xl border border-white/8 p-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <h2 className="text-lg font-semibold text-white mb-2">Executive Summary</h2>
          <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">{evaluation?.overallSummary || 'No summary provided.'}</p>
        </motion.div>

        {/* ── per-question evaluations ── */}
        <div className="space-y-4">
          {evaluation?.evaluations?.length ? evaluation.evaluations.map((item, index) => {
            const question    = (session.questions || []).find((q) => String(q.id ?? q._id) === String(item.questionId)) || {};
            const answer      = (session.userAnswers || []).find((a) => String(a.questionId ?? a.id) === String(item.questionId)) || {};
            const questionType = question.type ? question.type.replace(/-/g, ' ') : 'Unknown';
            const scoreColor  = item.score >= 8 ? 'text-emerald-400' : item.score >= 5 ? 'text-amber-400' : 'text-red-400';
            const isOpen      = openIndex === index;

            return (
              <motion.div key={index} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}
                className="rounded-3xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>

                {/* question header */}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between p-6">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-400">Q{index + 1}</span>
                      <span className="rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 capitalize">{questionType}</span>
                      <span className={`rounded-full border border-white/8 px-3 py-1 text-xs font-bold ${scoreColor}`}>
                        {item.score ?? 'N/A'} / 10
                      </span>
                    </div>
                    <p className="text-white font-medium leading-snug">{question.question || 'Question text not available'}</p>
                  </div>
                  <button onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="shrink-0 rounded-2xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:border-white/20 transition-all">
                    {isOpen ? 'Hide' : 'View details'}
                  </button>
                </div>

                {/* expandable detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-white/6">
                      <div className="p-6 space-y-5">

                        {/* MCQ choices */}
                        {question.type === 'mcq' && Array.isArray(question.choices) && question.choices.length ? (
                          <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Answer Choices</p>
                            <ul className="space-y-2">
                              {question.choices.map((choice, ci) => {
                                const isCorrect  = ci === question.correctAnswer;
                                const isSelected = ci === answer.selectedIndex;
                                return (
                                  <li key={ci} className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm border transition-all
                                    ${isCorrect  ? 'border-emerald-500/30 bg-emerald-500/8 text-white'
                                    : isSelected ? 'border-red-500/30 bg-red-500/8 text-white'
                                    :               'border-white/6 text-slate-400'}`}>
                                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold
                                      ${isCorrect ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-500 text-white' : 'bg-white/8 text-slate-500'}`}>
                                      {String.fromCharCode(65 + ci)}
                                    </span>
                                    <span className="flex-1">{choice}</span>
                                    {isCorrect && !isSelected && <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400">Correct</span>}
                                    {isSelected && isCorrect  && <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs text-emerald-400">Your answer ✓</span>}
                                    {isSelected && !isCorrect && <span className="rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs text-red-400">Your answer</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Your Answer</p>
                            <p className="text-sm text-slate-300 whitespace-pre-wrap">{answer.answerText || answer.selectedAnswer || 'Answer not provided.'}</p>
                          </div>
                        )}

                        {/* correct answer banner */}
                        <div className={`flex items-center gap-3 rounded-2xl border p-4
                          ${item.isCorrect ? 'border-emerald-500/25 bg-emerald-500/8' : 'border-red-500/20 bg-red-500/6'}`}>
                          <span className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold
                            ${item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                            {item.isCorrect ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">Correct Answer</p>
                            <p className="text-sm font-medium text-white">{item.correctAnswer || 'Not available'}</p>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold border
                            ${item.isCorrect ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'bg-red-500/15 border-red-500/30 text-red-400'}`}>
                            {item.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        {/* ideal answer */}
                        <div className="rounded-2xl border border-indigo-500/15 p-5" style={{ background: 'rgba(99,102,241,0.05)' }}>
                          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">AI Ideal Response</p>
                          <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
                            {item.idealAnswer
                              ? item.idealAnswer.split('\n').map((line, i) => <p key={i}>{line}</p>)
                              : <p className="text-slate-500">Ideal answer not available.</p>}
                          </div>
                        </div>

                        {/* strengths + improvements */}
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-emerald-500/15 p-5" style={{ background: 'rgba(52,211,153,0.04)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-3">Strengths</p>
                            <ul className="space-y-2">
                              {(item.strengths || []).length
                                ? item.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs">✓</span>
                                    {s}
                                  </li>
                                ))
                                : <li className="text-sm text-slate-500">No strengths flagged.</li>}
                            </ul>
                          </div>
                          <div className="rounded-2xl border border-amber-500/15 p-5" style={{ background: 'rgba(251,191,36,0.04)' }}>
                            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">Areas for Improvement</p>
                            <ul className="space-y-2">
                              {(item.improvements || []).length
                                ? item.improvements.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 text-xs">!</span>
                                    {s}
                                  </li>
                                ))
                                : <li className="text-sm text-slate-500">No improvements provided.</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          }) : (
            <div className="rounded-3xl border border-white/8 p-10 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-4xl mb-3">📋</p>
              <p className="text-white font-semibold">No evaluation details available</p>
              <p className="text-slate-500 text-sm mt-2">Submit the interview to see per-question breakdown.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

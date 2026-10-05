import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import useSpeechToText from '../hooks/useSpeechToText.js';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/* Animated mic waveform bars */
function MicWave({ active }) {
  return (
    <div className="flex items-end gap-[3px] h-8">
      {[1, 2, 3, 4, 5, 4, 3].map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-indigo-400"
          animate={active ? { height: [8, h * 6, 8] } : { height: 4 }}
          transition={{ duration: 0.6, repeat: active ? Infinity : 0, delay: i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

/* Question navigation dot */
function QDot({ idx, current, answered }) {
  const base = 'h-2.5 w-2.5 rounded-full transition-all duration-200 cursor-pointer';
  const cls  = idx === current ? 'bg-indigo-500 scale-125'
             : answered        ? 'bg-emerald-500'
             :                   'bg-white/15 hover:bg-white/30';
  return <div className={`${base} ${cls}`} title={`Q${idx + 1}`} />;
}

export default function AIMockInterviewPage() {
  const { sessionId } = useParams();
  const { token }     = useAuth();
  const navigate      = useNavigate();
  const toast         = useToast();
  const textareaRef   = useRef(null);

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [session, setSession]       = useState(null);
  const [currentIndex, setIndex]    = useState(0);
  const [answers, setAnswers]       = useState([]);       // [{ questionId, answerText }]
  const [secondsLeft, setSeconds]   = useState(1800);
  const [submitting, setSubmitting] = useState(false);
  const [inputMode, setInputMode]   = useState('text');  // 'text' | 'voice'
  const [voiceBuffer, setVoiceBuffer] = useState('');    // accumulates speech for current Q

  const {
    isListening, transcript, startListening, stopListening,
    resetTranscript, hasSupport, speechError,
  } = useSpeechToText({ lang: 'en-US' });

  /* ── Load session ── */
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res  = await fetch(`/api/interviews/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!mounted) return;
        const payload = data.session || data;
        setSession(payload);
        setSeconds(payload.timerSeconds ?? 1800);
        setAnswers((payload.questions || []).map((q) => ({ questionId: q.id ?? q._id, answerText: '' })));
      } catch (err) {
        if (mounted) { setError(err.message); toast.error('Failed to load session', err.message); }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [sessionId, token]);

  /* ── Countdown timer ── */
  useEffect(() => {
    if (!session || secondsLeft <= 0) return;
    const id = setInterval(() => setSeconds((s) => { if (s <= 1) { clearInterval(id); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [session, secondsLeft]);

  /* Auto-submit on timer expiry */
  useEffect(() => {
    if (secondsLeft === 0 && session && !loading) handleSubmit();
  }, [secondsLeft]);

  /* ── Sync voice transcript → current answer ── */
  useEffect(() => {
    if (!isListening && !transcript) return;
    const combined = voiceBuffer + (voiceBuffer && transcript ? ' ' : '') + transcript;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = { ...copy[currentIndex], answerText: combined };
      return copy;
    });
  }, [transcript]);

  /* Stop mic when switching questions */
  const switchQuestion = (idx) => {
    if (isListening) {
      stopListening();
      // flush current transcript into answer buffer
      const combined = voiceBuffer + (voiceBuffer && transcript ? ' ' : '') + transcript;
      setAnswers((prev) => {
        const copy = [...prev];
        copy[currentIndex] = { ...copy[currentIndex], answerText: combined };
        return copy;
      });
    }
    setVoiceBuffer(answers[idx]?.answerText || '');
    resetTranscript();
    setIndex(idx);
  };

  const goNext = () => { if (currentIndex < (session?.questions?.length ?? 1) - 1) switchQuestion(currentIndex + 1); };
  const goPrev = () => { if (currentIndex > 0) switchQuestion(currentIndex - 1); };

  /* Text input change */
  const handleTextChange = (e) => {
    const val = e.target.value;
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = { ...copy[currentIndex], answerText: val };
      return copy;
    });
  };

  /* Toggle mic */
  const toggleMic = () => {
    if (isListening) {
      stopListening();
      // commit transcript to buffer so switching question preserves it
      setVoiceBuffer(answers[currentIndex]?.answerText || '');
      resetTranscript();
    } else {
      // pre-fill buffer with existing text for this Q
      setVoiceBuffer(answers[currentIndex]?.answerText || '');
      resetTranscript();
      startListening();
    }
  };

  /* Clear current answer */
  const clearAnswer = () => {
    if (isListening) { stopListening(); resetTranscript(); }
    setVoiceBuffer('');
    setAnswers((prev) => {
      const copy = [...prev];
      copy[currentIndex] = { ...copy[currentIndex], answerText: '' };
      return copy;
    });
  };

  /* Submit */
  const handleSubmit = useCallback(async () => {
    if (submitting || !session) return;
    if (isListening) stopListening();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/interviews/${sessionId}/submit-ai-mock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userAnswers: answers }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success('Interview submitted!', 'Your answers are being evaluated.');
      navigate(`/results/${sessionId}`);
    } catch (err) {
      toast.error('Submit failed', err.message);
      setSubmitting(false);
    }
  }, [answers, isListening, navigate, session, sessionId, stopListening, submitting, token]);

  /* ── Render guards ── */
  if (loading) return (
    <div className="min-h-screen bg-[#070614] flex items-center justify-center gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      <p className="text-slate-400 text-sm">Loading your interview...</p>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#070614] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-3xl border border-red-500/20 bg-red-500/8 p-8 text-center">
        <p className="text-4xl mb-4">😕</p>
        <h2 className="text-xl font-bold text-white mb-2">Unable to load session</h2>
        <p className="text-slate-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white">← Dashboard</button>
      </div>
    </div>
  );

  const questions   = session?.questions || [];
  const total       = questions.length;
  const question    = questions[currentIndex] || {};
  const currentAns  = answers[currentIndex]?.answerText || '';
  const answeredCount = answers.filter((a) => a.answerText.trim().length > 0).length;
  const timerPct    = Math.round((secondsLeft / (session?.timerSeconds ?? 1800)) * 100);
  const timerColor  = secondsLeft < 300 ? 'text-red-400' : secondsLeft < 600 ? 'text-amber-400' : 'text-emerald-400';
  const wordCount   = currentAns.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#070614] bg-grid text-white">
      <div className="orb orb-1" style={{ opacity: 0.12 }} />
      <div className="orb orb-2" style={{ opacity: 0.10 }} />

      {/* ── Navbar ── */}
      <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 border-b border-white/6"
        style={{ background: 'rgba(7,6,20,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 gap-4">
          {/* logo + title */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
            <div className="hidden sm:block">
              <p className="text-white font-semibold text-sm leading-none">AI Mock Interview</p>
              <p className="text-indigo-400 text-xs mt-0.5 capitalize">{session?.jobTitle}</p>
            </div>
          </div>

          {/* question nav dots */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {questions.map((_, i) => (
              <QDot key={i} idx={i} current={currentIndex} answered={answers[i]?.answerText?.trim().length > 0}
                onClick={() => switchQuestion(i)} />
            ))}
          </div>

          {/* timer + progress */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${timerPct}%` }} />
              </div>
              <span className={`text-sm font-mono font-bold ${timerColor}`}>{formatTime(secondsLeft)}</span>
            </div>
            <span className="text-xs text-slate-500">{answeredCount}/{total} answered</span>
          </div>
        </div>
      </motion.header>

      {/* ── Main layout ── */}
      <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

        {/* ── Left: question + answer ── */}
        <div className="space-y-5">

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div key={currentIndex}
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="relative rounded-3xl border border-white/8 p-7 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 100%)' }}>
              <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-indigo-500 opacity-8 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 uppercase tracking-widest">
                    Question {currentIndex + 1} / {total}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-500">Open-ended</span>
                </div>
                <p className="text-xl font-semibold text-white leading-relaxed">{question.question}</p>
                {question.expectedKeyPoints?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <p className="w-full text-xs text-slate-500 uppercase tracking-wider">Key points to cover:</p>
                    {question.expectedKeyPoints.map((kp, i) => (
                      <span key={i} className="rounded-full border border-white/8 px-3 py-1 text-xs text-slate-400">{kp}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Input mode toggle */}
          <div className="flex items-center gap-2">
            <div className="flex rounded-2xl border border-white/8 p-1 gap-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {[{ id: 'text', label: '⌨ Type', }, { id: 'voice', label: '🎙 Voice', disabled: !hasSupport }].map(({ id, label, disabled }) => (
                <button key={id} disabled={disabled} onClick={() => { if (isListening) stopListening(); setInputMode(id); }}
                  className={`rounded-xl px-4 py-2 text-xs font-medium transition-all ${inputMode === id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed'}`}>
                  {label}{disabled ? ' (unavailable)' : ''}
                </button>
              ))}
            </div>
            {wordCount > 0 && (
              <span className="text-xs text-slate-500">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
            )}
            {currentAns && (
              <button onClick={clearAnswer} className="ml-auto text-xs text-slate-500 hover:text-red-400 transition-colors">Clear answer</button>
            )}
          </div>

          {/* Answer area */}
          <div className="relative">
            {inputMode === 'text' ? (
              <textarea
                ref={textareaRef}
                value={currentAns}
                onChange={handleTextChange}
                disabled={submitting || secondsLeft === 0}
                placeholder="Type your answer here... Use the STAR method: Situation → Task → Action → Result"
                rows={8}
                className="w-full rounded-3xl border border-white/10 px-6 py-5 text-sm text-white placeholder-slate-600 outline-none resize-none transition-all focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            ) : (
              <div className="rounded-3xl border border-white/10 min-h-[200px] p-6 flex flex-col gap-4"
                style={{ background: 'rgba(255,255,255,0.04)' }}>
                {/* voice UI */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={toggleMic}
                      disabled={submitting || secondsLeft === 0}
                      className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl transition-all ${
                        isListening
                          ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)] text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      } disabled:opacity-50`}>
                      {isListening ? '⏹' : '🎙'}
                    </motion.button>
                    <div>
                      <p className="text-sm font-medium text-white">{isListening ? 'Recording...' : 'Press to speak'}</p>
                      <p className="text-xs text-slate-500">{isListening ? 'Speak clearly into your microphone' : 'Click the mic to start recording'}</p>
                    </div>
                  </div>
                  <MicWave active={isListening} />
                </div>

                {speechError && <p className="text-xs text-red-400">{speechError}</p>}

                {/* live transcript preview */}
                {(currentAns || transcript) && (
                  <div className="rounded-2xl border border-white/6 p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Your answer</p>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {currentAns}
                      {transcript && <span className="text-indigo-400"> {transcript}</span>}
                    </p>
                  </div>
                )}

                {!currentAns && !transcript && !isListening && (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-slate-600 text-sm text-center">Your spoken answer will appear here in real-time</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button onClick={goPrev} disabled={currentIndex === 0 || submitting}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30">
              ← Previous
            </button>
            <button onClick={goNext} disabled={currentIndex === total - 1 || submitting}
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-30">
              Next →
            </button>
            <div className="flex-1" />
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
              disabled={submitting || secondsLeft === 0}
              className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {submitting
                ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting...</span>
                : `Submit Interview (${answeredCount}/${total})`}
            </motion.button>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">

          {/* Timer card */}
          <div className="rounded-3xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Time Remaining</p>
            <div className="flex items-end justify-between mb-3">
              <p className={`text-4xl font-mono font-bold ${timerColor}`}>{formatTime(secondsLeft)}</p>
              <p className="text-xs text-slate-500">{timerPct}%</p>
            </div>
            <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
              <motion.div className={`h-full rounded-full transition-colors ${secondsLeft < 300 ? 'bg-red-500' : secondsLeft < 600 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                style={{ width: `${timerPct}%` }} />
            </div>
            {secondsLeft < 300 && (
              <p className="mt-2 text-xs text-red-400">⚠ Less than 5 minutes remaining!</p>
            )}
          </div>

          {/* Progress card */}
          <div className="rounded-3xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Progress</p>
            <div className="flex justify-between text-sm text-white mb-2">
              <span>{answeredCount} answered</span>
              <span className="text-slate-500">{total - answeredCount} remaining</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/8 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((answeredCount / total) * 100)}%` }} />
            </div>
            {/* all question dots */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((_, i) => (
                <button key={i} onClick={() => switchQuestion(i)}
                  className={`rounded-xl py-2 text-xs font-medium transition-all border ${
                    i === currentIndex ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : answers[i]?.answerText?.trim() ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/8 text-slate-500 hover:border-white/20'
                  }`}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="rounded-3xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">💡 Tips</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span>Use the STAR method for behavioural questions.</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span>Aim for 3–5 sentences per answer.</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span>Cover all key points shown on the question card.</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span>Voice mode transcribes in real-time — speak clearly.</li>
              <li className="flex items-start gap-2"><span className="text-indigo-400 mt-0.5">→</span>You can revisit any question before submitting.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ResumeUpload from '../components/ResumeUpload.jsx';
import StartInterviewModal from '../components/StartInterviewModal.jsx';
import { DashboardSkeleton, HistoryTableSkeleton } from '../components/Skeleton.jsx';
import {
  ResponsiveContainer, LineChart, Line, Area, AreaChart,
  XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';

/* ── Animation variants ── */
const pageVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, staggerChildren: 0.08 } },
  exit:   { opacity: 0, transition: { duration: 0.2 } },
};
const cardVariants = {
  hidden:   { opacity: 0, y: 28 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

/* ── Custom recharts tooltip ── */
function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const color = val >= 8 ? '#34d399' : val >= 5 ? '#fbbf24' : '#f87171';
  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: 'rgba(15,13,38,0.97)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
      <div className="px-4 pb-3 flex items-end gap-1.5">
        <p className="text-2xl font-bold" style={{ color }}>{val}</p>
        <p className="text-slate-500 text-sm mb-0.5">/ 10</p>
      </div>
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}60, ${color})` }} />
    </div>
  );
}

/* ── Bar tooltip ── */
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="rounded-2xl border border-white/10 shadow-2xl overflow-hidden" style={{ background: 'rgba(15,13,38,0.97)', backdropFilter: 'blur(12px)' }}>
      <div className="px-4 pt-3 pb-1">
        <p className="text-xs font-medium text-slate-400 capitalize">{label}</p>
      </div>
      <div className="px-4 pb-3 flex items-end gap-1.5">
        <p className="text-2xl font-bold text-violet-400">{val}</p>
        <p className="text-slate-500 text-sm mb-0.5">avg / 10</p>
      </div>
      <div className="h-1 w-full bg-gradient-to-r from-violet-500 to-indigo-400" />
    </div>
  );
}

/* ── Metric card ── */
function MetricCard({ label, value, icon, gradient, delay = 0 }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className="relative overflow-hidden rounded-3xl p-6 border border-white/8 cursor-default"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      {/* gradient blob */}
      <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${gradient}`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-2xl">{icon}</span>
          <div className={`h-2 w-2 rounded-full ${gradient} opacity-80`} />
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-widest text-slate-400">{label}</p>
      </div>
    </motion.div>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }) {
  const map = {
    graded:    { label: 'Graded',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
    submitted: { label: 'Submitted', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    pending:   { label: 'Pending',   cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  };
  const { label, cls } = map[status] || map.pending;
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
  );
}

/* ── Score badge ── */
function ScoreBadge({ score }) {
  if (score == null) return <span className="text-slate-500 text-sm">—</span>;
  const color = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-base font-bold ${color}`}>{score}<span className="text-xs text-slate-500">/10</span></span>;
}

export default function Dashboard() {
  const { user, logout, token } = useAuth();
  const [showModal, setShowModal]         = useState(false);
  const [history, setHistory]             = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError]                 = useState('');
  const [activeTab, setActiveTab]         = useState('overview');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingHistory(true);
      setError('');
      try {
        const res  = await fetch('/api/interviews/history', { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        if (!mounted) return;
        setHistory(data.sessions || []);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load history');
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [token]);

  const completedSessions = useMemo(() => history.filter((s) => s.status !== 'pending'), [history]);

  // ── Streak: count consecutive days with at least one session up to today ──
  const streak = useMemo(() => {
    if (!history.length) return 0;
    const days = new Set(
      history.map((s) => new Date(s.createdAt).toLocaleDateString('en-CA')) // YYYY-MM-DD
    );
    let count = 0;
    const d = new Date();
    while (true) {
      const key = d.toLocaleDateString('en-CA');
      if (!days.has(key)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [history]);

  const scoreValues = useMemo(() =>
    completedSessions.map((s) => ({
      date:  new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      score: s.evaluationResult?.overallScore ?? 0,
      label: s.jobTitle || 'Interview',
    })),
    [completedSessions]
  );

  const avgScore = useMemo(() => {
    const scores = completedSessions.map((s) => s.evaluationResult?.overallScore).filter((s) => typeof s === 'number');
    if (!scores.length) return 'N/A';
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  }, [completedSessions]);

  const trend = useMemo(() => {
    if (scoreValues.length < 2) return null;
    return scoreValues[scoreValues.length - 1].score >= scoreValues[0].score ? 'up' : 'down';
  }, [scoreValues]);

  const bestScore = useMemo(() => {
    const scores = completedSessions.map((s) => s.evaluationResult?.overallScore).filter((s) => typeof s === 'number');
    return scores.length ? Math.max(...scores) : null;
  }, [completedSessions]);

  const questionTypeData = useMemo(() => {
    const buckets = {};
    history.forEach((s) => {
      const questionMap = {};
      (s.questions || []).forEach((q) => { questionMap[String(q.id ?? q._id)] = q; });
      (s.evaluationResult?.evaluations || []).forEach((ev) => {
        const q = questionMap[String(ev.questionId)];
        const k = (q?.type || 'unknown').replace(/-/g, ' ');
        if (!buckets[k]) buckets[k] = { total: 0, count: 0 };
        buckets[k].total += Number(ev.score || 0);
        buckets[k].count += 1;
      });
    });
    return Object.entries(buckets).map(([type, d]) => ({ type, value: d.count ? Number((d.total / d.count).toFixed(1)) : 0 }));
  }, [history]);

  const tableRows = history.slice(0, 8);

  const metrics = [
    { label: 'Total Sessions',   value: history.length,                                            icon: '🎯', gradient: 'bg-indigo-500' },
    { label: 'Completed',        value: completedSessions.length,                                   icon: '✅', gradient: 'bg-emerald-500' },
    { label: 'Avg Score',        value: avgScore,                                                   icon: '📊', gradient: 'bg-amber-500' },
    { label: 'Best Score',       value: bestScore != null ? `${bestScore}/10` : 'N/A',             icon: '🏆', gradient: 'bg-purple-500' },
    { label: 'Day Streak',       value: streak > 0 ? `${streak} 🔥` : '0',                        icon: '🔥', gradient: 'bg-orange-500' },
  ];

  if (loadingHistory) return <DashboardSkeleton />;

  return (
    <div className="min-h-screen bg-[#070614] bg-grid text-white">
      {/* Orbs */}
      <div className="orb orb-1" style={{ opacity: 0.18 }} />
      <div className="orb orb-2" style={{ opacity: 0.15 }} />

      {/* ── Top Nav ── */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 border-b border-white/6"
        style={{ background: 'rgba(7,6,20,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-glow-sm">AI</div>
            <span className="font-semibold text-white tracking-tight hidden sm:block">Interview Coach</span>
          </div>

          {/* Nav tabs */}
          <nav className="flex items-center gap-1 rounded-2xl p-1 border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {['overview', 'history', 'resume'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-xs font-medium capitalize transition-all duration-200 ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white shadow-glow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowModal(true)}
              className="btn-primary hidden sm:flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              <span>+</span> New Interview
            </motion.button>
            <a href="/profile" className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm hover:shadow-glow-sm transition-shadow">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </a>
          </div>
        </div>
      </motion.header>

      <motion.main
        className="mx-auto max-w-7xl px-6 py-10 space-y-8"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >

        {/* ── Hero banner ── */}
        <motion.div variants={cardVariants} className="relative overflow-hidden rounded-3xl border border-white/8 p-8"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.08) 100%)' }}>
          <div className="absolute inset-0 bg-grid opacity-30" />
          {/* glow blob */}
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-600 opacity-10 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-48 w-48 rounded-full bg-purple-600 opacity-10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">Dashboard</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
              </h1>
              <p className="mt-2 text-slate-400 max-w-lg text-sm">
                {completedSessions.length > 0
                  ? `You've completed ${completedSessions.length} interview${completedSessions.length > 1 ? 's' : ''}. ${trend === 'up' ? '📈 Your scores are trending up!' : trend === 'down' ? 'Keep practising to improve.' : ''}`
                  : 'Start your first mock interview to track your progress.'}
              </p>
              {streak > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 300 }}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-2"
                >
                  <span className="text-xl">🔥</span>
                  <div>
                    <span className="text-orange-300 font-bold text-sm">{streak} day streak!</span>
                    <span className="text-slate-400 text-xs ml-2">Keep it going — practice daily.</span>
                  </div>
                </motion.div>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white">
                ⚡ Start Interview
              </motion.button>
              <button onClick={logout}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-400 hover:text-white hover:border-white/20 transition-all">
                Sign out
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Metrics grid ── */}
        <motion.div variants={cardVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((m, i) => <MetricCard key={m.label} {...m} delay={i * 0.08} />)}
        </motion.div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="space-y-6">

              {/* Charts row */}
              <div className="grid gap-6 xl:grid-cols-[1.7fr_1.3fr]">

                {/* ── Area / Line chart ── */}
                <motion.div variants={cardVariants} className="rounded-3xl border border-white/8 p-6 relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {/* background glow */}
                  <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-indigo-600 opacity-8 blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-base font-semibold text-white">Score Over Time</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Performance trajectory across sessions</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {trend === 'up' && (
                        <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                          ↑ Improving
                        </span>
                      )}
                      {trend === 'down' && (
                        <span className="flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400">
                          ↓ Review needed
                        </span>
                      )}
                      <span className="rounded-full border border-white/8 px-3 py-1 text-xs text-slate-500">{scoreValues.length} pts</span>
                    </div>
                  </div>

                  {/* avg reference line label */}
                  {scoreValues.length > 0 && avgScore !== 'N/A' && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-px flex-1 bg-white/5" />
                      <span className="text-xs text-slate-500">avg <span className="text-indigo-400 font-semibold">{avgScore}</span> / 10</span>
                      <div className="h-px flex-1 bg-white/5" />
                    </div>
                  )}

                  <div className="h-64">
                    {scoreValues.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={scoreValues} margin={{ top: 8, right: 8, left: -28, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.45} />
                              <stop offset="60%"  stopColor="#6366f1" stopOpacity={0.1} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%"   stopColor="#818cf8" />
                              <stop offset="50%"  stopColor="#a78bfa" />
                              <stop offset="100%" stopColor="#38bdf8" />
                            </linearGradient>
                            <filter id="glow">
                              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                            </filter>
                          </defs>
                          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false}
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                            dy={6} />
                          <YAxis domain={[0, 10]} tickCount={6} axisLine={false} tickLine={false}
                            tick={{ fill: '#475569', fontSize: 10 }} />
                          {avgScore !== 'N/A' && (
                            <ReferenceLine y={parseFloat(avgScore)} stroke="rgba(99,102,241,0.35)"
                              strokeDasharray="4 4" strokeWidth={1.5} />
                          )}
                          <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }} />
                          <Area type="monotoneX" dataKey="score"
                            stroke="url(#lineGrad)" strokeWidth={2.5}
                            fill="url(#areaGrad)"
                            dot={false}
                            activeDot={{ r: 5, fill: '#818cf8', stroke: '#070614', strokeWidth: 2, filter: 'url(#glow)' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl">📊</div>
                        <p className="text-slate-500 text-sm">No scored sessions yet</p>
                        <button onClick={() => setShowModal(true)}
                          className="text-indigo-400 text-xs hover:text-indigo-300 transition-colors border border-indigo-500/25 rounded-full px-4 py-1.5">
                          Start first interview →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mini sparkline stats under chart */}
                  {scoreValues.length > 1 && (
                    <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4">
                      {[
                        { label: 'First',   val: scoreValues[0].score },
                        { label: 'Latest',  val: scoreValues[scoreValues.length - 1].score },
                        { label: 'Best',    val: bestScore },
                      ].map(({ label, val }) => {
                        const c = val >= 8 ? 'text-emerald-400' : val >= 5 ? 'text-amber-400' : 'text-red-400';
                        return (
                          <div key={label} className="text-center">
                            <p className={`text-lg font-bold ${c}`}>{val ?? '—'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* ── Bar chart ── */}
                <motion.div variants={cardVariants} className="rounded-3xl border border-white/8 p-6 relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-violet-600 opacity-8 blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-base font-semibold text-white">By Category</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Average score per question type</p>
                    </div>
                    <span className="rounded-full border border-white/8 px-3 py-1 text-xs text-slate-500">{questionTypeData.length} types</span>
                  </div>

                  <div className="h-64">
                    {questionTypeData.length ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={questionTypeData} margin={{ top: 8, right: 8, left: -28, bottom: 24 }} barCategoryGap="30%">
                          <defs>
                            {questionTypeData.map((_, i) => {
                              const hue = 240 + i * 35;
                              return (
                                <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%"   stopColor={`hsl(${hue},80%,70%)`} stopOpacity={0.95} />
                                  <stop offset="100%" stopColor={`hsl(${hue},70%,55%)`} stopOpacity={0.8} />
                                </linearGradient>
                              );
                            })}
                          </defs>
                          <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="type"
                            tick={{ fill: '#475569', fontSize: 10, fontWeight: 500 }}
                            axisLine={false} tickLine={false}
                            angle={-20} textAnchor="end" height={48} dy={4} />
                          <YAxis domain={[0, 10]} tickCount={6} axisLine={false} tickLine={false}
                            tick={{ fill: '#475569', fontSize: 10 }} />
                          <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 8 }} />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                            {questionTypeData.map((entry, i) => (
                              <Cell key={`cell-${i}`} fill={`url(#barGrad${i})`} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl">🗂️</div>
                        <p className="text-slate-500 text-sm">No category data yet</p>
                      </div>
                    )}
                  </div>

                  {/* Category legend */}
                  {questionTypeData.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-4">
                      {questionTypeData.map((d, i) => {
                        const hue = 240 + i * 35;
                        return (
                          <div key={d.type} className="flex items-center gap-1.5">
                            <div className="h-2 w-2 rounded-full" style={{ background: `hsl(${hue},75%,65%)` }} />
                            <span className="text-xs text-slate-500 capitalize">{d.type}</span>
                            <span className="text-xs font-semibold" style={{ color: `hsl(${hue},75%,65%)` }}>{d.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Quick stats */}
              {completedSessions.length > 0 && (
                <motion.div variants={cardVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Best session',  value: bestScore != null ? `${bestScore}/10` : '—', icon: '🏆' },
                    { label: 'Avg score',     value: avgScore !== 'N/A' ? `${avgScore}/10` : '—', icon: '📈' },
                    { label: 'Sessions done', value: completedSessions.length, icon: '✅' },
                    { label: 'Day streak',    value: streak > 0 ? `${streak} 🔥` : '—', icon: '🔥' },
                  ].map((s) => (
                    <div key={s.label} className="rounded-2xl border border-white/8 p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <div className="text-2xl mb-2">{s.icon}</div>
                      <p className="text-xl font-bold text-white">{s.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="rounded-3xl border border-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Interview History</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{history.length} total sessions</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
                    className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold text-white">
                    + New
                  </motion.button>
                </div>

                {loadingHistory ? (
                  <HistoryTableSkeleton />
                ) : tableRows.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/6 text-xs uppercase tracking-widest text-slate-500">
                          <th className="px-6 py-4 text-left font-medium">Date</th>
                          <th className="px-6 py-4 text-left font-medium">Role</th>
                          <th className="px-6 py-4 text-left font-medium">Score</th>
                          <th className="px-6 py-4 text-left font-medium">Status</th>
                          <th className="px-6 py-4 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableRows.map((session, i) => (
                          <motion.tr
                            key={session._id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="border-b border-white/4 hover:bg-white/3 transition-colors group"
                          >
                            <td className="px-6 py-4 text-slate-400 text-xs">{new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                            <td className="px-6 py-4 font-medium text-white capitalize">{session.jobTitle}</td>
                            <td className="px-6 py-4"><ScoreBadge score={session.evaluationResult?.overallScore} /></td>
                            <td className="px-6 py-4"><StatusBadge status={session.status} /></td>
                            <td className="px-6 py-4">
                              <a href={`/results/${session._id}`}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all">
                                View Results →
                              </a>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <span className="text-5xl">🎯</span>
                    <p className="text-white font-semibold">No interviews yet</p>
                    <p className="text-slate-500 text-sm">Start your first mock interview to see your history here.</p>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowModal(true)}
                      className="btn-primary mt-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white">
                      Start Interview
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* RESUME TAB */}
          {activeTab === 'resume' && (
            <motion.div key="resume" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
              <div className="rounded-3xl border border-white/8 p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white">Resume</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Upload your resume to generate tailored interview questions</p>
                </div>
                <ResumeUpload onContinue={() => { setActiveTab('overview'); setShowModal(true); }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-sm text-red-400">
            {error}
          </motion.div>
        )}
      </motion.main>

      <StartInterviewModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

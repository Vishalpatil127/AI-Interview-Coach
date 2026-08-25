import { useAuth } from '../context/AuthContext.jsx';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ResumeUpload from '../components/ResumeUpload.jsx';
import StartInterviewModal from '../components/StartInterviewModal.jsx';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

const pageVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: 'easeIn' } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

function MetricCard({ label, value, description, accent }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${accent}`}>{description}</div>
      </div>
    </motion.div>
  );
}

function Dashboard() {
  const { user, logout, token } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingHistory(true);
      setError('');
      try {
        const res = await fetch('/api/interviews/history', {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
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

  const completedSessions = useMemo(() => history.filter((session) => session.status !== 'pending'), [history]);
  const scoreValues = useMemo(
    () => completedSessions.map((session) => ({
      date: new Date(session.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      score: session.evaluationResult?.overallScore ?? 0,
      label: session.jobTitle || 'Interview',
    })),
    [completedSessions]
  );

  const avgScore = useMemo(() => {
    const scores = completedSessions.map((session) => session.evaluationResult?.overallScore).filter((score) => typeof score === 'number');
    if (!scores.length) return 'N/A';
    return (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1);
  }, [completedSessions]);

  const trend = useMemo(() => {
    if (scoreValues.length < 2) return 'N/A';
    const first = scoreValues[0].score;
    const last = scoreValues[scoreValues.length - 1].score;
    return last >= first ? 'Upward trend' : 'Needs improvement';
  }, [scoreValues]);

  const questionTypeData = useMemo(() => {
    const buckets = {};
    history.forEach((session) => {
      const evaluations = session.evaluationResult?.evaluations || [];
      // Build a lookup map once per session — O(n) instead of O(n*m)
      const questionMap = {};
      (session.questions || []).forEach((q) => {
        questionMap[String(q.id ?? q._id)] = q;
      });
      evaluations.forEach((evaluation) => {
        const question = questionMap[String(evaluation.questionId)];
        const typeKey = (question?.type || 'unknown').replace(/-/g, ' ');
        if (!buckets[typeKey]) buckets[typeKey] = { total: 0, count: 0 };
        buckets[typeKey].total += Number(evaluation.score || 0);
        buckets[typeKey].count += 1;
      });
    });
    return Object.entries(buckets).map(([type, data]) => ({ type, value: data.count ? Number((data.total / data.count).toFixed(1)) : 0 }));
  }, [history]);

  const tableRows = history.slice(0, 6);

  return (
    <motion.div
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <motion.section variants={cardVariants} className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Interview Performance</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">Welcome back{user?.name ? `, ${user.name}` : ''}</h1>
              <p className="mt-4 max-w-2xl text-slate-600">Track your progress over time, compare performance across question types, and jump into results instantly.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setShowModal(true)}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-slate-200 transition hover:bg-slate-800"
              >
                Start New Mock Interview
              </button>
              <a
                href="/profile"
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Edit profile
              </a>
              <button
                onClick={logout}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total Interviews" value={history.length} description="Total" accent="bg-sky-100 text-slate-950" />
            <MetricCard label="Submitted sessions" value={completedSessions.length} description="Completed" accent="bg-emerald-100 text-slate-950" />
            <MetricCard label="Average score" value={avgScore} description="Average" accent="bg-amber-100 text-slate-950" />
            <MetricCard label="Trend" value={trend} description="Insight" accent="bg-violet-100 text-slate-950" />
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="grid gap-6 xl:grid-cols-[1.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Performance Over Time</h2>
                <p className="mt-2 text-sm text-slate-600">Track your score trajectory across submitted mock interviews.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{scoreValues.length} scored sessions</span>
            </div>
            <div className="mt-6 h-[320px] rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {scoreValues.length ? (
                <ResponsiveContainer>
                  <LineChart data={scoreValues} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis domain={[0, 10]} tickCount={6} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0' }} labelStyle={{ color: '#0f172a' }} itemStyle={{ color: '#0f172a' }} />
                    <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#ffffff' }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                  No scored sessions available yet.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Type Performance</h2>
                <p className="mt-2 text-sm text-slate-600">Average performance by question category.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{questionTypeData.length} categories</span>
            </div>
            <div className="mt-6 h-[320px] rounded-3xl border border-slate-200 bg-slate-50 p-4">
              {questionTypeData.length ? (
                <ResponsiveContainer>
                  <BarChart data={questionTypeData} margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" vertical={false} />
                    <XAxis dataKey="type" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis domain={[0, 10]} tickCount={6} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0' }} labelStyle={{ color: '#0f172a' }} itemStyle={{ color: '#0f172a' }} formatter={(value) => `${value} / 10`} />
                    <Bar dataKey="value" fill="#fb923c" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
                  No question type data yet.
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Recent Interviews</h2>
              <p className="mt-2 text-sm text-slate-600">Review the most recent mock interviews and jump straight to results.</p>
            </div>
            <div className="text-sm text-slate-500">Latest {tableRows.length} sessions</div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border border-slate-200 bg-slate-50">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tableRows.length ? tableRows.map((session) => (
                  <tr key={session._id} className="hover:bg-slate-100">
                    <td className="px-4 py-4 text-slate-600">{new Date(session.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-4 text-slate-900 capitalize">{session.jobTitle}</td>
                    <td className="px-4 py-4 text-slate-900">{session.evaluationResult?.overallScore ?? 'N/A'}</td>
                    <td className="px-4 py-4 text-slate-900">{session.status}</td>
                    <td className="px-4 py-4">
                      <a href={`/results/${session._id}`} className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800">
                        View Results
                      </a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-500">No interview history available yet. Start a new mock interview to populate your dashboard.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section variants={cardVariants} className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">Resume Status</h2>
          <p className="mt-2 text-sm text-slate-600">Keep your resume ready to auto-generate interview questions tailored to your skill set.</p>
          <div className="mt-6">
            <ResumeUpload onContinue={() => setShowModal(true)} />
          </div>
        </motion.section>

        <StartInterviewModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </div>
    </motion.div>
  );
}

export default Dashboard;

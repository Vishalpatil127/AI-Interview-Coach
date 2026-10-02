import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const validateEmail = (v) => /\S+@\S+\.\S+/.test(v);

const features = [
  { icon: '🧠', label: 'AI-Powered Questions',  desc: 'Tailored to your role and resume' },
  { icon: '⚡', label: 'Instant Feedback',       desc: 'Know your score the moment you submit' },
  { icon: '📈', label: 'Track Progress',         desc: 'Visual trends across every session' },
];

const stats = [
  { value: '15', label: 'Questions/session' },
  { value: '10', label: 'Max score' },
  { value: '∞',  label: 'Practice rounds' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.09 } },
};

export default function Login() {
  const { login } = useAuth();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email || !form.password) { setError('Email and password are required.'); return; }
    if (!validateEmail(form.email))    { setError('Please enter a valid email address.'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || res.statusText }; }
      if (!res.ok) throw new Error(data.message || 'Login failed');
      login({ token: data.token, user: data.user || { email: form.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (response) => {
    setError('');
    if (!response?.credential) { setError('Google sign-in failed. Please try again.'); return; }
    try {
      const res  = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: response.credential }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google sign-in failed');
      login({ token: data.token, user: data.user });
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="min-h-screen bg-[#070614] bg-grid flex overflow-hidden">
      {/* ── Floating orbs ── */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* ── Left panel (hero) ── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[52%] flex-col justify-between px-14 py-14 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">AI</div>
          <span className="text-white font-semibold text-lg tracking-tight">Interview Coach</span>
        </div>

        {/* Hero copy */}
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">
          <motion.div variants={fadeUp}>
            <p className="text-indigo-400 text-sm font-medium tracking-widest uppercase mb-4">Your AI-powered career partner</p>
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-[1.1] tracking-tight">
              Ace every<br />
              <span className="gradient-text">interview</span><br />
              with confidence.
            </h1>
          </motion.div>

          <motion.p variants={fadeUp} className="text-slate-400 text-lg leading-relaxed max-w-md">
            Practice with AI-generated role-specific questions, get instant scored feedback, and track your improvement over time.
          </motion.p>

          {/* Feature pills */}
          <motion.div variants={stagger} className="flex flex-col gap-3">
            {features.map((f) => (
              <motion.div key={f.label} variants={fadeUp} className="feature-pill flex items-center gap-4 rounded-2xl px-5 py-4">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="text-white font-medium text-sm">{f.label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats row */}
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4 pt-2">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold gradient-text">{s.value}</p>
                <p className="text-slate-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom quote */}
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-slate-600 text-sm italic">
          "The best preparation for tomorrow is doing your best today."
        </motion.p>
      </motion.div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut', delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Card */}
          <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/40">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
              <span className="text-white font-semibold">Interview Coach</span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-400 text-sm mb-7">Sign in to continue your prep journey.</p>

            {/* Google */}
            <div className="mb-5">
              <GoogleSignInButton onSuccess={handleGoogleSignIn} onError={setError} />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-slate-500 text-xs uppercase tracking-widest">or email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
                <div className={`relative rounded-2xl transition-all duration-200 ${focused === 'email' ? 'ring-2 ring-indigo-500/40' : ''}`}>
                  <input
                    name="email" type="email" value={form.email}
                    onChange={handleChange}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused('')}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:border-indigo-500/60 focus:bg-white/12"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Forgot?</Link>
                </div>
                <div className={`relative rounded-2xl transition-all duration-200 ${focused === 'password' ? 'ring-2 ring-indigo-500/40' : ''}`}>
                  <input
                    name="password" type="password" value={form.password}
                    onChange={handleChange}
                    onFocus={() => setFocused('password')}
                    onBlur={() => setFocused('')}
                    placeholder="Enter your password"
                    className="w-full rounded-2xl bg-white/8 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:border-indigo-500/60 focus:bg-white/12"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit" disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in →'}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          {/* Trust line */}
          <p className="text-center text-slate-600 text-xs mt-5">
            🔒 Secure · No credit card required · Free forever
          </p>
        </motion.div>
      </div>
    </div>
  );
}

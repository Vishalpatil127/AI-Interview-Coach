import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const validateEmail = (v) => /\S+@\S+\.\S+/.test(v);

const steps = [
  { icon: '📄', title: 'Upload Resume',       desc: 'We extract your skills & experience automatically.' },
  { icon: '🤖', title: 'AI Generates Quiz',   desc: '15 role-tailored questions in seconds.' },
  { icon: '🏆', title: 'Get Scored Instantly',desc: 'Detailed feedback with correct answers and tips.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0 },
};
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1 } },
};

export default function Register() {
  const { login } = useAuth();
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirmPassword: '' });
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
    if (!form.email || !form.password || !form.confirmPassword) { setError('All fields are required.'); return; }
    if (!validateEmail(form.email))             { setError('Please enter a valid email address.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8)               { setError('Password must be at least 8 characters.'); return; }

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: form.name, email: form.email, password: form.password }) });
      const text = await res.text();
      let data;
      try { data = text ? JSON.parse(text) : {}; } catch { data = { message: text || res.statusText }; }
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      login({ token: data.token, user: data.user || { name: form.name, email: form.email } });
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

  const fields = [
    { name: 'name',            type: 'text',     placeholder: 'Jane Doe',            label: 'Full Name' },
    { name: 'email',           type: 'email',    placeholder: 'you@example.com',     label: 'Email' },
    { name: 'password',        type: 'password', placeholder: 'Min. 8 characters',   label: 'Password' },
    { name: 'confirmPassword', type: 'password', placeholder: 'Confirm your password',label: 'Confirm Password' },
  ];

  return (
    <div className="min-h-screen bg-[#070614] bg-grid flex overflow-hidden">
      {/* Orbs */}
      <div className="orb orb-1" style={{ top: '20%', left: '-5%' }} />
      <div className="orb orb-2" style={{ bottom: '10%', right: '-8%' }} />
      <div className="orb orb-3" style={{ top: '-5%', right: '30%' }} />

      {/* ── Left panel (form) ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
            <span className="text-white font-semibold">Interview Coach</span>
          </div>

          <div className="glass rounded-3xl p-8 shadow-2xl shadow-black/40">
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-slate-400 text-sm mb-7">Start practising smarter — it's completely free.</p>

            {/* Google */}
            <div className="mb-5">
              <GoogleSignInButton onSuccess={handleGoogleSignIn} onError={setError} />
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-slate-500 text-xs uppercase tracking-widest">or email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {fields.slice(0, 2).map((f) => (
                  <div key={f.name} className={f.name === 'name' ? '' : ''}>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                    <div className={`rounded-2xl transition-all duration-200 ${focused === f.name ? 'ring-2 ring-indigo-500/40' : ''}`}>
                      <input
                        name={f.name} type={f.type} value={form[f.name]}
                        onChange={handleChange}
                        onFocus={() => setFocused(f.name)}
                        onBlur={() => setFocused('')}
                        placeholder={f.placeholder}
                        className="w-full rounded-2xl border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:border-indigo-500/60"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {fields.slice(2).map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">{f.label}</label>
                  <div className={`rounded-2xl transition-all duration-200 ${focused === f.name ? 'ring-2 ring-indigo-500/40' : ''}`}>
                    <input
                      name={f.name} type={f.type} value={form[f.name]}
                      onChange={handleChange}
                      onFocus={() => setFocused(f.name)}
                      onBlur={() => setFocused('')}
                      placeholder={f.placeholder}
                      className="w-full rounded-2xl border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm outline-none transition-all duration-200 focus:border-indigo-500/60"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                  </div>
                </div>
              ))}

              <motion.button
                type="submit" disabled={loading}
                whileTap={{ scale: 0.98 }}
                className="btn-primary w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Creating account...
                  </span>
                ) : 'Create free account →'}
              </motion.button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          <p className="text-center text-slate-600 text-xs mt-5">
            🔒 Secure · No credit card required · Free forever
          </p>
        </motion.div>
      </div>

      {/* ── Right panel (how it works) ── */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-[48%] flex-col justify-between px-14 py-14 relative z-10"
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">AI</div>
          <span className="text-white font-semibold text-lg tracking-tight">Interview Coach</span>
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-10">
          <motion.div variants={fadeUp}>
            <p className="text-indigo-400 text-sm font-medium tracking-widest uppercase mb-4">How it works</p>
            <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.15] tracking-tight">
              Three steps to<br />
              <span className="gradient-text-green">interview ready.</span>
            </h2>
          </motion.div>

          <motion.div variants={stagger} className="space-y-5">
            {steps.map((s, i) => (
              <motion.div key={s.title} variants={fadeUp}
                className="feature-pill flex items-start gap-5 rounded-2xl px-6 py-5 group hover:border-indigo-500/30 transition-colors duration-300">
                <div className="flex-shrink-0 h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                  {s.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Step {i + 1}</span>
                  </div>
                  <p className="text-white font-semibold text-base">{s.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div variants={fadeUp} className="feature-pill rounded-2xl px-6 py-4 flex items-center gap-4">
            <div className="flex -space-x-2">
              {['🧑‍💻','👩‍💼','👨‍🔬','👩‍🎨'].map((e, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm border-2 border-[#070614]">{e}</div>
              ))}
            </div>
            <p className="text-slate-400 text-sm"><span className="text-white font-semibold">Join hundreds</span> already practising smarter</p>
          </motion.div>
        </motion.div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="text-slate-600 text-sm italic">
          "By failing to prepare, you are preparing to fail." — Benjamin Franklin
        </motion.p>
      </motion.div>
    </div>
  );
}

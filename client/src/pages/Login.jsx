import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);

function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Email and password are required.');
      return;
    }
    if (!validateEmail(form.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text || response.statusText };
      }

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      login({ token: data.token, user: data.user || { email: form.email } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (response) => {
    setError('');
    if (!response?.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }

    try {
      const fetchResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential }),
      });

      const data = await fetchResponse.json();
      if (!fetchResponse.ok) {
        throw new Error(data.message || 'Google sign-in failed');
      }

      login({ token: data.token, user: data.user });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleError = (message) => {
    setError(message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200/50">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Sign in</h1>
        <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the dashboard.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <GoogleSignInButton onSuccess={handleGoogleSignIn} onError={handleGoogleError} />

          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs uppercase tracking-[0.3em]">or sign in with email</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="you@example.com"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              placeholder="Enter your password"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-500">
          <Link to="/forgot-password" className="font-medium text-sky-600 hover:text-sky-700">
            Forgot password?
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don’t have an account?{' '}
          <Link to="/register" className="font-medium text-sky-600 hover:text-sky-700">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

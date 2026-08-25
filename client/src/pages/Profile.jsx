import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function Profile() {
  const { token, user, login, logout } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '', headline: '', location: '', bio: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/auth/profile', {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load profile');
        if (mounted) {
          setProfile(data.user);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadProfile();
    return () => { mounted = false; };
  }, [token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');
      setMessage('Profile updated successfully.');
      login({ token, user: data.user });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">My Profile</h1>
            <p className="mt-2 text-slate-600">Update your profile details and contact information.</p>
          </div>
          <button onClick={logout} className="rounded-2xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
            Sign out
          </button>
        </div>

        {error && <div className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}

        <form onSubmit={handleSave} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input name="name" value={profile.name} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input name="email" value={profile.email} disabled className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500" />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Headline
              <input name="headline" value={profile.headline} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Location
              <input name="location" value={profile.location} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Phone
            <input name="phone" value={profile.phone} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Bio
            <textarea name="bio" value={profile.bio} onChange={handleChange} rows="4" className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" disabled={saving || loading} className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70">
              {saving ? 'Saving...' : 'Save profile'}
            </button>
            <button type="button" onClick={() => setProfile({ ...profile, name: profile.name, email: profile.email, headline: profile.headline, location: profile.location, bio: profile.bio, phone: profile.phone })} className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50">
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Profile;

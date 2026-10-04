import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Profile() {
  const { token, user, login, logout } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: '', email: '', headline: '', location: '', bio: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [focused, setFocused] = useState('');

  useEffect(() => {
    let mounted = true;
    async function loadProfile() {
      setLoading(true);
      try {
        const res  = await fetch('/api/auth/profile', { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load profile');
        if (mounted) setProfile(data.user);
      } catch (err) {
        if (mounted) toast.error('Could not load profile', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProfile();
    return () => { mounted = false; };
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((p) => ({ ...p, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save profile');
      login({ token, user: data.user });
      toast.success('Profile saved', 'Your details have been updated successfully.');
    } catch (err) {
      toast.error('Save failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { name: 'name',     label: 'Full Name',  type: 'text',  placeholder: 'Jane Doe',          col: 1 },
    { name: 'email',    label: 'Email',       type: 'email', placeholder: '',                  col: 1, disabled: true },
    { name: 'headline', label: 'Headline',    type: 'text',  placeholder: 'Senior Engineer',   col: 1 },
    { name: 'location', label: 'Location',    type: 'text',  placeholder: 'Mumbai, India',     col: 1 },
    { name: 'phone',    label: 'Phone',       type: 'tel',   placeholder: '+91 98765 43210',   col: 2 },
  ];

  return (
    <div className="min-h-screen bg-[#070614] bg-grid text-white">
      <div className="orb orb-1" style={{ opacity: 0.12 }} />
      <div className="orb orb-2" style={{ opacity: 0.10 }} />

      {/* navbar */}
      <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 border-b border-white/6"
        style={{ background: 'rgba(7,6,20,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
            <span className="font-semibold text-white tracking-tight hidden sm:block">Interview Coach</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition-all">← Dashboard</a>
            <button onClick={logout} className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:text-white transition-all">Sign out</button>
          </div>
        </div>
      </motion.header>

      <motion.main initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="mx-auto max-w-3xl px-6 py-10">

        {/* hero */}
        <div className="flex items-center gap-5 mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-glow-sm">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{user?.name || 'My Profile'}</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage your account details</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white/8 p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.03)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="h-6 w-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <span className="text-slate-500 text-sm">Loading profile...</span>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                {fields.filter((f) => f.col === 1).map((f) => (
                  <div key={f.name}>
                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                    <div className={`rounded-2xl transition-all duration-200 ${focused === f.name ? 'ring-2 ring-indigo-500/30' : ''}`}>
                      <input
                        name={f.name} type={f.type} value={profile[f.name] || ''}
                        onChange={handleChange} disabled={f.disabled}
                        onFocus={() => setFocused(f.name)} onBlur={() => setFocused('')}
                        placeholder={f.placeholder}
                        className={`w-full rounded-2xl border border-white/10 px-4 py-3 text-sm outline-none transition-all
                          ${f.disabled ? 'text-slate-500 cursor-not-allowed opacity-50' : 'text-white focus:border-indigo-500/60'}`}
                        style={{ background: f.disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* phone full width */}
              {fields.filter((f) => f.col === 2).map((f) => (
                <div key={f.name}>
                  <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">{f.label}</label>
                  <div className={`rounded-2xl transition-all duration-200 ${focused === f.name ? 'ring-2 ring-indigo-500/30' : ''}`}>
                    <input
                      name={f.name} type={f.type} value={profile[f.name] || ''}
                      onChange={handleChange}
                      onFocus={() => setFocused(f.name)} onBlur={() => setFocused('')}
                      placeholder={f.placeholder}
                      className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/60 transition-all"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    />
                  </div>
                </div>
              ))}

              {/* bio */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">Bio</label>
                <div className={`rounded-2xl transition-all duration-200 ${focused === 'bio' ? 'ring-2 ring-indigo-500/30' : ''}`}>
                  <textarea name="bio" value={profile.bio || ''} onChange={handleChange} rows={4}
                    onFocus={() => setFocused('bio')} onBlur={() => setFocused('')}
                    placeholder="Tell us a bit about yourself..."
                    className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-all resize-none"
                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => window.location.reload()}
                  className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">
                  Reset
                </button>
                <motion.button type="submit" disabled={saving || loading} whileTap={{ scale: 0.98 }}
                  className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">
                  {saving ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving...</span> : 'Save Profile'}
                </motion.button>
              </div>
            </form>
          )}
        </div>
      </motion.main>
    </div>
  );
}

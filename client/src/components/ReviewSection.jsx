import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const STARS = [5, 4, 3, 2, 1];

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {STARS.slice().reverse().map((star) => (
        <button key={star} type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="text-2xl transition-transform hover:scale-110">
          <span className={(hovered || value) >= star ? 'text-amber-400' : 'text-white/15'}>★</span>
        </button>
      ))}
      <span className="ml-2 text-sm text-slate-400">{value} / 5</span>
    </div>
  );
}

export default function ReviewSection() {
  const { token } = useAuth();
  const toast     = useToast();
  const [reviews, setReviews]   = useState([]);
  const [rating, setRating]     = useState(5);
  const [message, setMessage]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res  = await fetch('/api/reviews');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load reviews');
        if (mounted) setReviews(data.reviews || []);
      } catch (err) {
        if (mounted) toast.error('Could not load reviews', err.message);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { toast.warning('Review empty', 'Please write something before submitting.'); return; }
    setLoading(true);
    try {
      const res  = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : undefined },
        body: JSON.stringify({ rating, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');
      setReviews((prev) => [data.review, ...prev]);
      setMessage(''); setRating(5);
      toast.success('Review submitted! 🙏', 'Thanks for sharing your feedback.');
    } catch (err) {
      toast.error('Submit failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* submit form */}
      <div className="rounded-3xl border border-white/8 p-6 sm:p-8" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <h2 className="text-lg font-semibold text-white mb-1">Share your review</h2>
        <p className="text-slate-500 text-sm mb-6">Tell us what you think and help us improve.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Rating</label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Your Review</label>
            <div className={`rounded-2xl transition-all duration-200 ${focused ? 'ring-2 ring-indigo-500/30' : ''}`}>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                placeholder="Share your experience with Interview Coach..."
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500/60 transition-all resize-none"
                style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          </div>

          <motion.button type="submit" disabled={loading || !token} whileTap={{ scale: 0.98 }}
            className="btn-primary rounded-2xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed">
            {loading
              ? <span className="flex items-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Submitting...</span>
              : '✉ Submit Review'}
          </motion.button>

          {!token && <p className="text-xs text-slate-500">You must be logged in to submit a review.</p>}
        </form>
      </div>

      {/* reviews list */}
      <div className="space-y-4">
        {reviews.length ? reviews.map((review, i) => (
          <motion.div key={review._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-3xl border border-white/8 p-5" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                  {review.userName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{review.userName}</p>
                  <p className="text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <span key={j} className={`text-sm ${j < review.rating ? 'text-amber-400' : 'text-white/15'}`}>★</span>
                ))}
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{review.message}</p>
          </motion.div>
        )) : (
          <div className="rounded-3xl border border-white/8 p-10 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-3xl mb-3">💬</p>
            <p className="text-slate-500 text-sm">No reviews yet. Be the first!</p>
          </div>
        )}
      </div>
    </div>
  );
}

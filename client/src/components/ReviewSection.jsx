import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function ReviewSection() {
  const { token, user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadReviews() {
      try {
        const res = await fetch('/api/reviews');
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load reviews');
        if (mounted) setReviews(data.reviews || []);
      } catch (err) {
        if (mounted) setStatus(err.message);
      }
    }
    loadReviews();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) {
      setStatus('Please enter your review.');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: JSON.stringify({ rating, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit review');

      setStatus('Review submitted successfully.');
      setMessage('');
      setRating(5);
      setReviews((prev) => [data.review, ...prev]);
    } catch (err) {
      setStatus(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Share your review</h2>
          <p className="mt-2 text-sm text-slate-600">Tell us what you think about the site and help us improve.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">{reviews.length} reviews</span>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {status && <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{status}</div>}
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <label className="block text-sm font-medium text-slate-700">
            Rating
            <select
              value={rating}
              onChange={(event) => setRating(Number(event.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            >
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} star{value > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Your review
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows="4"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Share your experience..."
          />
        </label>

        <button
          type="submit"
          disabled={loading || !token}
          className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Submitting...' : 'Submit review'}
        </button>
      </form>

      <div className="mt-8 grid gap-4">
        {reviews.map((review) => (
          <div key={review._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="font-semibold text-slate-900">{review.userName}</p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-600">
                {review.rating} / 5
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{review.message}</p>
            <p className="mt-3 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ReviewSection;

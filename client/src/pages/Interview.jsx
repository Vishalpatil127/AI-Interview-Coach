import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function InterviewPage() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/interviews/${sessionId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || `Failed to fetch session (${res.status})`);
        }
        const data = await res.json();
        if (mounted) setSession(data);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load session');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [sessionId, token]);

  if (loading) return <div className="min-h-screen bg-slate-50 p-8">Loading interview...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200/50">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mock Interview</h1>
        <p className="mt-2 text-sm text-slate-500">Session ID: {sessionId}</p>

        <div className="mt-6 space-y-4">
          {session?.questions?.map((q) => (
            <div key={q.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">{q.type}</div>
                <div className="text-xs text-slate-500">Q#{q.id}</div>
              </div>
              <div className="mt-2 text-lg font-semibold text-slate-900">{q.question}</div>
              <div className="mt-2 text-sm text-slate-600">Expected: {q.expectedKeyPoints?.join(', ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;

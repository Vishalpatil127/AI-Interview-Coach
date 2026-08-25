import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function StatusBadge({ score }) {
  const label = score >= 8 ? 'Excellent' : score >= 5 ? 'Needs Practice' : 'Action Required';
  const tone = score >= 8 ? 'bg-emerald-500 text-slate-950' : score >= 5 ? 'bg-amber-400 text-slate-950' : 'bg-red-500 text-white';
  return <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] ${tone}`}>{label}</span>;
}

function Pill({ children, color }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${color}`}>{children}</span>
  );
}

export default function ResultsPage() {
  const { sessionId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const reportRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const [savingPdf, setSavingPdf] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function loadSession() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/interviews/${sessionId}`, {
          headers: { Authorization: token ? `Bearer ${token}` : undefined },
        });
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || `Failed to fetch session (${res.status})`);
        }
        const data = await res.json();
        if (!mounted) return;
        setSession(data.session || data);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load session');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSession();
    return () => {
      mounted = false;
    };
  }, [sessionId, token]);

  const evaluation = session?.evaluationResult || null;
  const overallScore = evaluation && typeof evaluation.overallScore === 'number' ? evaluation.overallScore : null;
  const createdAt = session?.createdAt ? new Date(session.createdAt).toLocaleString() : 'Unknown date';
  const roleLabel = session?.jobTitle || 'Target role not available';

  const loadHtml2PdfLib = async () => {
    if (window.html2pdf) return window.html2pdf;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-html2pdf]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.html2pdf));
        existing.addEventListener('error', () => reject(new Error('Failed to load html2pdf from CDN')));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      script.async = true;
      script.dataset.html2pdf = 'true';
      script.onload = () => {
        if (window.html2pdf) resolve(window.html2pdf);
        else reject(new Error('html2pdf loaded but not available on window'));
      };
      script.onerror = () => reject(new Error('Failed to load html2pdf from CDN'));
      document.body.appendChild(script);
    });
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !evaluation) return;
    setSavingPdf(true);
    try {
      const html2pdf = await loadHtml2PdfLib();

      if (!html2pdf) {
        throw new Error('Could not load html2pdf library. Please install html2pdf.js or check network access.');
      }

      const options = {
        margin: 10,
        filename: `Interview_Report_${sessionId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      await html2pdf().set(options).from(reportRef.current).save();
    } catch (err) {
      setError(err.message || 'PDF generation failed');
    } finally {
      setSavingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200/50">
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-rose-200 bg-white p-8 shadow-sm shadow-rose-100">
          <h2 className="text-2xl font-semibold text-rose-600">Unable to load results</h2>
          <p className="mt-4 text-slate-600">{error}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm shadow-slate-200 transition hover:bg-slate-50">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
          <h2 className="text-2xl font-semibold text-slate-900">Session not found</h2>
          <p className="mt-4 text-slate-600">The requested interview session could not be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm shadow-slate-200">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Interview Report</p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{session.jobTitle || 'Mock Interview Result'}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span>{createdAt}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span>{roleLabel}</span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-center shadow-sm shadow-slate-200">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Overall Score</p>
                <p className="mt-4 text-6xl font-semibold text-slate-900">{overallScore !== null ? overallScore.toFixed(1) : 'N/A'}</p>
                <p className="mt-2 text-slate-500">out of 10</p>
              </div>
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6 text-center shadow-sm shadow-slate-200">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Session status</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <StatusBadge score={overallScore ?? 0} />
                </div>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Pill color="bg-slate-900 text-slate-100">Target role</Pill>
                  <Pill color="bg-slate-900 text-slate-100">{session.experienceLevel || 'Experience unknown'}</Pill>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-50"
            >
              Back to Dashboard
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={savingPdf || !evaluation}
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition-all duration-200 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingPdf ? 'Preparing PDF...' : 'Download Report PDF'}
            </button>
          </div>
        </header>

        <main ref={reportRef} className="space-y-8">
          <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm shadow-slate-200">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Executive Summary</h2>
                <p className="mt-3 max-w-3xl text-slate-600 whitespace-pre-wrap">{evaluation?.overallSummary || 'No summary provided.'}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center text-sm text-slate-700">
                <div className="text-slate-500">Session date</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{createdAt}</div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            {evaluation?.evaluations?.length ? (
              evaluation.evaluations.map((item, index) => {
                const question = (session.questions || []).find((q) => String(q.id ?? q._id) === String(item.questionId)) || {};
                const answer = (session.userAnswers || []).find((a) => String(a.questionId ?? a.id) === String(item.questionId)) || {};
                const questionType = question.type ? question.type.replace(/-/g, ' ') : 'Unknown';
                return (
                  <div key={index} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200 transition-all duration-200 hover:-translate-y-0.5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">Question {index + 1}</span>
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-sky-700">{questionType}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900">{question.question || 'Question text not available'}</h3>
                        <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                          <span className="rounded-full bg-slate-100 px-3 py-1">Score {item.score ?? 'N/A'}</span>
                          <span className="rounded-full bg-slate-100 px-3 py-1">{question.expectedKeyPoints?.length ?? 0} key points</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800"
                      >
                        {openIndex === index ? 'Hide details' : 'View details'}
                      </button>
                    </div>

                    {openIndex === index ? (
                      <div className="mt-6 space-y-5">
                        {/* For MCQ: show all choices with selection + correct highlighted */}
                        {question.type === 'mcq' && Array.isArray(question.choices) && question.choices.length ? (
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-sm font-semibold text-slate-700">Answer Choices</div>
                            <ul className="mt-3 space-y-2">
                              {question.choices.map((choice, ci) => {
                                const isCorrect = ci === question.correctAnswer;
                                const isSelected = ci === answer.selectedIndex;
                                const base = 'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium border transition-all';
                                const style = isCorrect
                                  ? `${base} border-emerald-400 bg-emerald-50 text-slate-900`
                                  : isSelected
                                  ? `${base} border-red-300 bg-red-50 text-slate-900`
                                  : `${base} border-slate-200 bg-white text-slate-600`;
                                return (
                                  <li key={ci} className={style}>
                                    <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-emerald-500 text-white' : isSelected ? 'bg-red-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                      {String.fromCharCode(65 + ci)}
                                    </span>
                                    <span className="flex-1">{choice}</span>
                                    {isCorrect && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white">Correct</span>}
                                    {isSelected && !isCorrect && <span className="rounded-full bg-red-400 px-2 py-0.5 text-xs font-semibold text-white">Your answer</span>}
                                    {isSelected && isCorrect && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Your answer ✓</span>}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        ) : (
                          /* For open-ended: show candidate text answer */
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-sm font-semibold text-slate-700">Candidate's Answer</div>
                            <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-white p-4 text-sm leading-6 text-slate-900">
                              {answer.answerText || answer.selectedAnswer || 'Answer not provided.'}
                            </pre>
                          </div>
                        )}

                        {/* Correct answer summary row — always visible */}
                        <div className={`flex flex-col gap-3 rounded-[1.5rem] border p-5 sm:flex-row sm:items-center ${item.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                          <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                            {item.isCorrect ? '✓' : '✗'}
                          </span>
                          <div className="flex-1">
                            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Correct Answer</div>
                            <div className="mt-1 text-sm font-medium text-slate-900">
                              {item.correctAnswer || (Array.isArray(question.choices) && question.choices[question.correctAnswer]) || 'Not available'}
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'}`}>
                            {item.isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                          <div className="text-sm font-semibold text-slate-700">AI Ideal Response</div>
                          <div className="mt-3 space-y-3 rounded-2xl bg-white p-4 text-sm leading-6 text-slate-900">
                            {item.idealAnswer ? item.idealAnswer.split('\n').map((line, idx) => (<p key={idx}>{line}</p>)) : <p>Ideal answer not available.</p>}
                          </div>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-sm font-semibold text-slate-700">Strengths</div>
                            <ul className="mt-4 space-y-3">
                              {(item.strengths || []).length ? item.strengths.map((strength, sidx) => (
                                <li key={sidx} className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-slate-900">
                                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
                                  <span>{strength}</span>
                                </li>
                              )) : <li className="text-sm text-slate-500">No strengths were flagged.</li>}
                            </ul>
                          </div>
                          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                            <div className="text-sm font-semibold text-slate-700">Areas for Improvement</div>
                            <ul className="mt-4 space-y-3">
                              {(item.improvements || []).length ? item.improvements.map((improve, midx) => (
                                <li key={midx} className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-slate-900">
                                  <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">!</span>
                                  <span>{improve}</span>
                                </li>
                              )) : <li className="text-sm text-slate-500">No improvement items were provided.</li>}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-8 text-slate-700 shadow-sm shadow-slate-200">
                <p className="text-lg font-semibold text-slate-900">No evaluation details available yet.</p>
                <p className="mt-3 text-sm text-slate-500">Make sure the session has been submitted and evaluated before downloading the report.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

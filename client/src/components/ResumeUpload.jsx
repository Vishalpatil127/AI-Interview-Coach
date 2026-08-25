import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const parseResumeData = (data) => ({
  skills: Array.isArray(data.skills) ? data.skills : [],
  experienceLevel: data.experienceLevel || 'Unknown',
  pastRoles: Array.isArray(data.pastRoles) ? data.pastRoles : [],
  summary: data.summary || '',
});

function ResumeUpload({ onContinue }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState(null);

  const handleFileChange = (event) => {
    setError('');
    const selected = event.target.files?.[0];
    if (selected && selected.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setFile(selected || null);
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    const dropped = event.dataTransfer.files?.[0];
    if (!dropped) return;
    if (dropped.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError('');
    setFile(dropped);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    setError('');
    setUploading(true);
    setProfile(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/resume/upload', {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Upload failed.');
      }

      setProfile(parseResumeData(data.parsedData || {}));
    } catch (err) {
      setError(err.message || 'Unexpected upload error.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError('');
    setProfile(null);
  };

  const continueAction = () => {
    if (typeof onContinue === 'function') {
      onContinue();
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div className="space-y-8 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200 sm:p-10">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Upload your resume</h2>
        <p className="mt-2 text-slate-500">Drop a PDF or click to select it. We’ll extract your profile automatically.</p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={(e) => e.preventDefault()}
        className="relative rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center transition hover:border-sky-400 hover:bg-slate-100"
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div className="pointer-events-none">
          <span className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-600">
            📄
          </span>
          <p className="text-lg font-medium text-slate-900">Drag & drop a PDF here</p>
          <p className="mt-2 text-sm text-slate-500">or click to choose a resume file</p>
          {file && <p className="mt-3 text-sm text-slate-600">Selected file: <span className="font-medium">{file.name}</span></p>}
        </div>
      </div>

      {error && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading || !file}
          className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {uploading ? 'Uploading...' : 'Upload Resume'}
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Re-upload Resume
        </button>
      </div>

      {uploading && (
        <div className="flex items-center gap-3 rounded-3xl bg-slate-100 px-5 py-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />
          <span className="text-sm font-medium text-slate-700">Parsing resume and extracting profile...</span>
        </div>
      )}

      {profile && (
        <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-sky-600">Extracted profile</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">Candidate summary</h3>
            </div>
            <span className="inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              {profile.experienceLevel}
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
            <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">Skills</h4>
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.skills.length ? (
                  profile.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-sky-100 px-3 py-1 text-sm text-sky-700">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No skills detected.</p>
                )}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-100">
              <h4 className="text-sm font-semibold text-slate-700">Past roles</h4>
              <div className="mt-4 space-y-2">
                {profile.pastRoles.length ? (
                  profile.pastRoles.map((role) => (
                    <div key={role} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                      {role}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No roles found.</p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-5 shadow-sm shadow-slate-100">
            <h4 className="text-sm font-semibold text-slate-700">Executive summary</h4>
            <p className="mt-4 text-sm leading-7 text-slate-600">{profile.summary || 'No summary available.'}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Re-upload Resume
            </button>
            <button
              type="button"
              onClick={continueAction}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue to Mock Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeUpload;

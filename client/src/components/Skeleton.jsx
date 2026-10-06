import { motion } from 'framer-motion';

/* Base shimmer block */
export function Skeleton({ className = '' }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/5 ${className}`}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

/* ── Dashboard skeleton ── */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#070614] text-white">
      {/* Navbar */}
      <div className="sticky top-0 z-30 border-b border-white/6 px-6 py-4"
        style={{ background: 'rgba(7,6,20,0.85)' }}>
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg hidden sm:block" />
          </div>
          <Skeleton className="h-9 w-56 rounded-2xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-32 rounded-2xl hidden sm:block" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        {/* Hero banner */}
        <Skeleton className="h-40 w-full rounded-3xl" />

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1.3fr]">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Results page skeleton ── */
export function ResultsSkeleton() {
  return (
    <div className="min-h-screen bg-[#070614] text-white">
      {/* Navbar */}
      <div className="border-b border-white/6 px-6 py-4" style={{ background: 'rgba(7,6,20,0.85)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-36 rounded-lg hidden sm:block" />
          </div>
          <Skeleton className="h-9 w-32 rounded-2xl" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        {/* Score hero */}
        <Skeleton className="h-56 w-full rounded-3xl" />

        {/* Summary */}
        <Skeleton className="h-28 w-full rounded-3xl" />

        {/* Question cards */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-white/8 p-6 space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-24 rounded-2xl" />
            </div>
            <Skeleton className="h-5 w-4/5 rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Interview page skeleton ── */
export function InterviewSkeleton() {
  return (
    <div className="min-h-screen bg-[#070614] text-white">
      {/* Navbar */}
      <div className="border-b border-white/6 px-6 py-3" style={{ background: 'rgba(7,6,20,0.9)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-40 rounded-lg hidden sm:block" />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-2.5 w-2.5 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main question area */}
        <div className="space-y-5">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-10 w-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-3xl" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-28 rounded-2xl" />
            <Skeleton className="h-11 w-28 rounded-2xl" />
            <div className="flex-1" />
            <Skeleton className="h-11 w-44 rounded-2xl" />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Profile page skeleton ── */
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#070614] text-white">
      <div className="border-b border-white/6 px-6 py-4" style={{ background: 'rgba(7,6,20,0.85)' }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-lg hidden sm:block" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-9 w-28 rounded-2xl" />
            <Skeleton className="h-9 w-20 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-10">
        {/* Avatar + name */}
        <div className="flex items-center gap-5 mb-8">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-lg" />
            <Skeleton className="h-4 w-52 rounded-lg" />
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-3xl border border-white/8 p-8 space-y-5"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20 rounded-lg" />
                <Skeleton className="h-12 rounded-2xl" />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded-lg" />
            <Skeleton className="h-12 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-10 rounded-lg" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <div className="flex justify-end gap-3">
            <Skeleton className="h-11 w-24 rounded-2xl" />
            <Skeleton className="h-11 w-28 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── History table skeleton (used inside Dashboard history tab) ── */
export function HistoryTableSkeleton() {
  return (
    <div className="space-y-px">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/4">
          <Skeleton className="h-4 w-20 rounded-lg" />
          <Skeleton className="h-4 w-36 rounded-lg" />
          <Skeleton className="h-4 w-12 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-7 w-24 rounded-xl ml-auto" />
        </div>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-lg font-semibold text-white">Interview Coach</p>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            Professional interview preparation, progress tracking, and resume support for ambitious candidates.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <a href="/profile" className="text-sm text-slate-300 transition hover:text-white">
            Profile
          </a>
          <a href="/dashboard" className="text-sm text-slate-300 transition hover:text-white">
            Dashboard
          </a>
          <a href="/reviews" className="text-sm text-slate-300 transition hover:text-white">
            Reviews
          </a>
          <a href="/forgot-password" className="text-sm text-slate-300 transition hover:text-white">
            Help & Support
          </a>
        </div>
      </div>
      <div className="border-t border-slate-800 bg-slate-900 px-4 py-4 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Interview Coach. Crafted for confident interview performance.
      </div>
    </footer>
  );
}

export default Footer;

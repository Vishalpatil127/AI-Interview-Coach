const links = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Profile',   href: '/profile' },
  { label: 'Reviews',   href: '/reviews' },
  { label: 'Support',   href: '/forgot-password' },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/6" style={{ background: 'rgba(7,6,20,0.95)' }}>
      <div className="mx-auto max-w-7xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">AI</div>
          <span className="text-white font-semibold text-sm tracking-tight">Interview Coach</span>
        </div>

        {/* Links */}
        <nav className="flex items-center gap-6">
          {links.map((l) => (
            <a key={l.label} href={l.href} className="text-slate-500 text-sm hover:text-white transition-colors duration-200">
              {l.label}
            </a>
          ))}
        </nav>

        {/* Copy */}
        <p className="text-slate-600 text-xs">
          © {new Date().getFullYear()} Interview Coach
        </p>
      </div>
    </footer>
  );
}

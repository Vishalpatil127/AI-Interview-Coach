import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext(null);

const icons = {
  success: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-400">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-red-400">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-indigo-400">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-amber-400">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
};

const styles = {
  success: { bar: 'bg-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/8' },
  error:   { bar: 'bg-red-500',     border: 'border-red-500/20',     bg: 'bg-red-500/8' },
  info:    { bar: 'bg-indigo-500',  border: 'border-indigo-500/20',  bg: 'bg-indigo-500/8' },
  warning: { bar: 'bg-amber-500',   border: 'border-amber-500/20',   bg: 'bg-amber-500/8' },
};

function Toast({ id, type = 'info', title, message, onDismiss }) {
  const s = styles[type] || styles.info;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0,  scale: 1   }}
      exit={{    opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className={`relative flex w-80 items-start gap-3 overflow-hidden rounded-2xl border p-4 shadow-2xl shadow-black/40 ${s.border}`}
      style={{ background: 'rgba(15,13,38,0.97)', backdropFilter: 'blur(16px)' }}
    >
      {/* coloured left bar */}
      <div className={`absolute left-0 top-0 h-full w-1 ${s.bar} opacity-80`} />

      {/* icon */}
      <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${s.bg} border ${s.border}`}>
        {icons[type]}
      </div>

      {/* text */}
      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-white leading-snug">{title}</p>}
        {message && <p className={`text-xs text-slate-400 leading-relaxed ${title ? 'mt-0.5' : ''}`}>{message}</p>}
      </div>

      {/* close */}
      <button onClick={() => onDismiss(id)}
        className="ml-1 mt-0.5 shrink-0 rounded-lg p-1 text-slate-500 hover:text-white hover:bg-white/10 transition-all">
        <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    if (duration > 0) setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  // Convenience helpers
  toast.success = (title, message, opts) => toast({ type: 'success', title, message, ...opts });
  toast.error   = (title, message, opts) => toast({ type: 'error',   title, message, ...opts });
  toast.info    = (title, message, opts) => toast({ type: 'info',    title, message, ...opts });
  toast.warning = (title, message, opts) => toast({ type: 'warning', title, message, ...opts });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Portal: fixed top-right stack */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <Toast {...t} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

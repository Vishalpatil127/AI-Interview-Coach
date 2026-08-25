import { motion } from 'framer-motion';
import ReviewSection from '../components/ReviewSection.jsx';

const pageVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25, ease: 'easeIn' } },
};

function Reviews() {
  return (
    <motion.div
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageVariants}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-sm shadow-slate-200 backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Community Feedback</p>
              <h1 className="mt-4 text-5xl font-semibold tracking-tight text-slate-900">Site reviews and testimonials</h1>
              <p className="mt-4 max-w-2xl text-slate-600">Read what other learners are saying and share your own experience with Interview Coach.</p>
            </div>
          </div>
        </section>

        <ReviewSection />
      </div>
    </motion.div>
  );
}

export default Reviews;

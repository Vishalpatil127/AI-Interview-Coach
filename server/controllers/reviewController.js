import Review from '../models/Review.js';

export const createReview = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { rating, message } = req.body;

    if (!rating || !message) {
      return res.status(400).json({ message: 'Rating and review message are required.' });
    }

    const review = await Review.create({
      user: userId,
      userName: req.user?.name || 'Anonymous',
      rating: Number(rating),
      message,
    });

    return res.status(201).json({ review });
  } catch (error) {
    console.error('Create review failed', error);
    return res.status(500).json({ message: 'Create review failed' });
  }
};

export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(20);
    return res.json({ reviews });
  } catch (error) {
    console.error('Fetch reviews failed', error);
    return res.status(500).json({ message: 'Fetch reviews failed' });
  }
};

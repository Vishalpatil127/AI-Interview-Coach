import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { generateInterview, getInterviewSession, submitInterviewSession, evaluateInterviewSession, getInterviewHistory } from '../controllers/interviewController.js';

const router = express.Router();

router.post('/generate', authMiddleware, generateInterview);

router.get('/history', authMiddleware, getInterviewHistory);

router.get('/:id', authMiddleware, getInterviewSession);

router.put('/:sessionId/submit', authMiddleware, submitInterviewSession);

router.post('/:sessionId/evaluate', authMiddleware, evaluateInterviewSession);

export default router;

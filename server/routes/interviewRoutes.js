import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { generateInterview, getInterviewSession, submitInterviewSession, evaluateInterviewSession, getInterviewHistory, generateAIMockInterview, submitAIMockInterview } from '../controllers/interviewController.js';

const router = express.Router();

router.post('/generate', authMiddleware, generateInterview);
router.post('/generate-ai-mock', authMiddleware, generateAIMockInterview);

router.get('/history', authMiddleware, getInterviewHistory);

router.get('/:id', authMiddleware, getInterviewSession);

router.put('/:sessionId/submit', authMiddleware, submitInterviewSession);
router.put('/:sessionId/submit-ai-mock', authMiddleware, submitAIMockInterview);

router.post('/:sessionId/evaluate', authMiddleware, evaluateInterviewSession);

export default router;

import InterviewSession from '../models/InterviewSession.js';
import Resume from '../models/Resume.js';

// Hoist GenAI import so it is resolved once at module load rather than on every request
let genaiClient = null;
if (process.env.GENAI_API_KEY) {
  try {
    const genaiModule = await import('@google/genai');
    genaiClient = genaiModule?.default || genaiModule?.GenAI || genaiModule;
  } catch (err) {
    console.warn('GenAI module could not be loaded:', err?.message || err);
  }
}

// Helper to build a simple fallback set of MCQ questions locally
function buildFallbackQuestions(jobTitle, experienceLevel, skills = []) {
  const role = jobTitle || 'software engineering';
  const cleanRole = role.trim();
  const levelLabel = experienceLevel ? `${experienceLevel} ` : '';
  const primarySkill = skills[0] || 'technical';

  const questionTemplates = [
    {
      question: `What is the most important responsibility of a ${levelLabel}${cleanRole} when collaborating with other teams?`,
      answer: 'Clearly communicating requirements and dependencies',
      distractors: [
        'Implementing only the code that was requested',
        'Avoiding all feedback until the end of the project',
        'Delegating the final review to another team',
      ],
    },
    {
      question: `Which activity is most valuable for a ${cleanRole} to improve production code quality?`,
      answer: 'Writing automated tests and reviewing pull requests',
      distractors: ['Waiting until the final sprint to test', 'Only testing in production', 'Ignoring team code standards'],
    },
    {
      question: `For a ${cleanRole}, which task best demonstrates strong role ownership?`,
      answer: 'Taking responsibility for delivery and quality of a complete feature',
      distractors: ['Completing only the assigned tickets', 'Handing off unclear requirements', 'Avoiding cross-functional discussions'],
    },
    {
      question: `Which measure best helps a ${cleanRole} reduce deployment risk?`,
      answer: 'Using automated testing and incremental deployments',
      distractors: ['Releasing all changes at once', 'Skipping regression tests', 'Delivering only when there is no deadline'],
    },
    {
      question: `If a ${cleanRole} must choose a priority, what should come first?`,
      answer: 'Customer needs and business impact',
      distractors: ['Personal preference for technology', 'Completing features as quickly as possible', 'Avoiding any technical debt'],
    },
    {
      question: `Which approach best suits a ${cleanRole} working on a complex product?`,
      answer: 'Breaking the work into small, testable increments',
      distractors: ['Trying to build the whole system at once', 'Delivering the minimum without validation', 'Changing requirements daily without review'],
    },
    {
      question: `What should a ${cleanRole} do first when requirements are unclear?`,
      answer: 'Ask stakeholders clarifying questions and confirm the expected result',
      distractors: ['Start coding immediately', 'Wait for someone else to decide', 'Implement the first idea that comes to mind'],
    },
    {
      question: `As a ${cleanRole}, which behavior best indicates effective communication?`,
      answer: 'Sharing updates and asking for feedback regularly',
      distractors: ['Working in isolation until completion', 'Only speaking when there is a problem', 'Assuming everyone understands the plan'],
    },
    {
      question: `Which practice best helps a ${cleanRole} manage changing priorities?`,
      answer: 'Reviewing goals with stakeholders and updating work plans',
      distractors: ['Ignoring changes until the end', 'Keeping the original plan unchanged', 'Focusing only on personal tasks'],
    },
    {
      question: `What is the best way for a ${cleanRole} to ensure technical decisions support the product?`,
      answer: 'Aligning architecture choices with user needs and scale requirements',
      distractors: ['Choosing the newest technology available', 'Ignoring business constraints', 'Building a complex solution without validation'],
    },
    {
      question: `Which of these is most important for a ${cleanRole} during peer review?`,
      answer: 'Providing clear, constructive feedback and asking questions',
      distractors: ['Only approving reviews quickly', 'Criticizing without suggestions', 'Refusing to review unfamiliar code'],
    },
    {
      question: `For a ${cleanRole}, what does a successful release process include?`,
      answer: 'Testing, monitoring, and a rollback plan',
      distractors: ['Deploying without validation', 'Relying on manual checks only', 'Ignoring post-release issues'],
    },
    {
      question: `When planning work, which factor should a ${cleanRole} consider first?`,
      answer: 'The highest-value impact for users and the product',
      distractors: ['The easiest tasks first', 'Only personal learning goals', 'The least risky work regardless of impact'],
    },
    {
      question: `Which tool is most useful for a ${cleanRole} to track progress and blockers?`,
      answer: 'A shared task board with clear status updates',
      distractors: ['A personal notebook only', 'Skipping updates until the end of the sprint', 'Communicating only by email'],
    },
    {
      question: `What is the best way for a ${cleanRole} to improve future work after a project?`,
      answer: 'Review lessons learned and update team practices',
      distractors: ['Blaming others for failures', 'Continuing the same approach without review', 'Avoiding discussion of problems'],
    },
  ];

  return questionTemplates.map((template, index) => {
    const choices = [template.answer, ...template.distractors].sort(() => Math.random() - 0.5);
    return {
      id: index + 1,
      type: 'mcq',
      question: template.question,
      choices,
      correctAnswer: choices.findIndex((choice) => choice === template.answer),
      expectedKeyPoints: [`Correct answer: ${template.answer}`],
    };
  });
}

export const generateInterview = async (req, res) => {
  try {
    const { jobTitle, experienceLevel } = req.body || {};
    if (!jobTitle) return res.status(400).json({ message: 'jobTitle is required' });

    const userId = req.user?.id;

    // fetch latest parsed resume to get skills
    const resume = await Resume.findOne({ userId }).sort({ createdAt: -1 }).lean();
    const skills = (resume?.parsedData?.skills) || [];

    // Prepare schema for GenAI: array of 15 MCQ objects
    const jsonSchema = {
      type: 'array',
      minItems: 15,
      maxItems: 15,
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          type: { type: 'string', enum: ['mcq'] },
          question: { type: 'string' },
          choices: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
          correctAnswer: { type: 'integer' },
          expectedKeyPoints: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'type', 'question', 'choices', 'correctAnswer', 'expectedKeyPoints'],
      },
    };

    const systemPrompt = `You are a Senior Technical Interview Designer. Generate fifteen MCQ interview questions tailored to the target role: ${jobTitle} and the candidate's skills: ${skills.join(', ') || 'none provided'}. For each question include an integer id (1-15), type as 'mcq', the question text, an array of exactly four answer choices, and the zero-based index of the correct answer. Also include expected key points for the question. Keep questions concise, role-focused, and suitable for a timed professional assessment.`;

    let questions = null;

    if (process.env.GENAI_API_KEY) {
      try {
        const client = genaiClient;
        let genaiResponse = null;
        const model = process.env.GENAI_MODEL || 'gemini-2.5-flash';

        if (client && client.text && typeof client.text.generate === 'function') {
          genaiResponse = await client.text.generate({
            model,
            input: `${systemPrompt}\n\nTarget experience level: ${experienceLevel || 'unspecified'}`,
            responseMimeType: 'application/json',
            jsonSchema,
            apiKey: process.env.GENAI_API_KEY,
          });
        } else if (typeof client.generate === 'function') {
          genaiResponse = await client.generate({
            model,
            input: `${systemPrompt}\n\nTarget experience level: ${experienceLevel || 'unspecified'}`,
            responseMimeType: 'application/json',
            jsonSchema,
            apiKey: process.env.GENAI_API_KEY,
          });
        }

        const possibleTextPaths = [
          genaiResponse?.output?.[0]?.content?.[0]?.text,
          genaiResponse?.candidates?.[0]?.output,
          genaiResponse?.text,
          genaiResponse?.response,
          genaiResponse?.body,
        ];

        for (const candidate of possibleTextPaths) {
          if (candidate && typeof candidate === 'string') {
            try {
              const parsed = JSON.parse(candidate);
              if (Array.isArray(parsed) && parsed.length === 15) {
                questions = parsed;
                break;
              }
            } catch (e) {
              // continue
            }
          }
        }
      } catch (err) {
        console.warn('GenAI interview generation failed, falling back:', err?.message || err);
        questions = null;
      }
    }

    if (!questions) {
      questions = buildFallbackQuestions(jobTitle, experienceLevel, skills);
    }

    const sessionDoc = await InterviewSession.create({
      userId,
      jobTitle,
      experienceLevel,
      questions,
      timerSeconds: 900,
    });

    return res.status(201).json({ sessionId: sessionDoc._id, questions: sessionDoc.questions, timerSeconds: sessionDoc.timerSeconds });
  } catch (error) {
    console.error('Failed to generate interview session', error);
    return res.status(500).json({ message: 'Failed to generate interview session' });
  }
};

export const getInterviewSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await InterviewSession.findById(id).lean();
    if (!session) return res.status(404).json({ message: 'Interview session not found' });
    return res.json({ session, evaluationResult: session.evaluationResult || null });
  } catch (error) {
    console.error('Failed to fetch interview session', error);
    return res.status(500).json({ message: 'Failed to fetch interview session' });
  }
};

export const submitInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id;
    const { userAnswers } = req.body || {};

    if (!Array.isArray(userAnswers)) {
      return res.status(400).json({ message: 'userAnswers must be an array' });
    }

    const session = await InterviewSession.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Interview session not found' });

    if (session.userId && session.userId.toString() !== String(userId)) {
      return res.status(403).json({ message: 'Forbidden: you do not own this session' });
    }

    const questions = session.questions || [];
    session.userAnswers = userAnswers.map((a) => {
      const question = questions.find((q) => String(q.id ?? q._id) === String(a.questionId ?? a.id ?? '')) || {};
      const selectedIndex = typeof a.selectedIndex === 'number' ? a.selectedIndex : null;
      return {
        questionId: a.questionId ?? a.id ?? null,
        selectedIndex,
        selectedAnswer: Array.isArray(question.choices) && selectedIndex !== null && question.choices[selectedIndex] ? question.choices[selectedIndex] : '',
      };
    });

    const evaluations = questions.map((question) => {
      const answer = session.userAnswers.find((a) => String(a.questionId) === String(question.id ?? question._id ?? '')) || {};
      const isCorrect = typeof answer.selectedIndex === 'number' && answer.selectedIndex === question.correctAnswer;
      const correctChoiceText = Array.isArray(question.choices) ? question.choices[question.correctAnswer] : '';
      const keyPoints = (question.expectedKeyPoints || []).filter((kp) => kp && !kp.startsWith('Correct answer:'));

      // Build a meaningful ideal answer from the correct choice + key points
      const idealAnswer = [
        `The correct answer is: "${correctChoiceText}".`,
        keyPoints.length ? `Key points: ${keyPoints.join(' ')}` : null,
        `This question tests role-based understanding for ${session.jobTitle || 'the target role'}. Selecting the right answer demonstrates awareness of professional best practices relevant to the position.`,
      ].filter(Boolean).join('\n\n');

      return {
        questionId: question.id ?? question._id ?? null,
        score: isCorrect ? 10 : 0,
        correctAnswer: correctChoiceText,
        selectedAnswer: answer.selectedAnswer || '',
        isCorrect,
        idealAnswer,
        strengths: isCorrect ? ['Correct selection for the role-appropriate question.'] : [],
        improvements: isCorrect ? [] : [`The correct answer was "${correctChoiceText}". Review the correct role-based concept and try to eliminate distractors next time.`],
      };
    });

    const totalCorrect = evaluations.filter((item) => item.isCorrect).length;
    const totalQuestions = evaluations.length;
    const overallScore = totalQuestions > 0 ? Number(((totalCorrect / totalQuestions) * 10).toFixed(1)) : 0;

    session.evaluationResult = {
      overallScore,
      overallSummary: `You answered ${totalCorrect} out of ${totalQuestions} questions correctly, scoring ${overallScore}/10. ${
        overallScore >= 8 ? 'Excellent performance — you demonstrated strong role-based knowledge.' :
        overallScore >= 5 ? 'Good effort — review the questions you missed to strengthen your understanding.' :
        'Keep practicing — focus on the areas for improvement highlighted in each question below.'
      }`,
      evaluations,
    };
    session.status = 'graded';

    await session.save();

    return res.json({ message: 'Interview submitted', sessionId: session._id, evaluationResult: session.evaluationResult });
  } catch (error) {
    console.error('Failed to submit interview session', error);
    return res.status(500).json({ message: 'Failed to submit interview session' });
  }
};

export const evaluateInterviewSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await InterviewSession.findById(sessionId).lean();
    if (!session) return res.status(404).json({ message: 'Interview session not found' });

    if (!process.env.GENAI_API_KEY) {
      return res.status(501).json({ message: 'GenAI API key not configured on the server' });
    }

    // Build a clear system prompt and structured input to evaluate answers
    const systemPrompt = `You are an expert interviewer and grader. Evaluate each user answer against the question and expected key points. For each question produce a numeric score from 1 to 10, list strengths and suggested improvements, and produce an ideal answer using the STAR method. Also produce an overallScore (1-10) and an overallSummary.`;

    const questionsForPrompt = (session.questions || []).map((q) => ({
      id: q.id ?? q._id ?? null,
      type: q.type,
      question: q.question,
      expectedKeyPoints: q.expectedKeyPoints || [],
    }));

    const answersForPrompt = (session.userAnswers || []).map((a) => ({
      questionId: a.questionId ?? a.id ?? null,
      answerText: a.answerText || a.answer || '',
    }));

    const jsonSchema = {
      type: 'object',
      properties: {
        overallScore: { type: 'number' },
        overallSummary: { type: 'string' },
        evaluations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              questionId: { type: ['number', 'string'] },
              score: { type: 'number' },
              strengths: { type: 'array', items: { type: 'string' } },
              improvements: { type: 'array', items: { type: 'string' } },
              idealAnswer: { type: 'string' },
            },
            required: ['questionId', 'score', 'strengths', 'improvements', 'idealAnswer'],
          },
        },
      },
      required: ['overallScore', 'overallSummary', 'evaluations'],
    };

    let parsed = null;

    try {
      const client = genaiClient;
      const model = process.env.GENAI_MODEL || 'gemini-2.5-flash';

      let genaiResponse = null;
      const input = `${systemPrompt}\n\nSession context: jobTitle=${session.jobTitle || 'unspecified'}, experienceLevel=${session.experienceLevel || 'unspecified'}.\nQuestions:\n${JSON.stringify(questionsForPrompt, null, 2)}\n\nUser Answers:\n${JSON.stringify(answersForPrompt, null, 2)}`;

      if (client && client.text && typeof client.text.generate === 'function') {
        genaiResponse = await client.text.generate({
          model,
          input,
          responseMimeType: 'application/json',
          jsonSchema,
          apiKey: process.env.GENAI_API_KEY,
        });
      } else if (typeof client.generate === 'function') {
        genaiResponse = await client.generate({
          model,
          input,
          responseMimeType: 'application/json',
          jsonSchema,
          apiKey: process.env.GENAI_API_KEY,
        });
      }

      const possibleTextPaths = [
        genaiResponse?.output?.[0]?.content?.[0]?.text,
        genaiResponse?.candidates?.[0]?.output,
        genaiResponse?.text,
        genaiResponse?.response,
        genaiResponse?.body,
      ];

      for (const candidate of possibleTextPaths) {
        if (candidate && typeof candidate === 'string') {
          try {
            const p = JSON.parse(candidate);
            if (p && typeof p === 'object' && Array.isArray(p.evaluations)) {
              parsed = p;
              break;
            }
          } catch (e) {
            // continue
          }
        } else if (candidate && typeof candidate === 'object') {
          // some clients already return parsed JSON
          if (Array.isArray(candidate.evaluations) || (typeof candidate.overallScore === 'number')) {
            parsed = candidate;
            break;
          }
        }
      }
    } catch (err) {
      console.warn('GenAI evaluation failed:', err?.message || err);
      return res.status(500).json({ message: 'GenAI evaluation failed', error: err?.message || String(err) });
    }

    if (!parsed) {
      return res.status(502).json({ message: 'GenAI returned unexpected response format' });
    }

    // Save evaluationResult and update status
    const sessionDoc = await InterviewSession.findById(sessionId);
    if (!sessionDoc) return res.status(404).json({ message: 'Interview session not found' });
    sessionDoc.evaluationResult = parsed;
    sessionDoc.status = 'graded';
    await sessionDoc.save();

    return res.json({
      message: 'Evaluation saved',
      session: sessionDoc,
      evaluationResult: sessionDoc.evaluationResult || null,
    });
  } catch (error) {
    console.error('Failed to evaluate interview session', error);
    return res.status(500).json({ message: 'Failed to evaluate interview session' });
  }
};

export const getInterviewHistory = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Project only fields needed by the client — exclude large questions/userAnswers arrays
    const sessions = await InterviewSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('_id jobTitle createdAt status evaluationResult')
      .lean();

    return res.json({ sessions });
  } catch (error) {
    console.error('Failed to fetch interview history', error);
    return res.status(500).json({ message: 'Failed to fetch interview history' });
  }
};

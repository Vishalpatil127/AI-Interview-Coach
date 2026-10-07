import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const QuestionSchema = new Schema(
  {
    id: { type: Schema.Types.Mixed, required: true },
    question: { type: String, required: true },
    type: { type: String, required: true },
    choices: { type: [String], default: [] },
    correctAnswer: { type: Number, default: 0 },
    expectedKeyPoints: { type: [String], default: [] },
  },
  { _id: false }
);

const InterviewSessionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  jobTitle: { type: String, required: true },
  experienceLevel: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  sessionType: { type: String, enum: ['mcq', 'ai-mock'], default: 'mcq' },
  questions: { type: [QuestionSchema], default: [] },
  timerSeconds: { type: Number, default: 900 },
  userAnswers: {
    type: [
      {
        questionId: { type: Schema.Types.Mixed },
        selectedIndex: { type: Number },
        selectedAnswer: { type: String },
        answerText: { type: String, default: '' },
      },
    ],
    default: [],
  },
  evaluationResult: { type: Schema.Types.Mixed, default: null },
  status: { type: String, enum: ['pending', 'submitted', 'graded'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

// Indexes for common queries
InterviewSessionSchema.index({ userId: 1, createdAt: -1 });
InterviewSessionSchema.index({ status: 1 });

const InterviewSession = model('InterviewSession', InterviewSessionSchema);

export default InterviewSession;

import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ParsedDataSchema = new Schema(
  {
    skills: { type: [String], default: [] },
    experienceLevel: { type: String, default: '' },
    pastRoles: { type: [String], default: [] },
    summary: { type: String, default: '' },
  },
  { _id: false }
);

const ResumeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rawText: { type: String, default: '' },
  parsedData: { type: ParsedDataSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
});

// Index for quick lookup of latest resume per user
ResumeSchema.index({ userId: 1, createdAt: -1 });

const Resume = model('Resume', ResumeSchema);

export default Resume;

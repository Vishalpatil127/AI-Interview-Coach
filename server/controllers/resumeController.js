import pdf from 'pdf-parse';
import Resume from '../models/Resume.js';

// Dynamic GenAI integration: attempt to call @google/genai if configured.
// If any part of the integration fails, code falls back to local regex parsing below.

const skillPattern = /\b(JavaScript|TypeScript|React|Node\.js|Node|Python|SQL|MongoDB|AWS|Docker|Kubernetes|Java|C\+\+|C#|HTML|CSS|Git|Redux|GraphQL|REST|Next\.js|Vue|Angular)\b/gi;
const rolePattern = /\b(?:Senior|Lead|Manager|Engineer|Developer|Architect|Product)\b[^\n\r]*/gi;

function extractResumeData(rawText) {
  const skills = Array.from(new Set((rawText.match(skillPattern) || []).map((skill) => skill.trim())));
  let experienceLevel = 'Mid-level';
  const lower = rawText.toLowerCase();
  if (lower.includes('junior') || lower.includes('entry level') || lower.includes('jr.')) {
    experienceLevel = 'Junior';
  } else if (lower.includes('senior') || lower.includes('sr.') || lower.includes('lead')) {
    experienceLevel = lower.includes('lead') ? 'Lead' : 'Senior';
  }

  const pastRoles = Array.from(new Set((rawText.match(rolePattern) || []).map((item) => item.trim()))).slice(0, 5);
  const summary = rawText.split(/\n{2,}|\.\s+/).slice(0, 2).join('. ').trim();

  return {
    skills,
    experienceLevel,
    pastRoles,
    summary: summary.length ? summary : 'Parsed resume summary unavailable.',
  };
}

export const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Resume PDF file is required.' });
  }

  try {
    const buffer = req.file.buffer;
    const parsedPdf = await pdf(buffer);
    const rawText = (parsedPdf.text || '').trim();

    if (!rawText) {
      return res.status(400).json({ message: 'Unable to extract text from PDF.' });
    }

    // Try GenAI if API key is provided and package is available
    let parsedData = null;
    if (process.env.GENAI_API_KEY) {
      try {
        const genaiModule = await import('@google/genai');

        // Attempt several common client shapes to be robust across versions
        const client = genaiModule?.default || genaiModule?.GenAI || genaiModule;

        // Prepare a JSON schema for the model to return structured JSON
        const jsonSchema = {
          type: 'object',
          properties: {
            skills: { type: 'array', items: { type: 'string' } },
            experienceLevel: { type: 'string', enum: ['Junior', 'Mid-level', 'Senior', 'Lead'] },
            pastRoles: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
          required: ['skills', 'experienceLevel', 'pastRoles', 'summary'],
        };

        // Heuristic call paths for different client versions
        let genaiResponse = null;

        if (client && client.text && typeof client.text.generate === 'function') {
          // Example shape: client.text.generate({ model, input, responseMimeType, jsonSchema })
          genaiResponse = await client.text.generate({
            model: process.env.GENAI_MODEL || 'gemini:flash',
            input: rawText,
            responseMimeType: 'application/json',
            jsonSchema,
            apiKey: process.env.GENAI_API_KEY,
          });
        } else if (typeof client.generate === 'function') {
          genaiResponse = await client.generate({
            model: process.env.GENAI_MODEL || 'gemini:flash',
            input: rawText,
            responseMimeType: 'application/json',
            jsonSchema,
            apiKey: process.env.GENAI_API_KEY,
          });
        }

        // Extract JSON text from common response shapes
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
              parsedData = JSON.parse(candidate);
              break;
            } catch (e) {
              // ignore and continue
            }
          }
        }
      } catch (err) {
        console.warn('GenAI call failed, falling back to local parsing:', err?.message || err);
        parsedData = null;
      }
    }

    // Final fallback to local regex-based extraction
    if (!parsedData) {
      parsedData = extractResumeData(rawText);
    }
    const resume = await Resume.create({
      userId: req.user.id,
      rawText,
      parsedData,
    });

    return res.status(201).json({ parsedData: resume.parsedData });
  } catch (error) {
    console.error('Resume upload failed', error);
    return res.status(500).json({ message: 'Resume upload failed.' });
  }
};

export const getLatestResume = async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    if (!resume) {
      return res.status(404).json({ message: 'No resume found for this user.' });
    }

    return res.json({ parsedData: resume.parsedData, rawText: resume.rawText, createdAt: resume.createdAt });
  } catch (error) {
    console.error('Failed to fetch latest resume', error);
    return res.status(500).json({ message: 'Failed to fetch latest resume.' });
  }
};

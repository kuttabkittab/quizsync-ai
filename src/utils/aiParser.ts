import { Quiz, Question } from '../types/quiz';

export interface PromptOptions {
  topic: string;
  count: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Savage';
  style: 'Classic Trivia' | 'Tricky & Brainy' | 'Fun & Humorous' | 'Fast & Casual';
}

export function buildAIPrompt(opts: PromptOptions): string {
  return `You are a world-class multiplayer quiz show creator.
Generate a high-energy, fun, and engaging quiz with the following parameters:
- Topic: ${opts.topic}
- Number of questions: ${opts.count}
- Difficulty: ${opts.difficulty}
- Tone / Style: ${opts.style}

CRITICAL RULES:
1. Each question must have EXACTLY 4 distinct options.
2. Only 1 option must be correct.
3. Provide "correctIndex" as an integer (0 for option 1, 1 for option 2, 2 for option 3, 3 for option 4).
4. Include a brief, fun "explanation" (1-2 sentences) explaining why it's correct.
5. Provide a catchy "title" and a 1-sentence "description".
6. Set "timePerQuestion" to 20 (seconds).
7. Respond ONLY with valid JSON inside a \`\`\`json code block. Do NOT include any conversation or text outside the JSON.

Expected JSON schema format:
\`\`\`json
{
  "title": "Enter Catchy Quiz Title Here",
  "description": "Enter engaging 1-sentence summary here",
  "category": "${opts.topic}",
  "timePerQuestion": 20,
  "questions": [
    {
      "question": "Question text goes here?",
      "options": ["First option", "Second option", "Third option", "Fourth option"],
      "correctIndex": 0,
      "explanation": "Did you know? Fun fact explaining the answer!"
    }
  ]
}
\`\`\``;
}

export interface ParseResult {
  success: boolean;
  quiz?: Quiz;
  error?: string;
  rawParsedCount?: number;
}

export function parseAIQuizOutput(rawInput: string): ParseResult {
  if (!rawInput || !rawInput.trim()) {
    return { success: false, error: 'Input is empty. Please paste your AI response.' };
  }

  const text = rawInput.trim();

  // 1. Try to extract from Markdown code block (```json ... ``` or ``` ...)
  let jsonString = '';
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    jsonString = codeBlockMatch[1].trim();
  } else {
    // If no code block, look for outermost curly braces or brackets
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonString = text.substring(firstBrace, lastBrace + 1);
    }
  }

  // 2. Try parsing JSON
  if (jsonString) {
    // Clean common JSON quirks: trailing commas before } or ]
    const cleanedJson = jsonString
      .replace(/,\s*([\]}])/g, '$1')
      .replace(/[\u201C\u201D]/g, '"') // replace curly quotes
      .replace(/[\u2018\u2019]/g, "'");

    try {
      const parsed = JSON.parse(cleanedJson);
      const validated = validateAndNormalizeQuiz(parsed, text);
      if (validated) {
        return { success: true, quiz: validated, rawParsedCount: validated.questions.length };
      }
    } catch {
      // JSON parse failed, proceed to heuristic text parser below
    }
  }

  // 3. Fallback Heuristic Parser for plain text or markdown lists
  const heuristicQuiz = parsePlainTextQuiz(text);
  if (heuristicQuiz && heuristicQuiz.questions.length > 0) {
    return {
      success: true,
      quiz: heuristicQuiz,
      rawParsedCount: heuristicQuiz.questions.length
    };
  }

  return {
    success: false,
    error: 'Could not extract valid quiz questions. Ensure the AI response includes questions with 4 options and indicated correct answers.'
  };
}

function cleanOptionText(opt: string): string {
  // Strip "A) ", "A. ", "1) ", "1. ", "[x] ", etc.
  return opt.replace(/^[A-Da-d1-4][\)\.\:\-]\s*/, '').trim();
}

function validateAndNormalizeQuiz(data: unknown, originalText: string): Quiz | null {
  if (!data || typeof data !== 'object') return null;

  const rawObj = data as Record<string, unknown>;
  let questionsRaw: unknown[] = [];

  if (Array.isArray(data)) {
    questionsRaw = data;
  } else if (Array.isArray(rawObj.questions)) {
    questionsRaw = rawObj.questions;
  } else if (Array.isArray(rawObj.quiz)) {
    questionsRaw = rawObj.quiz;
  }

  if (questionsRaw.length === 0) return null;

  const questions: Question[] = [];

  for (let i = 0; i < questionsRaw.length; i++) {
    const item = questionsRaw[i];
    if (!item || typeof item !== 'object') continue;
    const qObj = item as Record<string, unknown>;

    const questionText = String(qObj.question || qObj.q || qObj.prompt || '').trim();
    if (!questionText) continue;

    let optionsRaw: unknown[] = [];
    if (Array.isArray(qObj.options)) {
      optionsRaw = qObj.options;
    } else if (Array.isArray(qObj.choices)) {
      optionsRaw = qObj.choices;
    } else if (Array.isArray(qObj.answers)) {
      optionsRaw = qObj.answers;
    } else if (typeof qObj.options === 'object' && qObj.options !== null) {
      // Sometimes an object { A: "...", B: "..." }
      optionsRaw = Object.values(qObj.options as Record<string, unknown>);
    }

    const options = optionsRaw.map(o => cleanOptionText(String(o))).filter(o => o.length > 0);
    if (options.length < 2) continue; // Need at least 2 options, ideally 4

    // Ensure we pad to 4 options if 3 were provided or keep 4
    while (options.length < 4) {
      options.push(`Option ${options.length + 1}`);
    }

    // Determine correct index
    let correctIndex = 0;
    if (typeof qObj.correctIndex === 'number' && qObj.correctIndex >= 0 && qObj.correctIndex < options.length) {
      correctIndex = qObj.correctIndex;
    } else if (typeof qObj.answer === 'number' && qObj.answer >= 0 && qObj.answer < options.length) {
      correctIndex = qObj.answer;
    } else if (typeof qObj.correctAnswer === 'string' || typeof qObj.answer === 'string') {
      const ansStr = String(qObj.correctAnswer || qObj.answer).trim();
      // Check letter A/B/C/D
      const letterMatch = ansStr.match(/^[A-Da-d]$/);
      if (letterMatch) {
        const charCode = ansStr.toUpperCase().charCodeAt(0);
        correctIndex = Math.min(options.length - 1, Math.max(0, charCode - 65));
      } else {
        // Try matching string to one of the options
        const matchIdx = options.findIndex(opt => opt.toLowerCase() === ansStr.toLowerCase() || opt.toLowerCase().includes(ansStr.toLowerCase()));
        if (matchIdx !== -1) {
          correctIndex = matchIdx;
        }
      }
    }

    const explanation = qObj.explanation ? String(qObj.explanation).trim() : undefined;

    questions.push({
      id: `q_${i + 1}_${Math.random().toString(36).substring(2, 6)}`,
      question: questionText,
      options: options.slice(0, 4),
      correctIndex: Math.min(3, Math.max(0, correctIndex)),
      explanation
    });
  }

  if (questions.length === 0) return null;

  const title: string = (typeof rawObj.title === 'string' && rawObj.title.trim()) || 'AI Generated Quiz Arena';
  const description: string = (typeof rawObj.description === 'string' && rawObj.description.trim()) || `Battle across ${questions.length} questions!`;
  const timePerQuestion: number = typeof rawObj.timePerQuestion === 'number' ? Math.max(10, Math.min(60, rawObj.timePerQuestion)) : 20;
  const category: string = (typeof rawObj.category === 'string' && rawObj.category.trim()) || 'Custom AI Quiz';

  return {
    id: `quiz_${Date.now()}`,
    title,
    description,
    category,
    questions,
    timePerQuestion
  };
}

function parsePlainTextQuiz(text: string): Quiz | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const questions: Question[] = [];

  let currentQuestion = '';
  let currentOptions: string[] = [];
  let correctLetter = '';
  let explanation = '';

  const saveCurrent = () => {
    if (currentQuestion && currentOptions.length >= 2) {
      let correctIndex = 0;
      if (correctLetter) {
        const charCode = correctLetter.toUpperCase().charCodeAt(0);
        if (charCode >= 65 && charCode <= 68) {
          correctIndex = charCode - 65;
        }
      }
      while (currentOptions.length < 4) {
        currentOptions.push(`Option ${currentOptions.length + 1}`);
      }
      questions.push({
        id: `q_${questions.length + 1}_${Math.random().toString(36).substring(2, 6)}`,
        question: currentQuestion,
        options: currentOptions.slice(0, 4),
        correctIndex: Math.min(3, Math.max(0, correctIndex)),
        explanation: explanation || undefined
      });
    }
    currentQuestion = '';
    currentOptions = [];
    correctLetter = '';
    explanation = '';
  };

  for (const line of lines) {
    // Detect question start: "1.", "1)", "Q1:", "**Question 1**"
    const qMatch = line.match(/^(?:(?:\d+[\.\)]|Q\d+[\:\.]|\*\*(?:Question\s*)?\d+\*\*[\:\.]?))\s*(.+)/i);
    if (qMatch && !line.match(/^[A-Da-d][\.\)]/)) {
      saveCurrent();
      currentQuestion = qMatch[1].trim();
      continue;
    }

    // Detect options: "A)", "A.", "1)", "(A)"
    const optMatch = line.match(/^(?:[A-Da-d][\.\)]|\([A-Da-d]\))\s*(.+)/);
    if (optMatch && currentQuestion) {
      currentOptions.push(cleanOptionText(optMatch[1].trim()));
      continue;
    }

    // Detect Answer line: "Answer: C", "Correct: B", "Correct Answer: A"
    const ansMatch = line.match(/(?:correct\s*answer|answer)\s*[:\-]\s*([A-Da-d])/i);
    if (ansMatch) {
      correctLetter = ansMatch[1];
      continue;
    }

    // Detect Explanation line
    const expMatch = line.match(/(?:explanation|note)\s*[:\-]\s*(.+)/i);
    if (expMatch) {
      explanation = expMatch[1].trim();
      continue;
    }

    // If we have a current question and no options yet, append to question
    if (currentQuestion && currentOptions.length === 0) {
      currentQuestion += ' ' + line;
    }
  }

  saveCurrent();

  if (questions.length === 0) return null;

  return {
    id: `quiz_${Date.now()}`,
    title: 'Extracted AI Quiz',
    description: `Parsed ${questions.length} questions from text`,
    category: 'AI Custom',
    questions,
    timePerQuestion: 20
  };
}

export const DEMO_QUIZZES: Quiz[] = [
  {
    id: 'demo_tech_titans',
    title: '⚡ Tech & Coding Legends',
    description: 'High-octane showdown covering JavaScript, Web APIs, and computing milestones.',
    category: 'Computer Science',
    timePerQuestion: 20,
    questions: [
      {
        id: 'q1',
        question: 'How long did Brendan Eich take to create the first version of JavaScript?',
        options: ['10 days', '6 months', '2 years', '30 days'],
        correctIndex: 0,
        explanation: 'Brendan Eich famously wrote Mocha (which became JavaScript) in just 10 days in May 1995 for Netscape.'
      },
      {
        id: 'q2',
        question: 'Which HTTP status code signifies "I\'m a teapot"?',
        options: ['418', '404', '503', '402'],
        correctIndex: 0,
        explanation: 'RFC 2324 specified HTTP 418 I\'m a teapot as an April Fools joke in 1998, which became an internet icon.'
      },
      {
        id: 'q3',
        question: 'What is the time complexity of looking up a key in a balanced Hash Map in average case?',
        options: ['O(log n)', 'O(1)', 'O(n)', 'O(n log n)'],
        correctIndex: 1,
        explanation: 'Hash maps provide constant O(1) average lookup time via direct hash bucket indexing.'
      },
      {
        id: 'q4',
        question: 'Which of the following is NOT a JavaScript primitive data type?',
        options: ['Symbol', 'BigInt', 'Array', 'Undefined'],
        correctIndex: 2,
        explanation: 'In JavaScript, Arrays are Objects, not primitive data types.'
      },
      {
        id: 'q5',
        question: 'What does CSS stand for?',
        options: ['Cascading Style Sheets', 'Creative Styling Syntax', 'Computer Screen Styling', 'Color Style Structure'],
        correctIndex: 0,
        explanation: 'CSS stands for Cascading Style Sheets, first proposed by Håkon Wium Lie in 1994.'
      }
    ]
  },
  {
    id: 'demo_cosmos',
    title: '🪐 Cosmic Mysteries & Space Trivia',
    description: 'A stellar multiplayer voyage through galaxies, black holes, and space flight.',
    category: 'Astronomy & Physics',
    timePerQuestion: 20,
    questions: [
      {
        id: 'q1',
        question: 'Approximately how long does sunlight take to reach Earth?',
        options: ['8 minutes 20 seconds', 'Instantaneous', '1 hour', '42 seconds'],
        correctIndex: 0,
        explanation: 'Light traveling at 300,000 km/s takes about 499 seconds (approx 8m 20s) to cross the 150 million km from the Sun.'
      },
      {
        id: 'q2',
        question: 'What is the hottest planet in our Solar System?',
        options: ['Mercury', 'Venus', 'Mars', 'Jupiter'],
        correctIndex: 1,
        explanation: 'Venus is hotter than Mercury due to an extreme runaway greenhouse atmosphere of carbon dioxide, reaching 465°C.'
      },
      {
        id: 'q3',
        question: 'What lies beyond the event horizon of a black hole where gravity is infinitely dense?',
        options: ['A Singularity', 'A Neutron Star', 'A Nebula', 'Dark Matter Void'],
        correctIndex: 0,
        explanation: 'According to general relativity, all mass collapses into a gravitational singularity of zero volume and infinite density.'
      },
      {
        id: 'q4',
        question: 'Which telescope was launched in December 2021 to view the earliest stars in the universe?',
        options: ['Hubble Space Telescope', 'James Webb Space Telescope', 'Spitzer Telescope', 'Chandra Observatory'],
        correctIndex: 1,
        explanation: 'JWST observes in infrared light from the Sun-Earth L2 Lagrange point 1.5 million km away.'
      }
    ]
  },
  {
    id: 'demo_brain_busters',
    title: '🧠 Brain Busters & Lateral Riddles',
    description: 'Deceptive logic, tricky wordplay, and rapid-fire cognitive traps.',
    category: 'Riddles & Logic',
    timePerQuestion: 15,
    questions: [
      {
        id: 'q1',
        question: 'If you are running in a race and you pass the person in second place, what place are you in?',
        options: ['First place', 'Second place', 'Third place', 'Tied for first'],
        correctIndex: 1,
        explanation: 'You took second place from them! The person in first place is still ahead of you.'
      },
      {
        id: 'q2',
        question: 'A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?',
        options: ['10 cents', '5 cents', '1 cent', 'Zero'],
        correctIndex: 1,
        explanation: 'If the ball is 5 cents ($0.05), the bat is $1.05 ($1.00 more), totaling $1.10.'
      },
      {
        id: 'q3',
        question: 'Some months have 31 days, others have 30. How many have 28 days?',
        options: ['Only 1 (February)', 'All 12 of them', 'None in leap years', '6 months'],
        correctIndex: 1,
        explanation: 'Every single month has at least 28 days!'
      },
      {
        id: 'q4',
        question: 'I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?',
        options: ['A cloud', 'An echo', 'A shadow', 'A windmill'],
        correctIndex: 1,
        explanation: 'An echo repeats sounds without a physical body.'
      }
    ]
  }
];

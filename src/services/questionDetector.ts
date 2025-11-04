/**
 * Question Detection Service
 * Analyzes messages to determine if they are questions
 */

interface DetectionConfig {
  questionMarks: boolean;
  questionWords: string[];
  helpPatterns: string[];
  minLength: number;
}

const defaultConfig: DetectionConfig = {
  questionMarks: true,
  questionWords: [
    'how do', 'how can', 'how to', 'how does', 'how would',
    'what is', 'what are', 'what does', 'what\'s',
    'where is', 'where can', 'where do',
    'when should', 'when does', 'when can',
    'why does', 'why is', 'why can\'t',
    'who can', 'who should', 'who knows',
    'which', 'is there', 'are there',
  ],
  helpPatterns: [
    'does anyone know',
    'can someone',
    'anyone know',
    'could someone',
    'help with',
    'need help',
  ],
  minLength: 10,
};

export function isQuestion(text: string, config = defaultConfig): boolean {
  const normalized = text.toLowerCase().trim();

  // Too short
  if (normalized.length < config.minLength) return false;

  // Check for question mark
  if (config.questionMarks && normalized.endsWith('?')) return true;

  // Check for question word starters
  for (const word of config.questionWords) {
    if (normalized.startsWith(word)) return true;
  }

  // Check for help patterns
  for (const pattern of config.helpPatterns) {
    if (normalized.includes(pattern)) return true;
  }

  return false;
}

export function extractKeywords(text: string): string[] {
  // Remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
    'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are',
    'how', 'what', 'when', 'where', 'why', 'who', 'does',
    'can', 'could', 'should', 'would', 'i', 'you', 'we',
  ]);

  // Tokenize and filter
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count frequency
  const freq = new Map<string, number>();
  words.forEach(word => freq.set(word, (freq.get(word) || 0) + 1));

  // Return top keywords
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

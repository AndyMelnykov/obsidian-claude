import Anthropic from '@anthropic-ai/sdk';

const ANSWER_MODEL = process.env.EVAL_ANSWER_MODEL || 'claude-sonnet-5';

function extractCitedSlugs(answerText) {
  return [...new Set([...answerText.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]))];
}

export async function runMode({ question, vaultRoot, retrieve }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. See eval/harness/.env.example.');
  }
  const client = new Anthropic();

  const { contextText, retrievedSlugs } = await retrieve(question, vaultRoot);

  const systemPrompt = `You answer questions using ONLY the note excerpts provided below. \
Each excerpt is headed by its note slug in [[wikilink]] form — cite the exact slugs of the \
notes you actually drew from, as [[slug]], inline in your answer. \
If the excerpts fully answer the question, answer directly and confidently. \
If the excerpts contain some related information but don't fully or directly resolve the \
question, say what they do show while being explicit that they don't fully answer it — \
don't present a partial answer as a confident, complete one. \
If the excerpts don't contain anything relevant, say plainly that the vault has no relevant \
note on this — do not fill the gap from general knowledge. \
Note excerpts:\n\n${contextText || '(no notes were retrieved for this question)'}`;

  const start = performance.now();
  const response = await client.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: question }]
  });
  const latencyMs = performance.now() - start;

  const answerText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    contextText,
    retrievedSlugs,
    answerText,
    citedSlugs: extractCitedSlugs(answerText),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    latencyMs
  };
}

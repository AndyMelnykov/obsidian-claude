import Anthropic from '@anthropic-ai/sdk';

const JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'claude-haiku-4-5-20251001';

function groundTruthText(expectedNotes, expectedCertainty) {
  if (expectedCertainty === 'unknown') {
    return 'The vault has no relevant note. The correct behavior is to say plainly that the vault has no relevant information, rather than guessing or answering from general knowledge. There is no expected answer content.';
  }
  if (expectedCertainty === 'partial') {
    return `The vault contains related evidence (${expectedNotes.join(', ')}) but no note explicitly answers this question with full confidence. The correct behavior is to state what the related notes actually say, while being explicit that the vault doesn't directly/fully answer this specific question — not a confident direct answer, and not a claim of total ignorance.`;
  }
  return `The vault contains sufficient evidence to answer confidently. Expected source notes: ${expectedNotes.join(', ')}.`;
}

export async function judge({ question, answerText, contextText, expectedNotes, expectedCertainty }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not set. See eval/harness/.env.example.');
  }
  const client = new Anthropic();

  const prompt = `You are grading one answer from a note-retrieval agent.

Question: ${question}

Ground truth: ${groundTruthText(expectedNotes, expectedCertainty)}

Notes actually available to the agent when it answered:
${contextText || '(none were retrieved)'}

The agent's answer:
${answerText}

Grade the following and respond with ONLY a JSON object, no other text:
{
  "certaintyLabel": "known" | "partial" | "unknown", // the certainty level the agent's own
                               // answer actually conveys: "known" if it answers confidently
                               // and directly, "partial" if it gives related evidence while
                               // flagging that it doesn't fully resolve the question,
                               // "unknown" if it says it has no relevant information
  "certaintyCorrect": boolean, // true if certaintyLabel matches the ground truth's expected
                               // certainty ("${expectedCertainty}") above
  "contentAccuracy": boolean | null, // true/false grading whether the specific facts the
                               // agent stated are actually correct per the notes available to
                               // it, when the ground truth is "known" or "partial"; null when
                               // the ground truth is "unknown" (there is no expected content
                               // to grade)
  "citationsSupported": boolean, // true if every [[wikilink]] the agent cited is actually
                               // among the notes available to it above and actually supports
                               // what the agent claimed; false if it cited nothing when it
                               // should have, or cited something unsupported
  "grounded": boolean,        // true if the answer introduces no claim that isn't present in
                               // the notes available to it (ignoring the "I don't know" case)
  "reasoning": string         // one sentence explaining the verdicts above
}`;

  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge did not return JSON. Raw response: ${text}`);
  }
  return JSON.parse(jsonMatch[0]);
}

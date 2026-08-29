export function retrievalRecallPrecision({ retrievedSlugs, expectedNotes }) {
  if (expectedNotes.length === 0) {
    return { recall: null, precision: null, correctlyAbstained: retrievedSlugs.length === 0 };
  }
  const retrievedSet = new Set(retrievedSlugs);
  const hits = expectedNotes.filter(s => retrievedSet.has(s)).length;
  const recall = hits / expectedNotes.length;
  const precision = retrievedSlugs.length === 0 ? 0 : hits / retrievedSlugs.length;
  return { recall, precision, correctlyAbstained: null };
}

function average(numbers) {
  const valid = numbers.filter(n => typeof n === 'number' && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function aggregate(perQuestionResults) {
  return {
    answerAccuracy: average(perQuestionResults.map(r => (r.answerCorrect ? 1 : 0))),
    citationPrecision: average(perQuestionResults.map(r => (r.citationsSupported ? 1 : 0))),
    avgContextTokens: average(perQuestionResults.map(r => r.inputTokens)),
    avgLatencyMs: average(perQuestionResults.map(r => r.latencyMs)),
    avgRecall: average(perQuestionResults.map(r => r.recall)),
    avgPrecision: average(perQuestionResults.map(r => r.precision))
  };
}

export function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function rankByCosineSimilarity(queryVector, noteVectors, topK) {
  return noteVectors
    .map(({ slug, vector }) => ({ slug, score: cosineSimilarity(queryVector, vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

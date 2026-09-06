export function mergeAndRank({ indexMatchedSlugs, scoredNotes, topK, indexBoost }) {
  if (indexMatchedSlugs.length === 0) return [];

  const indexSet = new Set(indexMatchedSlugs);
  return scoredNotes
    .map(({ slug, score }) => ({
      slug,
      score: score + (indexSet.has(slug) ? indexBoost : 0)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

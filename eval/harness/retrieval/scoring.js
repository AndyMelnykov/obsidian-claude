const STOPWORDS = new Set([
  'a', 'about', 'am', 'an', 'and', 'are', 'as', 'at', 'be', 'between',
  'by', 'did', 'do', 'does', 'for', 'from', 'has', 'have', 'how', 'i',
  'in', 'is', 'it', 'my', 'of', 'on', 'opinion', 'or', 'that', 'the',
  'to', 'view', 'was', 'were', 'what', "what's", 'which', 'who',
  'why', 'with', 'write', 'wrote', 'written'
]);

export function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0 && !STOPWORDS.has(t));
}

export function scoreIndex(questionTokens, indexEntry) {
  const indexTokens = new Set(tokenize(`${indexEntry.title} ${indexEntry.slugs.join(' ')} ${indexEntry.text}`));
  let score = 0;
  for (const t of questionTokens) {
    if (indexTokens.has(t)) score += 1;
  }
  return score;
}

export function pickBestIndexes(questionTokens, indexEntries, threshold = 1) {
  return indexEntries
    .map(entry => ({ ...entry, score: scoreIndex(questionTokens, entry) }))
    .filter(entry => entry.score >= threshold)
    .sort((a, b) => b.score - a.score);
}

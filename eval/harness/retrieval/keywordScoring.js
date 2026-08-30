import { tokenize } from './scoring.js';

export function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.length > 4 && word.endsWith('ing')) return word.slice(0, -3);
  if (word.length > 3 && word.endsWith('ed')) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function tokenizeAndStem(text) {
  return tokenize(text).map(stem);
}

export function buildCorpusStats(docsStems) {
  const totalDocs = docsStems.length;
  const totalLength = docsStems.reduce((sum, stems) => sum + stems.length, 0);
  const avgDocLength = totalDocs === 0 ? 0 : totalLength / totalDocs;

  const docFrequency = {};
  for (const stems of docsStems) {
    for (const term of new Set(stems)) {
      docFrequency[term] = (docFrequency[term] || 0) + 1;
    }
  }

  return { totalDocs, avgDocLength, docFrequency };
}

export function bm25Score(queryStems, docStems, corpusStats, k1 = 1.5, b = 0.75) {
  const { totalDocs, avgDocLength, docFrequency } = corpusStats;
  const docLength = docStems.length;

  const termFreq = {};
  for (const t of docStems) termFreq[t] = (termFreq[t] || 0) + 1;

  let score = 0;
  for (const term of queryStems) {
    const df = docFrequency[term] || 0;
    const tf = termFreq[term] || 0;
    if (df === 0 || tf === 0) continue;

    const idf = Math.log((totalDocs - df + 0.5) / (df + 0.5) + 1);
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
    score += idf * (numerator / denominator);
  }
  return score;
}

export function rankNotes(queryStems, notes) {
  const corpusStats = buildCorpusStats(notes.map(n => n.stems));
  return notes
    .map(note => ({ slug: note.slug, score: bm25Score(queryStems, note.stems, corpusStats) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

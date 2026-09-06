import fs from 'node:fs';
import path from 'node:path';
import { retrieveIndexRouting } from './indexRouting.js';
import { embedText, embedNotesWithCache } from './embeddings.js';
import { rankByCosineSimilarity } from './vectorScoring.js';
import { mergeAndRank } from './hybridScoring.js';

const DEFAULT_TOP_K = 3;
const INDEX_BOOST = 0.15;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function loadNotes(vaultRoot) {
  const noteFiles = walk(path.join(vaultRoot, 'notes')).filter(f => f.endsWith('.md'));
  return noteFiles.map(file => {
    const text = fs.readFileSync(file, 'utf8');
    const slug = path.basename(file, '.md');
    return { slug, text };
  });
}

export async function retrieveHybridSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const { retrievedSlugs: indexMatchedSlugs } = await retrieveIndexRouting(question, vaultRoot);

  const notes = loadNotes(vaultRoot);
  const cachePath = path.join(vaultRoot, '.embeddings', 'notes.json');
  const noteVectors = await embedNotesWithCache(notes, cachePath);
  const questionVector = await embedText(question);
  const scoredNotes = rankByCosineSimilarity(questionVector, noteVectors, noteVectors.length);

  const ranked = mergeAndRank({
    indexMatchedSlugs,
    scoredNotes,
    topK,
    indexBoost: INDEX_BOOST
  });

  if (ranked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const noteBySlug = new Map(notes.map(n => [n.slug, n]));
  const contextParts = ranked.map(({ slug }) => `## [[${slug}]]\n\n${noteBySlug.get(slug).text}`);

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: ranked.map(r => r.slug)
  };
}

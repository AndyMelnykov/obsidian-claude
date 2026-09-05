import fs from 'node:fs';
import path from 'node:path';
import { embedText, embedNotesWithCache } from './embeddings.js';
import { rankByCosineSimilarity } from './vectorScoring.js';

const DEFAULT_TOP_K = 3;

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

export async function retrieveVectorSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const notes = loadNotes(vaultRoot);
  const cachePath = path.join(vaultRoot, '.embeddings', 'notes.json');
  const noteVectors = await embedNotesWithCache(notes, cachePath);
  const questionVector = await embedText(question);
  const ranked = rankByCosineSimilarity(questionVector, noteVectors, topK);

  const noteBySlug = new Map(notes.map(n => [n.slug, n]));
  const contextParts = ranked.map(({ slug }) => `## [[${slug}]]\n\n${noteBySlug.get(slug).text}`);

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: ranked.map(r => r.slug)
  };
}

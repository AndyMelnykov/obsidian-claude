import fs from 'node:fs';
import path from 'node:path';
import { tokenizeAndStem, rankNotes } from './keywordScoring.js';

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
    const titleMatch = text.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;
    return { slug, text, stems: tokenizeAndStem(`${title} ${text}`) };
  });
}

export async function retrieveKeywordSearch(question, vaultRoot, topK = DEFAULT_TOP_K) {
  const queryStems = tokenizeAndStem(question);
  const notes = loadNotes(vaultRoot);
  const ranked = rankNotes(queryStems, notes).slice(0, topK);

  if (ranked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const noteBySlug = new Map(notes.map(n => [n.slug, n]));
  const contextParts = ranked.map(({ slug }) => {
    const note = noteBySlug.get(slug);
    return `## [[${slug}]]\n\n${note.text}`;
  });

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: ranked.map(r => r.slug)
  };
}

import fs from 'node:fs';
import path from 'node:path';
import { tokenize, pickBestIndexes } from './scoring.js';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
}

function loadIndexes(vaultRoot) {
  const indexDir = path.join(vaultRoot, 'indexes');
  return fs.readdirSync(indexDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const text = fs.readFileSync(path.join(indexDir, f), 'utf8');
      const title = f.replace(/\.md$/, '');
      const slugs = [...text.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1]);
      return { title, slugs, text };
    });
}

function buildTitleToSlugMap(vaultRoot) {
  const noteFiles = walk(path.join(vaultRoot, 'notes')).filter(f => f.endsWith('.md'));
  const map = new Map();
  for (const file of noteFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const m = text.match(/^# (.+)$/m);
    if (m) map.set(m[1].trim(), { slug: path.basename(file, '.md'), file, text });
  }
  return map;
}

export async function retrieveIndexRouting(question, vaultRoot) {
  const questionTokens = tokenize(question);
  const indexes = loadIndexes(vaultRoot);
  const picked = pickBestIndexes(questionTokens, indexes, 1);

  if (picked.length === 0) {
    return { contextText: '', retrievedSlugs: [] };
  }

  const titleToSlug = buildTitleToSlugMap(vaultRoot);
  const seenSlugs = new Set();
  const contextParts = [];

  for (const index of picked) {
    for (const linkTitle of index.slugs) {
      const entry = titleToSlug.get(linkTitle);
      if (entry && !seenSlugs.has(entry.slug)) {
        seenSlugs.add(entry.slug);
        contextParts.push(`## [[${entry.slug}]]\n\n${entry.text}`);
      }
    }
  }

  return {
    contextText: contextParts.join('\n\n---\n\n'),
    retrievedSlugs: [...seenSlugs]
  };
}

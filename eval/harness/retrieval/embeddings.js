import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from '@xenova/transformers';

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

let extractorPromise;
function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', MODEL_NAME);
  }
  return extractorPromise;
}

export function hashContent(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

export function loadCache(cachePath) {
  if (!fs.existsSync(cachePath)) return {};
  return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
}

export function saveCache(cachePath, cache) {
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

export async function embedNotesWithCache(notes, cachePath) {
  const cache = loadCache(cachePath);
  const results = [];
  let cacheChanged = false;

  for (const note of notes) {
    const hash = hashContent(note.text);
    const cached = cache[note.slug];
    if (cached && cached.hash === hash) {
      results.push({ slug: note.slug, vector: cached.vector });
      continue;
    }
    const vector = await embedText(note.text);
    cache[note.slug] = { hash, vector };
    cacheChanged = true;
    results.push({ slug: note.slug, vector });
  }

  if (cacheChanged) saveCache(cachePath, cache);
  return results;
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hashContent, loadCache, saveCache } from './embeddings.js';

test('hashContent returns the same hash for identical content', () => {
  assert.equal(hashContent('hello world'), hashContent('hello world'));
});

test('hashContent returns different hashes for different content', () => {
  assert.notEqual(hashContent('hello'), hashContent('world'));
});

test('loadCache returns an empty object when the cache file does not exist', () => {
  const missingPath = path.join(os.tmpdir(), `embeddings-cache-missing-${Date.now()}.json`);
  assert.deepEqual(loadCache(missingPath), {});
});

test('saveCache then loadCache round-trips the cache contents', () => {
  const cachePath = path.join(os.tmpdir(), `embeddings-cache-roundtrip-${Date.now()}.json`);
  const cache = { 'my-note': { hash: 'abc123', vector: [0.1, 0.2, 0.3] } };
  saveCache(cachePath, cache);
  assert.deepEqual(loadCache(cachePath), cache);
  fs.unlinkSync(cachePath);
});

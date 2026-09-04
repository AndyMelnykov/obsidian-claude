import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cosineSimilarity, rankByCosineSimilarity } from './vectorScoring.js';

test('cosineSimilarity returns 1 for identical vectors', () => {
  assert.equal(cosineSimilarity([1, 0, 0], [1, 0, 0]), 1);
});

test('cosineSimilarity returns 0 for orthogonal vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test('cosineSimilarity returns -1 for opposite vectors', () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test('cosineSimilarity returns 0 when either vector is all zeros', () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity([1, 1], [0, 0]), 0);
});

test('rankByCosineSimilarity sorts descending and slices to topK', () => {
  const query = [1, 0];
  const noteVectors = [
    { slug: 'far', vector: [0, 1] },
    { slug: 'near', vector: [1, 0] },
    { slug: 'mid', vector: [1, 1] }
  ];
  const ranked = rankByCosineSimilarity(query, noteVectors, 2);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'near');
  assert.equal(ranked[1].slug, 'mid');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('rankByCosineSimilarity returns all notes when topK exceeds the count', () => {
  const query = [1, 0];
  const noteVectors = [{ slug: 'a', vector: [1, 0] }];
  const ranked = rankByCosineSimilarity(query, noteVectors, 5);
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].slug, 'a');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeAndRank } from './hybridScoring.js';

test('returns an empty array when indexMatchedSlugs is empty (abstention gate)', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: [],
    scoredNotes: [{ slug: 'a', score: 0.9 }, { slug: 'b', score: 0.8 }],
    topK: 3,
    indexBoost: 0.15
  });
  assert.deepEqual(ranked, []);
});

test('adds indexBoost only to notes in indexMatchedSlugs and reranks accordingly', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['b'],
    scoredNotes: [{ slug: 'a', score: 0.5 }, { slug: 'b', score: 0.4 }],
    topK: 2,
    indexBoost: 0.15
  });
  assert.equal(ranked[0].slug, 'b');
  assert.equal(ranked[0].score, 0.55);
  assert.equal(ranked[1].slug, 'a');
  assert.equal(ranked[1].score, 0.5);
});

test('sorts descending and slices to topK after boosting', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['a', 'b'],
    scoredNotes: [
      { slug: 'a', score: 0.3 },
      { slug: 'b', score: 0.6 },
      { slug: 'c', score: 0.2 }
    ],
    topK: 2,
    indexBoost: 0.15
  });
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'b');
  assert.equal(ranked[1].slug, 'a');
});

test('returns all scored notes when topK exceeds the count', () => {
  const ranked = mergeAndRank({
    indexMatchedSlugs: ['a'],
    scoredNotes: [{ slug: 'a', score: 0.5 }],
    topK: 5,
    indexBoost: 0.15
  });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].slug, 'a');
});

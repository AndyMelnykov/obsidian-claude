import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stem, tokenizeAndStem, buildCorpusStats, bm25Score, rankNotes } from './keywordScoring.js';

test('stem strips common inflectional suffixes', () => {
  assert.equal(stem('agents'), 'agent');
  assert.equal(stem('documenting'), 'document');
  assert.equal(stem('documented'), 'document');
  assert.equal(stem('categories'), 'category');
  assert.equal(stem('boxes'), 'box');
  assert.equal(stem('notes'), 'note');
  assert.equal(stem('changes'), 'change');
});

test('stem leaves words with no matching suffix, or a double-s ending, unchanged', () => {
  assert.equal(stem('class'), 'class');
  assert.equal(stem('mcp'), 'mcp');
});

test('tokenizeAndStem tokenizes (stopwords removed) then stems each token', () => {
  const result = tokenizeAndStem('What did I conclude about documented agents?');
  assert.deepEqual(result, ['conclude', 'document', 'agent']);
});

test('buildCorpusStats computes totalDocs, avgDocLength, and per-term document frequency', () => {
  const docsStems = [
    ['mcp', 'authorization', 'scope'],
    ['mcp', 'security', 'tool'],
    ['agent', 'context', 'engine']
  ];
  const stats = buildCorpusStats(docsStems);
  assert.equal(stats.totalDocs, 3);
  assert.equal(stats.avgDocLength, 3);
  assert.deepEqual(stats.docFrequency, {
    mcp: 2, authorization: 1, scope: 1,
    security: 1, tool: 1,
    agent: 1, context: 1, engine: 1
  });
});

test('bm25Score is sensitive to term frequency saturation (k1) and document-length normalization (b)', () => {
  // doc1: length 4, 'mcp' appears twice (tf=2) — term-frequency saturation matters here
  // doc2: length 2 (shorter than avgDocLength=4) — length normalization matters here
  // doc3: length 6, no query terms — must score 0 and be filtered by rankNotes
  const corpusStats = {
    totalDocs: 3,
    avgDocLength: 4,
    docFrequency: {
      mcp: 2, authorization: 1, scope: 1,
      security: 1,
      agent: 1, context: 1, engine: 1, model: 1, value: 1
    }
  };
  const queryStems = ['mcp', 'authorization'];

  const doc1Stems = ['mcp', 'authorization', 'mcp', 'scope'];
  const doc2Stems = ['mcp', 'security'];
  const doc3Stems = ['agent', 'context', 'engine', 'agent', 'model', 'value'];

  // Golden values computed independently from the textbook BM25 formula
  // (k1=1.5, b=0.75) for this exact fixture — not derived by calling bm25Score.
  const expectedDoc1Score = 1.652263009077063;
  const expectedDoc2Score = 0.6064562958009491;
  const expectedDoc3Score = 0;

  const actualDoc1Score = bm25Score(queryStems, doc1Stems, corpusStats);
  const actualDoc2Score = bm25Score(queryStems, doc2Stems, corpusStats);
  const actualDoc3Score = bm25Score(queryStems, doc3Stems, corpusStats);

  assert.ok(Math.abs(actualDoc1Score - expectedDoc1Score) < 1e-9,
    `doc1: expected ${expectedDoc1Score}, got ${actualDoc1Score}`);
  assert.ok(Math.abs(actualDoc2Score - expectedDoc2Score) < 1e-9,
    `doc2: expected ${expectedDoc2Score}, got ${actualDoc2Score}`);
  assert.equal(actualDoc3Score, expectedDoc3Score);
});

test('rankNotes filters out zero-score notes and sorts the rest descending, regardless of input order', () => {
  // Input order is deliberately NOT in score order (doc3, doc2, doc1) so that
  // deleting rankNotes' .sort() call would make this test fail.
  const notes = [
    { slug: 'doc3', stems: ['agent', 'context', 'engine', 'agent', 'model', 'value'] },
    { slug: 'doc2', stems: ['mcp', 'security'] },
    { slug: 'doc1', stems: ['mcp', 'authorization', 'mcp', 'scope'] }
  ];
  const ranked = rankNotes(['mcp', 'authorization'], notes);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'doc1');
  assert.equal(ranked[1].slug, 'doc2');
  assert.ok(ranked[0].score > ranked[1].score);
});

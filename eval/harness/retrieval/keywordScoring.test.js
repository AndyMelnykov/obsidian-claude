import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stem, tokenizeAndStem, buildCorpusStats, bm25Score, rankNotes } from './keywordScoring.js';

test('stem strips common inflectional suffixes', () => {
  assert.equal(stem('agents'), 'agent');
  assert.equal(stem('documenting'), 'document');
  assert.equal(stem('documented'), 'document');
  assert.equal(stem('categories'), 'category');
  assert.equal(stem('boxes'), 'box');
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

test('bm25Score matches the textbook BM25 formula for a known corpus and query', () => {
  const corpusStats = {
    totalDocs: 3,
    avgDocLength: 3,
    docFrequency: {
      mcp: 2, authorization: 1, scope: 1,
      security: 1, tool: 1,
      agent: 1, context: 1, engine: 1
    }
  };
  const k1 = 1.5;
  const b = 0.75;
  const docLength = 3;

  function expectedTermScore(term, tf) {
    const df = corpusStats.docFrequency[term] || 0;
    const idf = Math.log((corpusStats.totalDocs - df + 0.5) / (df + 0.5) + 1);
    return idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLength / corpusStats.avgDocLength)));
  }

  const doc1Stems = ['mcp', 'authorization', 'scope'];
  const expectedDoc1Score = expectedTermScore('mcp', 1) + expectedTermScore('authorization', 1);
  const actualDoc1Score = bm25Score(['mcp', 'authorization'], doc1Stems, corpusStats, k1, b);
  assert.ok(Math.abs(actualDoc1Score - expectedDoc1Score) < 1e-9);

  const doc2Stems = ['mcp', 'security', 'tool'];
  const expectedDoc2Score = expectedTermScore('mcp', 1); // 'authorization' has tf=0 in doc2, contributes 0
  const actualDoc2Score = bm25Score(['mcp', 'authorization'], doc2Stems, corpusStats, k1, b);
  assert.ok(Math.abs(actualDoc2Score - expectedDoc2Score) < 1e-9);
});

test('rankNotes filters out zero-score notes and sorts the rest descending', () => {
  const notes = [
    { slug: 'doc1', stems: ['mcp', 'authorization', 'scope'] },
    { slug: 'doc2', stems: ['mcp', 'security', 'tool'] },
    { slug: 'doc3', stems: ['agent', 'context', 'engine'] }
  ];
  const ranked = rankNotes(['mcp', 'authorization'], notes);
  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].slug, 'doc1');
  assert.equal(ranked[1].slug, 'doc2');
  assert.ok(ranked[0].score > ranked[1].score);
});

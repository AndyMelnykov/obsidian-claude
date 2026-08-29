import { test } from 'node:test';
import assert from 'node:assert/strict';
import { retrievalRecallPrecision, aggregate } from './metrics.js';

test('recall/precision for a normal question with expected notes', () => {
  const result = retrievalRecallPrecision({
    retrievedSlugs: ['mcp-authorization', 'mcp-security'],
    expectedNotes: ['mcp-authorization']
  });
  assert.equal(result.recall, 1);
  assert.equal(result.precision, 0.5);
  assert.equal(result.correctlyAbstained, null);
});

test('recall is 0 when the expected note was not retrieved', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: [], expectedNotes: ['mcp-authorization'] });
  assert.equal(result.recall, 0);
  assert.equal(result.precision, 0);
});

test('negative-knowledge question with correct abstention', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: [], expectedNotes: [] });
  assert.equal(result.recall, null);
  assert.equal(result.precision, null);
  assert.equal(result.correctlyAbstained, true);
});

test('negative-knowledge question with incorrect over-retrieval', () => {
  const result = retrievalRecallPrecision({ retrievedSlugs: ['some-note'], expectedNotes: [] });
  assert.equal(result.correctlyAbstained, false);
});

test('aggregate computes averages across per-question results', () => {
  const rows = [
    { answerCorrect: true, citationsSupported: true, inputTokens: 1000, latencyMs: 1500, recall: 1, precision: 1 },
    { answerCorrect: false, citationsSupported: true, inputTokens: 2000, latencyMs: 2500, recall: 0.5, precision: 1 }
  ];
  const agg = aggregate(rows);
  assert.equal(agg.answerAccuracy, 0.5);
  assert.equal(agg.citationPrecision, 1);
  assert.equal(agg.avgContextTokens, 1500);
  assert.equal(agg.avgLatencyMs, 2000);
  assert.equal(agg.avgRecall, 0.75);
  assert.equal(agg.avgPrecision, 1);
});

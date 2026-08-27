import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize, scoreIndex, pickBestIndexes } from './scoring.js';

test('tokenize lowercases and strips punctuation and stopwords', () => {
  const tokens = tokenize("What did I conclude about MCP authorization?");
  assert.deepEqual(tokens, ['conclude', 'mcp', 'authorization']);
});

test('scoreIndex counts overlap between question tokens and index title+slugs+text', () => {
  const index = {
    title: 'AI Agents',
    slugs: ['mcp-authorization', 'mcp-security'],
    text: 'MCP authorization least capability scoping'
  };
  const score = scoreIndex(['mcp', 'authorization'], index);
  assert.ok(score > 0, 'expected a positive score for overlapping tokens');
});

test('scoreIndex returns 0 for no overlap', () => {
  const index = { title: 'Product', slugs: ['product-development-with-agents'], text: 'operating model' };
  const score = scoreIndex(['quantum', 'hardware'], index);
  assert.equal(score, 0);
});

test('pickBestIndexes returns only indexes at or above threshold, highest first', () => {
  const indexes = [
    { title: 'AI Agents', slugs: [], text: 'mcp authorization least capability' },
    { title: 'Product', slugs: [], text: 'operating model context' }
  ];
  const picked = pickBestIndexes(['mcp', 'authorization'], indexes, 1);
  assert.equal(picked.length, 1);
  assert.equal(picked[0].title, 'AI Agents');
});

test('pickBestIndexes returns empty array when nothing meets threshold', () => {
  const indexes = [{ title: 'AI Agents', slugs: [], text: 'mcp authorization' }];
  const picked = pickBestIndexes(['quantum', 'hardware'], indexes, 1);
  assert.deepEqual(picked, []);
});

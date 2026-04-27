import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_MIN_WHALE_AMOUNT, getMinWhaleAmount, parseMinWhaleAmount } from '../lib/config.js';

test('parseMinWhaleAmount returns the default for invalid values', () => {
  assert.equal(parseMinWhaleAmount(undefined), DEFAULT_MIN_WHALE_AMOUNT);
  assert.equal(parseMinWhaleAmount(''), DEFAULT_MIN_WHALE_AMOUNT);
  assert.equal(parseMinWhaleAmount('abc'), DEFAULT_MIN_WHALE_AMOUNT);
  assert.equal(parseMinWhaleAmount('-1'), DEFAULT_MIN_WHALE_AMOUNT);
});

test('parseMinWhaleAmount accepts positive numeric values', () => {
  assert.equal(parseMinWhaleAmount('250000'), 250000);
  assert.equal(parseMinWhaleAmount(42), 42);
});

test('getMinWhaleAmount reads STX_WHALE_THRESHOLD from env', () => {
  assert.equal(getMinWhaleAmount({ STX_WHALE_THRESHOLD: '150000' }), 150000);
  assert.equal(getMinWhaleAmount({}), DEFAULT_MIN_WHALE_AMOUNT);
});

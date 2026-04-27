import test from 'node:test';
import assert from 'node:assert/strict';

import { matchesSubscription, normalizeSubscriptionInput } from '../lib/subscriptions.js';

test('normalizeSubscriptionInput cleans addresses and channels', () => {
  const subscription = normalizeSubscriptionInput({
    name: ' Ops ',
    minAmount: '250000',
    watchedAddresses: ['sp123', ' SP123 ', 'sp999'],
    channels: [{ type: 'webhook', url: 'https://example.com/a' }, { type: 'discord', target: 'https://discord.test' }],
  });

  assert.equal(subscription.name, 'Ops');
  assert.equal(subscription.minAmount, 250000);
  assert.deepEqual(subscription.watchedAddresses, ['SP123', 'SP999']);
  assert.equal(subscription.channels.length, 2);
});

test('matchesSubscription respects amount threshold and watched addresses', () => {
  const subscription = normalizeSubscriptionInput({
    minAmount: 100000,
    watchedAddresses: ['SPSENDER'],
    channels: [{ type: 'webhook', url: 'https://example.com/a' }],
  });

  assert.equal(matchesSubscription(subscription, { amount: 99999, sender: 'SPSENDER', recipient: 'SPRECIPIENT' }), false);
  assert.equal(matchesSubscription(subscription, { amount: 100001, sender: 'SPOTHER', recipient: 'SPRECIPIENT' }), false);
  assert.equal(matchesSubscription(subscription, { amount: 100001, sender: 'SPSENDER', recipient: 'SPRECIPIENT' }), true);
});

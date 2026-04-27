import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { createStore } from '../lib/store.js';

test('store persists seen transactions and alerts', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stx-whale-store-'));
  const store = createStore({ dataDir });
  const storage = await store.healthCheck();

  assert.equal(storage.ok, true);
  assert.equal(storage.mode, 'file');

  assert.equal(await store.hasSeenTransaction('0xabc'), false);
  await store.markTransactionSeen('0xabc');
  assert.equal(await store.hasSeenTransaction('0xabc'), true);

  const alert = await store.appendAlert({ txId: '0xabc', amount: 123456 });
  const alerts = await store.listAlerts();
  assert.equal(alerts[0].id, alert.id);
  assert.equal(alerts[0].txId, '0xabc');

  fs.rmSync(dataDir, { recursive: true, force: true });
});

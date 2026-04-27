import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { generateWhaleAlertImage } from '../lib/image-generator.js';

test('generateWhaleAlertImage writes a PNG file', async () => {
  const outputPath = path.join(os.tmpdir(), `whale-alert-test-${Date.now()}.png`);

  await generateWhaleAlertImage({
    amount: 284_750,
    classification: '🐋 Humpback Whale',
    usdAmount: '$657,772.50',
    sender: 'binance.btc',
    recipient: 'mega-vault.stx',
    outputPath,
  });

  const image = fs.readFileSync(outputPath);
  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');

  fs.unlinkSync(outputPath);
});

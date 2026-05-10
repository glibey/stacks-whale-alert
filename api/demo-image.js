import fs from 'fs';
import os from 'os';
import path from 'path';

import { demoAlert } from '../lib/demo-data.js';
import { methodNotAllowed } from '../lib/http.js';
import { generateWhaleAlertImage } from '../lib/image-generator.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const outputPath = path.join(os.tmpdir(), `whale-alert-preview-${Date.now()}.png`);

  try {
    const imagePath = await generateWhaleAlertImage({
      amount: demoAlert.amount,
      classification: demoAlert.classification,
      usdAmount: demoAlert.usdAmount,
      sender: demoAlert.sender,
      recipient: demoAlert.recipient,
      outputPath,
    });

    const image = fs.readFileSync(imagePath);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(image);
  } catch (error) {
    console.error('[api] /api/demo-image error:', error);
    res.status(500).json({ error: 'Failed to generate demo image' });
  } finally {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

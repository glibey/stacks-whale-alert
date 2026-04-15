import path from 'path';
import { demoAlert, buildDemoMessage } from '../lib/demo-data.js';
import { generateWhaleAlertImage } from '../lib/image-generator.js';

const outputPath = path.join(process.cwd(), 'demo-whale-alert.png');

const run = async () => {
  const imagePath = await generateWhaleAlertImage({
    amount: demoAlert.amount,
    classification: demoAlert.classification,
    usdAmount: demoAlert.usdAmount,
    sender: demoAlert.sender,
    recipient: demoAlert.recipient,
    outputPath,
  });

  console.log(`Demo image generated: ${imagePath}`);
  console.log('');
  console.log(buildDemoMessage());
};

run().catch((error) => {
  console.error('Failed to generate demo whale alert:', error.message);
  process.exitCode = 1;
});

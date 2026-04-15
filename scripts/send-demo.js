import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { TwitterApi } from 'twitter-api-v2';
import { demoAlert, buildDemoMessage } from '../lib/demo-data.js';
import { generateWhaleAlertImage } from '../lib/image-generator.js';

const OUTPUT_PATH = path.join(process.cwd(), 'demo-whale-alert.png');

const requiredEnv = [
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
];

const validateEnv = () => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

const generateImage = async () =>
  generateWhaleAlertImage({
    amount: demoAlert.amount,
    classification: demoAlert.classification,
    usdAmount: demoAlert.usdAmount,
    sender: demoAlert.sender,
    recipient: demoAlert.recipient,
    outputPath: OUTPUT_PATH,
  });

const sendToTelegram = async (message, imagePath) => {
  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  form.append('caption', message);
  form.append('photo', new Blob([fs.readFileSync(imagePath)]), path.basename(imagePath));

  await axios.post(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendPhoto`,
    form,
    {
      headers: {
        ...form.getHeaders?.(),
      },
      maxBodyLength: Infinity,
    }
  );
};

const sendToX = async (message, imagePath) => {
  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });

  const mediaId = await client.v1.uploadMedia(imagePath);
  await client.v2.tweet({
    text: message,
    media: { media_ids: [mediaId] },
  });
};

const main = async () => {
  validateEnv();
  const message = buildDemoMessage();
  const imagePath = await generateImage();

  try {
    await sendToTelegram(message, imagePath);
    console.log('Demo image sent to Telegram.');

    await sendToX(message, imagePath);
    console.log('Demo image sent to X.');
  } finally {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }
};

main().catch((error) => {
  console.error('Failed to send demo alert:', error.message);
  process.exitCode = 1;
});

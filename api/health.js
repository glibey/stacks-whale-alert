import 'dotenv/config';
import { createStore } from '../lib/store.js';
import { methodNotAllowed, sendJson } from '../lib/http.js';

const requiredEnvKeys = [
  'COINMARKETCAP_API_KEY',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_SECRET',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    const store = createStore();
    const storage = await store.healthCheck();
    const env = {
      configured: requiredEnvKeys.filter((key) => Boolean(process.env[key])),
      missing: requiredEnvKeys.filter((key) => !process.env[key]),
      telegramEnabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
      databaseConfigured: Boolean(process.env.DATABASE_URL),
    };

    return sendJson(res, 200, {
      ok: true,
      storage,
      env,
      cron: {
        path: '/api/check-transfers',
        schedule: '0 10 * * *',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return sendJson(res, 500, {
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

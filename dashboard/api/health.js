import { createStore } from '../server/store.js';

const requiredEnvKeys = [
  'COINMARKETCAP_API_KEY',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_SECRET',
];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use: GET' });
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

    return res.status(200).json({
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
    return res.status(500).json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

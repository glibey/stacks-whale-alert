import 'dotenv/config';
import { sendJson, methodNotAllowed } from '../lib/http.js';
import { createStore } from '../lib/store.js';

const store = createStore();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const limit = Number(req.query?.limit || 100);
  const alerts = await store.listAlerts({ limit: Number.isFinite(limit) ? limit : 100 });
  return sendJson(res, 200, { alerts });
}

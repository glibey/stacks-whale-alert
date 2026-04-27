import 'dotenv/config';
import { methodNotAllowed, sendJson } from '../lib/http.js';
import { planCatalog } from '../lib/plans.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  return sendJson(res, 200, { plans: planCatalog });
}

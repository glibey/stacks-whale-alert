import 'dotenv/config';
import { methodNotAllowed, parseRequestBody, sendJson } from '../lib/http.js';
import { createStore } from '../lib/store.js';

const store = createStore();

const normalizeEntry = (input) => ({
  address: String(input?.address || '').trim().toUpperCase(),
  label: String(input?.label || '').trim(),
});

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, { walletLabels: await store.listWalletLabels() });
  }

  if (req.method === 'POST') {
    const input = normalizeEntry(parseRequestBody(req));
    if (!input.address || !input.label) {
      return sendJson(res, 400, { error: 'Both address and label are required' });
    }

    const walletLabels = await store.listWalletLabels();
    const nextWalletLabels = [
      input,
      ...walletLabels.filter((entry) => entry.address !== input.address),
    ];
    await store.saveWalletLabels(nextWalletLabels);
    return sendJson(res, 201, { walletLabel: input });
  }

  if (req.method === 'DELETE') {
    const address = String(req.query?.address || '').trim().toUpperCase();
    if (!address) {
      return sendJson(res, 400, { error: 'Missing address' });
    }

    const walletLabels = await store.listWalletLabels();
    await store.saveWalletLabels(walletLabels.filter((entry) => entry.address !== address));
    return sendJson(res, 200, { deleted: address });
  }

  return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
}

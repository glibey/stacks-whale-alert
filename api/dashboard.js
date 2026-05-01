import 'dotenv/config';
import axios from 'axios';
import { sendJson, methodNotAllowed } from '../lib/http.js';
import { createStore } from '../lib/store.js';

const STACKS_API_URL = 'https://api.hiro.so/extended/v1/tx';
const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/24hr?symbol=STXUSDT';

const classify = (amount) => {
  if (amount >= 500000) return { label: 'Mega Whale', icon: '🐳' };
  if (amount >= 250000) return { label: 'Humpback Whale', icon: '🐋' };
  if (amount >= 100000) return { label: 'Whale', icon: '🦈' };
  if (amount >= 50000) return { label: 'Shark', icon: '🦈' };
  if (amount >= 5000) return { label: 'Dolphin', icon: '🐬' };
  return { label: 'Regular Transfer', icon: '🐠' };
};

const formatAddress = (value) => {
  if (!value) {
    return 'Unknown';
  }

  const address = String(value);
  if (address.length <= 14) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const parseLimit = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 250);
};

const mapTransaction = (tx) => {
  const amount = Number(tx?.token_transfer?.amount || 0) / 1e6;
  return {
    id: tx.tx_id,
    amount,
    sender: tx?.token_transfer?.sender_address || tx?.sender_address || 'Unknown',
    recipient: tx?.token_transfer?.recipient_address || 'Contract/Unknown',
    timestamp: tx?.block_time || null,
    timestampIso: tx?.block_time_iso || null,
    classification: classify(amount),
  };
};

const mapAlert = (alert) => {
  const timestampIso = alert.createdAt || null;
  const timestamp = timestampIso ? Math.floor(new Date(timestampIso).getTime() / 1000) : null;

  return {
    id: alert.txId || alert.id,
    amount: Number(alert.amount || 0),
    sender: alert.senderDisplay || formatAddress(alert.sender),
    recipient: alert.recipientDisplay || formatAddress(alert.recipient),
    timestamp,
    timestampIso,
    classification: {
      label: String(alert.classification || 'Whale').replace(/^[^\p{L}\p{N}]+/u, '').trim() || 'Whale',
      icon: String(alert.classification || '').match(/^[^\p{L}\p{N}]+/u)?.[0]?.trim() || '🐋',
    },
  };
};

const fetchPrice = async () => {
  const { data } = await axios.get(BINANCE_TICKER_URL, { timeout: 10000 });
  return {
    price: Number.parseFloat(data.lastPrice),
    change: Number.parseFloat(data.priceChangePercent),
  };
};

const fetchTransactions = async (limit) => {
  const { data } = await axios.get(STACKS_API_URL, {
    timeout: 10000,
    params: {
      unanchored: true,
      sort: 'desc',
      limit,
      type: 'token_transfer',
    },
  });

  const transactions = (data.results || [])
    .map(mapTransaction)
    .filter((tx) => tx.classification.label !== 'Regular Transfer');

  return transactions.slice(0, 15);
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const store = createStore();
  const hiroLimit = parseLimit(req.query?.limit, 200);

  try {
    const [priceResult, liveTransactionsResult, alertsResult] = await Promise.allSettled([
      fetchPrice(),
      fetchTransactions(hiroLimit),
      store.listAlerts({ limit: 15 }),
    ]);

    const liveTransactions = liveTransactionsResult.status === 'fulfilled' ? liveTransactionsResult.value : [];
    const storedAlerts = alertsResult.status === 'fulfilled' ? alertsResult.value : [];
    const fallbackTransactions = storedAlerts.map(mapAlert).slice(0, 15);
    const transactions = liveTransactions.length > 0 ? liveTransactions : fallbackTransactions;

    return sendJson(res, 200, {
      ok: true,
      transactions,
      price: priceResult.status === 'fulfilled' ? priceResult.value : null,
      source: liveTransactions.length > 0 ? 'hiro' : 'alerts',
      warnings: [
        ...(priceResult.status === 'rejected' ? ['price_unavailable'] : []),
        ...(liveTransactionsResult.status === 'rejected' ? ['live_feed_unavailable'] : []),
        ...(alertsResult.status === 'rejected' ? ['alerts_unavailable'] : []),
      ],
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

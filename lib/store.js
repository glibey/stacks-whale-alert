import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { createPostgresStore } from './postgres-store.js';

const DEFAULT_DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'stx-whale-alert-data')
  : path.join(process.cwd(), 'data');

const defaultCollections = {
  alerts: [],
  seenTransactions: [],
  subscriptions: [],
  walletLabels: [],
};

const collectionPath = (dataDir, name) => path.join(dataDir, `${name}.json`);

export const createStore = ({ dataDir = process.env.DATA_DIR || DEFAULT_DATA_DIR } = {}) => {
  if (process.env.DATABASE_URL) {
    return createPostgresStore();
  }

  const cache = new Map();
  const getStorageInfo = () => ({
    mode: 'file',
    durable: !process.env.VERCEL,
    dataDir,
  });
  const healthCheck = async () => {
    await ensureDataDir();
    return {
      ok: true,
      ...getStorageInfo(),
    };
  };

  const ensureDataDir = async () => {
    await fs.mkdir(dataDir, { recursive: true });
  };

  const loadCollection = async (name) => {
    if (cache.has(name)) {
      return cache.get(name);
    }

    await ensureDataDir();
    const filePath = collectionPath(dataDir, name);

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      cache.set(name, parsed);
      return parsed;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }

      const fallback = structuredClone(defaultCollections[name] ?? []);
      cache.set(name, fallback);
      return fallback;
    }
  };

  const saveCollection = async (name, value) => {
    await ensureDataDir();
    const filePath = collectionPath(dataDir, name);
    cache.set(name, value);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2));
    return value;
  };

  const getSeenTransactions = async () => loadCollection('seenTransactions');
  const markTransactionSeen = async (txId) => {
    const seenTransactions = await getSeenTransactions();
    if (!seenTransactions.includes(txId)) {
      seenTransactions.push(txId);
      await saveCollection('seenTransactions', seenTransactions);
    }
  };

  const hasSeenTransaction = async (txId) => {
    const seenTransactions = await getSeenTransactions();
    return seenTransactions.includes(txId);
  };

  const appendAlert = async (alert) => {
    const alerts = await loadCollection('alerts');
    const nextAlert = {
      id: alert.id || randomUUID(),
      createdAt: alert.createdAt || new Date().toISOString(),
      deliveryAttempts: alert.deliveryAttempts || [],
      ...alert,
    };
    alerts.unshift(nextAlert);
    await saveCollection('alerts', alerts.slice(0, 1000));
    return nextAlert;
  };

  const updateAlert = async (alertId, updater) => {
    const alerts = await loadCollection('alerts');
    const index = alerts.findIndex((alert) => alert.id === alertId);
    if (index === -1) {
      return null;
    }

    const nextAlert = typeof updater === 'function' ? updater(alerts[index]) : { ...alerts[index], ...updater };
    alerts[index] = nextAlert;
    await saveCollection('alerts', alerts);
    return nextAlert;
  };

  const listAlerts = async ({ limit = 100 } = {}) => {
    const alerts = await loadCollection('alerts');
    return alerts.slice(0, limit);
  };

  const listSubscriptions = async () => loadCollection('subscriptions');
  const saveSubscriptions = async (subscriptions) => saveCollection('subscriptions', subscriptions);

  const listWalletLabels = async () => loadCollection('walletLabels');
  const saveWalletLabels = async (walletLabels) => saveCollection('walletLabels', walletLabels);

  return {
    dataDir,
    appendAlert,
    getStorageInfo,
    hasSeenTransaction,
    healthCheck,
    listAlerts,
    listSubscriptions,
    listWalletLabels,
    markTransactionSeen,
    saveSubscriptions,
    saveWalletLabels,
    updateAlert,
  };
};

import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }

  return neon(process.env.DATABASE_URL);
};

let initialized = false;

const ensureSchema = async () => {
  if (initialized) {
    return;
  }

  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS seen_transactions (
      tx_id TEXT PRIMARY KEY,
      seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload JSONB NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS alerts_created_at_idx ON alerts (created_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      payload JSONB NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS subscriptions_updated_at_idx ON subscriptions (updated_at DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS wallet_labels (
      address TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS wallet_labels_updated_at_idx ON wallet_labels (updated_at DESC)`;
  initialized = true;
};

export const createPostgresStore = () => {
  const getStorageInfo = () => ({
    mode: 'postgres',
    durable: true,
  });

  const healthCheck = async () => {
    await ensureSchema();
    const sql = getSql();
    await sql`SELECT 1`;
    return {
      ok: true,
      ...getStorageInfo(),
    };
  };

  const appendAlert = async (alert) => {
    await ensureSchema();
    const sql = getSql();
    const nextAlert = {
      id: alert.id || randomUUID(),
      createdAt: alert.createdAt || new Date().toISOString(),
      deliveryAttempts: alert.deliveryAttempts || [],
      ...alert,
    };

    await sql`
      INSERT INTO alerts (id, created_at, payload)
      VALUES (${nextAlert.id}, ${nextAlert.createdAt}, ${JSON.stringify(nextAlert)}::jsonb)
    `;
    return nextAlert;
  };

  const updateAlert = async (alertId, updater) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT payload FROM alerts WHERE id = ${alertId} LIMIT 1`;
    if (rows.length === 0) {
      return null;
    }

    const currentAlert = rows[0].payload;
    const nextAlert = typeof updater === 'function' ? updater(currentAlert) : { ...currentAlert, ...updater };

    await sql`
      UPDATE alerts
      SET payload = ${JSON.stringify(nextAlert)}::jsonb
      WHERE id = ${alertId}
    `;
    return nextAlert;
  };

  const listAlerts = async ({ limit = 100 } = {}) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT payload
      FROM alerts
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows.map((row) => row.payload);
  };

  const hasSeenTransaction = async (txId) => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`SELECT 1 FROM seen_transactions WHERE tx_id = ${txId} LIMIT 1`;
    return rows.length > 0;
  };

  const markTransactionSeen = async (txId) => {
    await ensureSchema();
    const sql = getSql();
    await sql`
      INSERT INTO seen_transactions (tx_id)
      VALUES (${txId})
      ON CONFLICT (tx_id) DO NOTHING
    `;
  };

  const listSubscriptions = async () => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT payload
      FROM subscriptions
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => row.payload);
  };

  const saveSubscriptions = async (subscriptions) => {
    await ensureSchema();
    const sql = getSql();
    const incomingIds = subscriptions.map((subscription) => subscription.id);
    if (incomingIds.length > 0) {
      await sql`
        DELETE FROM subscriptions
        WHERE NOT (id = ANY(${incomingIds}))
      `;
    } else {
      await sql`DELETE FROM subscriptions`;
    }

    for (const subscription of subscriptions) {
      await sql`
        INSERT INTO subscriptions (id, updated_at, payload)
        VALUES (
          ${subscription.id},
          ${subscription.updatedAt || new Date().toISOString()},
          ${JSON.stringify(subscription)}::jsonb
        )
        ON CONFLICT (id)
        DO UPDATE SET
          updated_at = EXCLUDED.updated_at,
          payload = EXCLUDED.payload
      `;
    }

    return subscriptions;
  };

  const listWalletLabels = async () => {
    await ensureSchema();
    const sql = getSql();
    const rows = await sql`
      SELECT address, label, updated_at
      FROM wallet_labels
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => ({
      address: row.address,
      label: row.label,
      updatedAt: row.updated_at,
    }));
  };

  const saveWalletLabels = async (walletLabels) => {
    await ensureSchema();
    const sql = getSql();
    const incomingAddresses = walletLabels.map((entry) => entry.address);
    if (incomingAddresses.length > 0) {
      await sql`
        DELETE FROM wallet_labels
        WHERE NOT (address = ANY(${incomingAddresses}))
      `;
    } else {
      await sql`DELETE FROM wallet_labels`;
    }

    for (const entry of walletLabels) {
      await sql`
        INSERT INTO wallet_labels (address, label, updated_at)
        VALUES (
          ${entry.address},
          ${entry.label},
          ${entry.updatedAt || new Date().toISOString()}
        )
        ON CONFLICT (address)
        DO UPDATE SET
          label = EXCLUDED.label,
          updated_at = EXCLUDED.updated_at
      `;
    }

    return walletLabels;
  };

  return {
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

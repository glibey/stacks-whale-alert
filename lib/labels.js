const envLabels = (env = process.env) => {
  if (!env.KNOWN_WALLET_LABELS_JSON) {
    return {};
  }

  try {
    const parsed = JSON.parse(env.KNOWN_WALLET_LABELS_JSON);
    return Object.fromEntries(
      Object.entries(parsed).map(([address, label]) => [String(address).toUpperCase(), String(label)])
    );
  } catch (error) {
    console.error('[labels] Failed to parse KNOWN_WALLET_LABELS_JSON:', error.message);
    return {};
  }
};

export const createLabelResolver = ({ staticLabels = {}, store, env = process.env } = {}) => {
  const staticIndex = Object.fromEntries(
    Object.entries(staticLabels).map(([address, label]) => [String(address).toUpperCase(), label])
  );

  const getWalletLabelsIndex = async () => {
    const persisted = await store.listWalletLabels();
    const persistedIndex = Object.fromEntries(
      persisted.map((entry) => [String(entry.address).toUpperCase(), String(entry.label)])
    );

    return {
      ...staticIndex,
      ...envLabels(env),
      ...persistedIndex,
    };
  };

  const resolveLabel = async (address) => {
    const normalizedAddress = String(address || '').toUpperCase();
    if (!normalizedAddress) {
      return null;
    }

    const index = await getWalletLabelsIndex();
    return index[normalizedAddress] || null;
  };

  return {
    getWalletLabelsIndex,
    resolveLabel,
  };
};

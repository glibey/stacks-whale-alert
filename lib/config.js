const DEFAULT_MIN_WHALE_AMOUNT = 100_000;

export const parseMinWhaleAmount = (value, fallback = DEFAULT_MIN_WHALE_AMOUNT) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export const getMinWhaleAmount = (env = process.env) =>
  parseMinWhaleAmount(env.STX_WHALE_THRESHOLD, DEFAULT_MIN_WHALE_AMOUNT);

export const isLegacyBnsLookupEnabled = (env = process.env) =>
  env.ENABLE_LEGACY_BNS_LOOKUP === 'true';

export { DEFAULT_MIN_WHALE_AMOUNT };

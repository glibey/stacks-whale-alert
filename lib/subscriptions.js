import { randomUUID } from 'crypto';

const normalizeChannel = (channel) => ({
  type: channel?.type,
  target: channel?.target || channel?.url || '',
});

const cleanAddress = (value) => String(value || '').trim().toUpperCase();

export const normalizeSubscriptionInput = (input, { existingId } = {}) => {
  const now = new Date().toISOString();
  const watchedAddresses = Array.isArray(input?.watchedAddresses)
    ? [...new Set(input.watchedAddresses.map(cleanAddress).filter(Boolean))]
    : [];
  const channels = Array.isArray(input?.channels)
    ? input.channels.map(normalizeChannel).filter((channel) => channel.type && channel.target)
    : [];

  return {
    id: existingId || input?.id || randomUUID(),
    name: String(input?.name || 'Untitled Subscription').trim(),
    minAmount: Number(input?.minAmount) > 0 ? Number(input.minAmount) : 100000,
    watchedAddresses,
    channels,
    plan: String(input?.plan || 'free').trim(),
    isActive: input?.isActive !== false,
    createdAt: input?.createdAt || now,
    updatedAt: now,
  };
};

export const matchesSubscription = (subscription, tx) => {
  if (!subscription?.isActive) {
    return false;
  }

  if (Number(tx?.amount) < Number(subscription?.minAmount || 0)) {
    return false;
  }

  if (!subscription.watchedAddresses?.length) {
    return true;
  }

  const sender = cleanAddress(tx?.sender);
  const recipient = cleanAddress(tx?.recipient);

  return subscription.watchedAddresses.includes(sender) || subscription.watchedAddresses.includes(recipient);
};

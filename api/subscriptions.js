import 'dotenv/config';
import { sendJson, methodNotAllowed, parseRequestBody } from '../lib/http.js';
import { getPlanById } from '../lib/plans.js';
import { createStore } from '../lib/store.js';
import { normalizeSubscriptionInput } from '../lib/subscriptions.js';

const store = createStore();

const validateSubscription = (subscription, existingSubscriptions) => {
  const plan = getPlanById(subscription.plan);
  const activeSubscriptions = existingSubscriptions.filter(
    (existing) => existing.id !== subscription.id && existing.plan === subscription.plan && existing.isActive
  );

  if (activeSubscriptions.length >= plan.limits.subscriptions) {
    return `Plan ${plan.id} allows only ${plan.limits.subscriptions} active subscriptions`;
  }

  const webhookChannels = subscription.channels.filter((channel) => channel.type === 'webhook').length;
  const discordChannels = subscription.channels.filter((channel) => channel.type === 'discord').length;

  if (webhookChannels > plan.limits.webhookChannels) {
    return `Plan ${plan.id} allows only ${plan.limits.webhookChannels} webhook channels`;
  }

  if (discordChannels > plan.limits.discordChannels) {
    return `Plan ${plan.id} allows only ${plan.limits.discordChannels} Discord channels`;
  }

  return null;
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return sendJson(res, 200, { subscriptions: await store.listSubscriptions() });
  }

  if (req.method === 'POST') {
    const input = parseRequestBody(req);
    const subscriptions = await store.listSubscriptions();
    const subscription = normalizeSubscriptionInput(input);
    const validationError = validateSubscription(subscription, subscriptions);

    if (validationError) {
      return sendJson(res, 400, { error: validationError });
    }

    subscriptions.unshift(subscription);
    await store.saveSubscriptions(subscriptions);
    return sendJson(res, 201, { subscription });
  }

  if (req.method === 'PUT') {
    const input = parseRequestBody(req);
    const subscriptions = await store.listSubscriptions();
    const existing = subscriptions.find((subscription) => subscription.id === input.id);

    if (!existing) {
      return sendJson(res, 404, { error: 'Subscription not found' });
    }

    const updated = normalizeSubscriptionInput({ ...existing, ...input, createdAt: existing.createdAt }, { existingId: existing.id });
    const validationError = validateSubscription(updated, subscriptions);

    if (validationError) {
      return sendJson(res, 400, { error: validationError });
    }

    await store.saveSubscriptions(
      subscriptions.map((subscription) => (subscription.id === updated.id ? updated : subscription))
    );
    return sendJson(res, 200, { subscription: updated });
  }

  if (req.method === 'DELETE') {
    const id = req.query?.id;
    if (!id) {
      return sendJson(res, 400, { error: 'Missing subscription id' });
    }

    const subscriptions = await store.listSubscriptions();
    await store.saveSubscriptions(subscriptions.filter((subscription) => subscription.id !== id));
    return sendJson(res, 200, { deleted: id });
  }

  return methodNotAllowed(res, ['GET', 'POST', 'PUT', 'DELETE']);
}

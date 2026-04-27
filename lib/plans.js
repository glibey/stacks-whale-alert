export const planCatalog = [
  {
    id: 'free',
    name: 'Free',
    priceMonthlyUsd: 0,
    features: ['Public feed access', 'Manual dashboard usage', 'Single subscription rule'],
    limits: {
      subscriptions: 1,
      webhookChannels: 0,
      discordChannels: 0,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthlyUsd: 19,
    features: ['10 custom subscriptions', 'Webhook delivery', 'Discord delivery', 'Alert history API'],
    limits: {
      subscriptions: 10,
      webhookChannels: 10,
      discordChannels: 10,
    },
  },
  {
    id: 'team',
    name: 'Team',
    priceMonthlyUsd: 99,
    features: ['50 custom subscriptions', 'Shared ops workflows', 'Priority support', 'Higher delivery limits'],
    limits: {
      subscriptions: 50,
      webhookChannels: 50,
      discordChannels: 50,
    },
  },
];

export const getPlanById = (planId) => planCatalog.find((plan) => plan.id === planId) || planCatalog[0];

export const getStripeCheckoutUrl = (planId, env = process.env) => {
  const plan = getPlanById(planId);
  if (plan.id === 'free') {
    return null;
  }

  const envKey = `STRIPE_PAYMENT_LINK_${plan.id.toUpperCase()}`;
  return env[envKey] || null;
};

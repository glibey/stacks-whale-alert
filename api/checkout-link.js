import 'dotenv/config';
import { methodNotAllowed, sendJson } from '../lib/http.js';
import { getPlanById, getStripeCheckoutUrl } from '../lib/plans.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const planId = String(req.query?.plan || 'free');
  const plan = getPlanById(planId);
  const checkoutUrl = getStripeCheckoutUrl(plan.id);

  return sendJson(res, 200, {
    plan,
    checkoutUrl,
    ready: Boolean(checkoutUrl),
    message: checkoutUrl ? 'Stripe payment link configured' : 'Set STRIPE_PAYMENT_LINK_PRO / STRIPE_PAYMENT_LINK_TEAM to enable checkout',
  });
}

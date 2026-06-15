// netlify/functions/stripe-webhook.js
// Listens for Stripe events and updates the user's subscription_status in Supabase.
// Uses the SERVICE ROLE key (server-side only) so it can write the protected status field.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // server-only secret, set in Netlify env vars
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook signature failed: ${err.message}` };
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const s = stripeEvent.data.object;
        const userId = s.client_reference_id || s.metadata?.supabase_user_id;
        await setStatus(userId, 'active', s.customer);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = stripeEvent.data.object;
        const userId = sub.metadata?.supabase_user_id;
        const active = ['active', 'trialing'].includes(sub.status);
        await setStatus(userId, active ? 'active' : sub.status, sub.customer,
          sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object;
        const userId = sub.metadata?.supabase_user_id;
        await setStatus(userId, 'canceled', sub.customer);
        break;
      }
    }
    return { statusCode: 200, body: 'ok' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};

async function setStatus(userId, status, customerId, periodEnd) {
  if (!userId) return;
  const update = { subscription_status: status };
  if (customerId) update.stripe_customer_id = customerId;
  if (periodEnd) update.current_period_end = periodEnd;
  await supabase.from('profiles').update(update).eq('id', userId);
}

// netlify/functions/billing-portal.js
// Opens the Stripe customer billing portal so members can manage/cancel their subscription.

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  try {
    const { user_id } = JSON.parse(event.body || '{}');
    const { data: profile } = await supabase
      .from('profiles').select('stripe_customer_id').eq('id', user_id).single();

    if (!profile?.stripe_customer_id) {
      return json(400, { error: 'No billing account found yet.' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.SITE_URL}/`,
    });
    return json(200, { url: session.url });
  } catch (err) {
    console.error(err);
    return json(500, { error: err.message });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

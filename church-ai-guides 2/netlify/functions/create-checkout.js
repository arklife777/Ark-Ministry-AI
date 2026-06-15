// netlify/functions/create-checkout.js
// Creates a Stripe Checkout session for the $12.99/mo membership.
// Secret key + price ID come from Netlify environment variables (never the browser).

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { user_id, email } = JSON.parse(event.body || '{}');
    if (!user_id) return json(400, { error: 'Missing user.' });

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      // Pass the Supabase user id through so the webhook can match the payment to the user
      client_reference_id: user_id,
      metadata: { supabase_user_id: user_id },
      subscription_data: { metadata: { supabase_user_id: user_id } },
      success_url: `${process.env.SITE_URL}/?checkout=success`,
      cancel_url: `${process.env.SITE_URL}/?checkout=cancel`,
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

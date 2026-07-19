// ============================================================
// api/create-order.js
//
// Creates a Razorpay Order for the ₹149 Physics Wallah course.
//
// Scope (intentional):
//   - Only creates the order and returns its ID.
//   - Does NOT verify payment (that happens after checkout,
//     using razorpay_payment_id / razorpay_signature).
//   - Does NOT perform any redirect.
// ============================================================

// Razorpay's official Node SDK.
// Install with: npm install razorpay
const Razorpay = require('razorpay');

// ---- Course configuration -------------------------------------------------
// Razorpay expects amounts in the smallest currency unit (paise for INR),
// so ₹149 becomes 149 * 100 = 14900 paise.
const COURSE_AMOUNT_INR = 149;
const COURSE_AMOUNT_PAISE = COURSE_AMOUNT_INR * 100;
const CURRENCY = 'INR';

/**
 * Handler for POST /api/create-order
 *
 * Request:  no body required (amount is fixed server-side for now)
 * Response: { success: true, orderId, amount, currency }
 *           { success: false, error }
 */
module.exports = async function createOrder(req, res) {
  // Only allow POST — order creation is a write operation.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  // ---- Read Razorpay credentials from environment variables ---------------
  // These must be set in the deployment environment (e.g. Vercel project
  // settings, .env file loaded via a process manager, etc.) and should
  // NEVER be hard-coded or committed to source control.
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('Razorpay credentials are missing from environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Server is not configured for payments. Missing Razorpay credentials.',
    });
  }

  try {
    // ---- Initialize the Razorpay client ------------------------------------
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    // ---- Create the order ---------------------------------------------------
    // receipt: a merchant-side reference id, useful for reconciliation/logs.
    const order = await razorpay.orders.create({
      amount: COURSE_AMOUNT_PAISE,
      currency: CURRENCY,
      receipt: `receipt_${Date.now()}`,
      notes: {
        course: 'Physics Wallah Batch',
      },
    });

    // ---- Return the Order ID (and a few useful fields) as JSON -------------
    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    // Log the full error server-side for debugging, but keep the
    // response message generic to avoid leaking internal details.
    console.error('Failed to create Razorpay order:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create order. Please try again later.',
    });
  }
};

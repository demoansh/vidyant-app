// ============================================================
// api/verify-payment.js
//
// Verifies a Razorpay payment after checkout completes on the
// client, using Razorpay's official HMAC SHA256 signature check.
//
// Scope (intentional):
//   - Only verifies the signature returned by Razorpay Checkout.
//   - Does NOT create orders (see api/create-order.js).
//   - Does NOT redirect the user anywhere.
//   - Does NOT touch a database — that's a separate concern from
//     signature verification and is left for future work.
// ============================================================

// Node's built-in crypto module — no extra package needed for HMAC.
const crypto = require('crypto');

/**
 * Handler for POST /api/verify-payment
 *
 * Request body (JSON):
 *   {
 *     razorpay_order_id:   string,
 *     razorpay_payment_id: string,
 *     razorpay_signature:  string
 *   }
 *
 * Response:
 *   200 { success: true }
 *   4xx/5xx { success: false, error: "..." }
 */
module.exports = async function verifyPayment(req, res) {
  // Only allow POST — verification is a write/validation action,
  // not something that should be triggerable via GET.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  // ---- Read the Razorpay secret from environment variables ----------------
  // This must never be hard-coded or exposed to the client — only used
  // server-side to recompute the expected signature.
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    console.error('RAZORPAY_KEY_SECRET is missing from environment variables.');
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed.',
    });
  }

  try {
    // ---- Extract the three fields Razorpay Checkout returns ---------------
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    // All three fields are required to verify the signature.
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Payment verification failed.',
      });
    }

    // ---- Recompute the expected signature ----------------------------------
    // Razorpay's documented formula:
    //   expected_signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(payload)
      .digest('hex');

    // ---- Compare signatures using a timing-safe check -----------------------
    // A plain === comparison can leak timing information; timingSafeEqual
    // avoids that. Both buffers must be the same length, so we guard first.
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(razorpay_signature, 'utf8');

    const isValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (isValid) {
      return res.status(200).json({
        success: true,
      });
    }

    // Signature mismatch — payment cannot be trusted.
    return res.status(400).json({
      success: false,
      error: 'Payment verification failed.',
    });
  } catch (error) {
    // Log full details server-side; keep the client-facing message generic.
    console.error('Error while verifying Razorpay payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed.',
    });
  }
};

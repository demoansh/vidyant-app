/* ============================================================
   js/payment.js
   Wires the Buy Now button on pw.html to the full payment flow:

     buyCourse()
       -> POST /api/create-order      (creates the Razorpay order)
       -> opens Razorpay Checkout with the returned Order ID
       -> on success: POST /api/verify-payment
            -> success  -> redirect to success.html
            -> failure  -> alert("Payment verification failed.")
       -> on checkout dismiss (user closes modal): alert("Payment Cancelled.")

   No UI/design elements were changed — only the loading overlay
   already used by this project is reused here.
   ============================================================ */

(function () {
  'use strict';

  const STYLE_ID = 'pw-payment-styles';
  const OVERLAY_ID = 'pw-payment-overlay';

  /* ---------- One-time style injection (no separate CSS file) ---------- */
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .pw-pay-overlay{
        position:fixed;
        inset:0;
        z-index:9999;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:24px;
        background:rgba(4,5,6,0.72);
        backdrop-filter:blur(10px);
        -webkit-backdrop-filter:blur(10px);
        opacity:0;
        animation:pwFade .25s ease forwards;
        font-family:'Sora','Inter',-apple-system,BlinkMacSystemFont,sans-serif;
      }

      @keyframes pwFade{ to{ opacity:1; } }

      @media (prefers-reduced-motion: reduce){
        .pw-pay-overlay, .pw-pay-spinner{ animation-duration:0.01ms !important; }
      }

      .pw-pay-loader{
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:18px;
      }

      .pw-pay-spinner{
        width:46px;
        height:46px;
        border-radius:50%;
        border:3px solid rgba(0,230,118,0.18);
        border-top-color:#00E676;
        animation:pwSpin .8s linear infinite;
      }

      @keyframes pwSpin{ to{ transform:rotate(360deg); } }

      .pw-pay-loader-text{
        color:#F5F7F6;
        font-size:14px;
        font-weight:500;
        letter-spacing:0.2px;
        opacity:0.85;
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------- Loading overlay helpers ---------- */
  function showLoader(message) {
    injectStyles();
    removeOverlay();

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'pw-pay-overlay';
    overlay.innerHTML = `
      <div class="pw-pay-loader" role="status" aria-live="polite">
        <div class="pw-pay-spinner"></div>
        <span class="pw-pay-loader-text">${message}</span>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  /* ---------- Step 1: create the Razorpay order ---------- */
  async function createOrder() {
    const response = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create order.');
    }

    return data; // { orderId, amount, currency, keyId }
  }

  /* ---------- Step 2: verify the payment after checkout ---------- */
  async function verifyPayment(paymentResponse) {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      }),
    });

    const data = await response.json();
    return data; // { success: true } or { success: false, error }
  }

  /* ---------- Step 3: open Razorpay Checkout ---------- */
  function openCheckout(order) {
    if (typeof Razorpay === 'undefined') {
      removeOverlay();
      alert('Payment could not be started. Please try again.');
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      order_id: order.orderId,
      name: 'VIDYANT',
      description: 'Physics Wallah Batch',
      theme: { color: '#00E676' },

      // Called by Razorpay once the payment completes on their end.
      handler: async function (response) {
        showLoader('Verifying payment…');
        try {
          const result = await verifyPayment(response);
          removeOverlay();

          if (result.success) {
            window.location.href = 'success.html';
          } else {
            alert('Payment verification failed.');
          }
        } catch (err) {
          console.error('Error verifying payment:', err);
          removeOverlay();
          alert('Payment verification failed.');
        }
      },

      modal: {
        // Called if the user closes the Checkout modal without paying.
        ondismiss: function () {
          alert('Payment Cancelled.');
        },
      },
    };

    const rzp = new Razorpay(options);

    // Called if Razorpay itself reports the payment as failed.
    rzp.on('payment.failed', function () {
      alert('Payment verification failed.');
    });

    removeOverlay();
    rzp.open();
  }

  /* ---------- Public entry point (called by the Buy Now button) ---------- */
  async function buyCourse() {
    showLoader('Preparing your order…');

    try {
      const order = await createOrder();
      openCheckout(order);
    } catch (err) {
      console.error('Error creating order:', err);
      removeOverlay();
      alert('Something went wrong. Please try again.');
    }
  }

  // Expose globally so pw.html's onclick="buyCourse()" keeps working.
  window.buyCourse = buyCourse;
})();

/* ============================================================
   payment.js
   Handles the Buy Now flow for the Physics Wallah course card.

   Current behaviour:
     buyCourse() -> shows a loading animation for 2s
                 -> then shows a modal:
                    "Payment integration will be connected here."

   Future integration point:
     Razorpay (or any gateway) should be triggered from inside
     processPayment(), which currently just opens the placeholder
     modal. No gateway, redirect, or backend calls are wired up yet.
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
        .pw-pay-overlay, .pw-pay-spinner, .pw-pay-modal{ animation-duration:0.01ms !important; }
      }

      /* ---- Loader ---- */
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

      /* ---- Modal ---- */
      .pw-pay-modal{
        width:100%;
        max-width:340px;
        padding:28px 24px 24px;
        border-radius:20px;
        text-align:center;
        color:#F5F7F6;
        background:linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.04));
        border:1px solid rgba(255,255,255,0.10);
        backdrop-filter:blur(22px) saturate(140%);
        -webkit-backdrop-filter:blur(22px) saturate(140%);
        box-shadow:0 1px 0 rgba(255,255,255,0.06) inset, 0 24px 60px -26px rgba(0,0,0,0.75);
        transform:translateY(10px) scale(0.98);
        opacity:0;
        animation:pwRise .35s cubic-bezier(.16,1,.3,1) forwards;
      }

      @keyframes pwRise{
        to{ transform:translateY(0) scale(1); opacity:1; }
      }

      .pw-pay-icon{
        width:44px;
        height:44px;
        margin:0 auto 16px;
        border-radius:12px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,230,118,0.12);
        border:1px solid rgba(0,230,118,0.35);
        color:#00E676;
      }

      .pw-pay-message{
        font-size:15px;
        font-weight:600;
        line-height:1.5;
      }

      .pw-pay-submessage{
        margin-top:6px;
        font-size:12.5px;
        font-weight:400;
        color:#8E958F;
      }

      .pw-pay-close{
        margin-top:20px;
        padding:11px 22px;
        border:none;
        border-radius:999px;
        background:linear-gradient(150deg, #00E676, #00B369);
        color:#04150C;
        font-family:'Sora','Inter',sans-serif;
        font-size:13.5px;
        font-weight:700;
        cursor:pointer;
        transition:transform .3s cubic-bezier(.16,1,.3,1), filter .3s ease;
      }

      .pw-pay-close:hover{ transform:translateY(-2px); filter:brightness(1.06); }
      .pw-pay-close:active{ transform:translateY(0) scale(0.96); }
    `;
    document.head.appendChild(style);
  }

  /* ---------- Overlay helpers ---------- */
  function createOverlay() {
    removeOverlay();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'pw-pay-overlay';
    document.body.appendChild(overlay);
    return overlay;
  }

  function removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (existing) existing.remove();
  }

  function renderLoader(overlay) {
    overlay.innerHTML = `
      <div class="pw-pay-loader" role="status" aria-live="polite">
        <div class="pw-pay-spinner"></div>
        <span class="pw-pay-loader-text">Processing your request…</span>
      </div>
    `;
  }

  function renderModal(overlay, message) {
    overlay.innerHTML = `
      <div class="pw-pay-modal" role="dialog" aria-modal="true" aria-label="Payment status">
        <div class="pw-pay-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/>
          </svg>
        </div>
        <p class="pw-pay-message">${message}</p>
        <p class="pw-pay-submessage">No payment has been processed.</p>
        <button class="pw-pay-close" type="button">Got it</button>
      </div>
    `;

    const closeBtn = overlay.querySelector('.pw-pay-close');
    closeBtn.addEventListener('click', removeOverlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) removeOverlay();
    });

    document.addEventListener('keydown', function onKeydown(e) {
      if (e.key === 'Escape') {
        removeOverlay();
        document.removeEventListener('keydown', onKeydown);
      }
    });

    closeBtn.focus();
  }

  /* ---------- Future integration point ----------
     Swap the setTimeout below for a real Razorpay checkout call.
     processPayment() is the single place that should change when
     the gateway is wired up; buyCourse() itself won't need to.
  ------------------------------------------------- */
  function processPayment(overlay) {
    renderModal(overlay, 'Payment integration will be connected here.');
  }

  /* ---------- Public entry point ---------- */
  function buyCourse() {
    injectStyles();
    const overlay = createOverlay();
    renderLoader(overlay);

    setTimeout(() => {
      processPayment(overlay);
    }, 2000);
  }

  // Expose globally so the Buy Now button's onclick="buyCourse()" keeps working.
  window.buyCourse = buyCourse;
})();

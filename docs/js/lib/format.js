// format.js — small display helpers shared by all views.

/** Escape text before putting it inside HTML. Use it on EVERY value from the Sheet. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const FRACTIONS = [[0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾']];

/** 0.25 → "¼", 1.5 → "1½", 2.4 → "2.4": kitchen fractions where they fit, else 1 decimal. */
function nice(n) {
  const whole = Math.floor(n);
  const frac = FRACTIONS.find(([v]) => Math.abs(n - whole - v) < 0.02);
  if (frac) return `${whole || ''}${frac[1]}`;
  return String(Math.round(n * 10) / 10);
}

/**
 * Quantity text for an ingredient, with pieces next to grams where we know the piece weight:
 *   (400, 'g', turai with grams_per_piece 130)  → "400 g turai (about 3)"
 *   (2, 'piece', tomato with grams_per_piece 100) → "2 tomato (about 200 g)"
 */
export function qtyText(quantity, unit, ingredient) {
  const q = Number(quantity);
  const u = String(unit ?? '').trim();
  const name = ingredient?.name || ingredient?.id || '';
  const gpp = Number(ingredient?.grams_per_piece) || 0;

  if (!q) return u ? `${name} (${u})` : name;

  let grams = null;
  if (u === 'g') grams = q;
  if (u === 'kg') grams = q * 1000;
  const isPieces = /^(piece|pieces|pc|pcs|nos?|)$/i.test(u);

  if (grams !== null && gpp) {
    const pieces = Math.max(1, Math.round(grams / gpp));
    return `${nice(q)} ${u} ${name} (about ${pieces})`;
  }
  if (isPieces && gpp) {
    return `${nice(q)} ${name} (about ${nice(q * gpp)} g)`;
  }
  return `${nice(q)}${u ? ' ' + u : ''} ${name}`;
}

/** Copy text to the clipboard and show a small confirmation. */
export async function copyText(text, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older phones: fall back to a hidden textarea.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  toast(label);
}

/** Open the phone's share sheet (WhatsApp etc.); falls back to copying the link. */
export async function shareLink(url, title) {
  if (navigator.share) {
    try {
      await navigator.share({ url, title });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return; // user closed the share sheet
    }
  }
  copyText(url, 'Link copied');
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), Math.max(1800, msg.length * 45));
}

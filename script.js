const CONFIG = {
  fade:  900,      // ms — default fade in / fade out for every reveal
  hold:  500,      // ms — default time a reveal stays before the next
  gap:   250,      // ms — blank pause between lines
  finalWait: 800,  // ms — pause after the last line before the full poem appears
  finalFade: 4000, // ms — how slowly the full poem fades in at the end
  y: 'top'         // vertical placement: 'top' | 'center' | 'bottom'
};

const skipBtn = document.getElementById('skip');
const footer = document.getElementById('footer');

document.getElementById('poem-wrap').style.alignItems =
  { top: 'flex-start', center: 'center', bottom: 'flex-end' }[CONFIG.y];

const groups = [...document.querySelectorAll('#poem .line')]
  .map(line => [...line.querySelectorAll('span')].map(el => {
    const fade = +(el.dataset.fade ?? line.dataset.fade ?? CONFIG.fade);
    el.style.transition = `opacity ${fade}ms ease`;
    return { el, fade, hold: +(el.dataset.hold ?? line.dataset.hold ?? CONFIG.hold) };
  }))
  .filter(parts => parts.length);

const allSpans = [...document.querySelectorAll('#poem .line span')];
const wait = ms => new Promise(r => setTimeout(r, ms));
let skipped = false;

async function play() {
  for (const parts of groups) {
    for (const part of parts) {
      if (skipped) return;
      part.el.style.opacity = 1;
      await wait(part.fade + part.hold);
    }
    if (skipped) return;
    parts.forEach(p => (p.el.style.opacity = 0));
    await wait(Math.max(...parts.map(p => p.fade)) + CONFIG.gap);
  }
  await wait(CONFIG.finalWait);
  if (!skipped) showFull();
}

async function showFull() {
  skipBtn.classList.add('noshow');

  // clear whatever line is on screen, so the full poem always fades in from nothing
  const visible = allSpans.filter(s => s.style.opacity === '1');
  if (visible.length) {
    visible.forEach(s => (s.style.opacity = 0));
    await wait(Math.max(CONFIG.fade, ...visible.map(s => +(s.dataset.fade || 0))));
  }

  allSpans.forEach(s => {
    s.style.transition = `opacity ${CONFIG.finalFade}ms ease`;
    s.style.opacity = 1;
  });

  footer.style.transition = `opacity ${CONFIG.finalFade}ms ease`;
  footer.classList.replace('noshow','show');
}

// Ghost members API. No key lives here: the public endpoints take an email and
// return nothing about the member list, so there is nothing to leak client-side.
const GHOST_URL = 'https://by-adanne-wrenn.ghost.io';  // no trailing slash

// Must match the newsletter's name in Ghost EXACTLY — Ghost matches on name,
// not id, and a mismatch fails with "Cannot subscribe to invalid newsletters".
// Renaming the newsletter in Ghost means changing this string too.
const NEWSLETTER = 'poetry by adanne wrenn';

const signupForm = document.getElementById('signup-form');
const signupStatus = signupForm.querySelector('.signup-status');

const say = msg => {
  signupStatus.textContent = msg;
  signupStatus.classList.add('on');
};

signupForm.addEventListener('submit', async e => {
  e.preventDefault();

  // honeypot: a person never sees this field, fails silently
  if (signupForm.nonce.value) return;

  const btn = signupForm.querySelector('button');
  btn.disabled = true;

  // Readers always see the same quiet line; the real reason goes to the console.
  const fail = async (where, res) => {
    if (res) {
      console.error(`[signup] ${where} → ${res.status}`, await res.text().catch(() => ''));
    } else {
      console.error(`[signup] ${where}`);
    }
    say('that didn\'t go through.');
    btn.disabled = false;
  };

  try {
    // 1. Ghost requires a short-lived integrity token on signup. Plain text
    //    (ts:nonce:hmac), not JSON — do not call .json() on this.
    const tokenRes = await fetch(`${GHOST_URL}/members/api/integrity-token/`);
    if (!tokenRes.ok) return fail('integrity-token', tokenRes);
    const integrityToken = await tokenRes.text();

    // 2. Sends a confirmation email. No member exists until they click it —
    //    the newsletter, labels and their IP ride along in the token.
    const res = await fetch(`${GHOST_URL}/members/api/send-magic-link/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupForm.email.value,
        emailType: 'signup',
        newsletters: [{ name: NEWSLETTER }],
        labels: ['adannewrenn.com'],
        honeypot: signupForm.nonce.value,
        integrityToken
      })
    });

    if (res.ok) {
      signupForm.querySelector('.field').style.display = 'none';
      say('check your email to confirm.');
    } else {
      fail('send-magic-link', res);
    }
  } catch (err) {
    fail(`network/CORS — ${err.message}`);
  }
});

skipBtn.addEventListener('click', () => {
  skipped = true;
  showFull();
});

play();

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

// posts to listmonk at newslist.bexodim.com. the page stays put and answers inline,
// rather than handing the reader off to listmonk's own confirmation page.
const LIST_UUID = '485d578b-452a-41bf-ad4f-7c4ba087374e';
const SUBSCRIBE_URL = 'https://newslist.bexodim.com/api/public/subscription';

const signupForm = document.getElementById('signup-form');
const signupStatus = signupForm.querySelector('.signup-status');

const say = msg => {
  signupStatus.textContent = msg;
  signupStatus.classList.add('on');
};

signupForm.addEventListener('submit', async e => {
  e.preventDefault();

  // honeypot: a person never sees this field. fail silently — telling a bot it
  // was caught just invites it to try again differently.
  if (signupForm.nonce.value) return;

  const btn = signupForm.querySelector('button');
  btn.disabled = true;

  try {
    const res = await fetch(SUBSCRIBE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: signupForm.email.value,
        list_uuids: [LIST_UUID]
      })
    });
    if (res.ok) {
      signupForm.querySelector('.field').style.display = 'none';
      say('thank you.');
    } else {
      say('that didn\'t go through.');
      btn.disabled = false;
    }
  } catch {
    say('that didn\'t go through.');
    btn.disabled = false;
  }
});

skipBtn.addEventListener('click', () => {
  skipped = true;
  showFull();
});

play();

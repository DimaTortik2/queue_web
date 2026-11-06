// ─────────────────────────────────────────────────────────────────────────────
// Warm Acoustic Procedural Sound Engine (Web Audio API)
// 100% synthesized in real-time: 0 KB assets, zero latency.
// Warm Rhodes/kalimba tones, aerodynamic whooshes, pleasant micro-taps.
// Reliable playback for Firefox, Safari, Chrome & Telegram WebApp.
// ─────────────────────────────────────────────────────────────────────────────

import { usePreferencesStore } from '@/store/preferencesStore';

export type SoundEffect =
  | 'tap'
  | 'drawerOpen'
  | 'drawerClose'
  | 'switch'
  | 'joinQueue'
  | 'leaveQueue'
  | 'swapSent'
  | 'success'
  | 'notification'
  | 'turn'
  | 'error';

function canPlaySound(): boolean {
  try {
    return usePreferencesStore.getState().soundsEnabled;
  } catch {
    return true;
  }
}

// ──────────────────── Web Audio Context & Autoplay Unlock ────────────────────
declare global {
  interface Window {
    __queue_audio_ctx__?: AudioContext;
    __queue_cleanup_audio__?: () => void;
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!window.__queue_audio_ctx__) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      window.__queue_audio_ctx__ = new AudioCtx();
    }
  }
  return window.__queue_audio_ctx__ || null;
}

function initAutoplayUnlock() {
  if (typeof window === 'undefined') return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  };

  ['click', 'touchstart', 'touchend', 'mousedown', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, unlock, { capture: true, passive: true });
  });
}

// ──────────────────── Warm Acoustic Tone Generator ────────────────────
/**
 * Synthesizes a warm, soft acoustic chime (kalimba / Rhodes / warm bell).
 * - Smooth micro-attack (zero digital clicks or pops)
 * - Gentle warm lowpass filter (removes sharp piercing highs)
 * - Subtle second harmonic for rich, gentle acoustic body
 * - Exponential decay curve matching physical acoustic instruments
 */
function playChime(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume = 0.09,
  filterCutoff?: number,
) {
  const t = Math.max(startTime, ctx.currentTime + 0.005);

  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0.0001, t);
  noteGain.gain.linearRampToValueAtTime(volume, t + 0.008);
  noteGain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(
    filterCutoff || Math.min(freq * 2.5, 2000),
    t,
  );
  filter.Q.setValueAtTime(0.9, t);

  // Fundamental oscillator
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(freq, t);

  // Soft second harmonic
  const osc2 = ctx.createOscillator();
  const osc2Gain = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, t);
  osc2Gain.gain.setValueAtTime(0.18, t);

  osc1.connect(noteGain);
  osc2.connect(osc2Gain);
  osc2Gain.connect(noteGain);

  noteGain.connect(filter);
  filter.connect(ctx.destination);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + duration + 0.06);
  osc2.stop(t + duration + 0.06);
}

// ──────────────────── Aerodynamic Whoosh Generator ────────────────────
/**
 * Procedural aerodynamic whoosh / air swoosh for bottom sheets (drawers).
 * direction: 'down' (closing: descending gentle rushing air, like something swept past nearby)
 *            'up'   (opening: smooth uplifting air glide)
 */
function synthWhoosh(
  ctx: AudioContext,
  startTime: number,
  direction: 'up' | 'down',
) {
  const t = Math.max(startTime, ctx.currentTime + 0.005);
  const dur = direction === 'down' ? 0.19 : 0.22;

  // 1. Procedural pink air noise buffer
  const bufferSize = Math.floor(ctx.sampleRate * dur);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.05;
    b1 = 0.963 * b1 + white * 0.11;
    b2 = 0.57 * b2 + white * 0.25;
    output[i] = (b0 + b1 + b2 + white * 0.1) * 0.35;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.Q.setValueAtTime(1.2, t);

  const noiseGain = ctx.createGain();

  // 2. Underlying aerodynamic tone body
  const toneOsc = ctx.createOscillator();
  const toneGain = ctx.createGain();
  const toneFilter = ctx.createBiquadFilter();
  toneOsc.type = 'sine';
  toneFilter.type = 'lowpass';

  if (direction === 'down') {
    // Closing: something swept past nearby (quiet, subtle, velvety breeze)
    noiseFilter.frequency.setValueAtTime(600, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(180, t + dur);

    noiseGain.gain.setValueAtTime(0.0001, t);
    noiseGain.gain.linearRampToValueAtTime(0.12, t + 0.035);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    toneOsc.frequency.setValueAtTime(340, t);
    toneOsc.frequency.exponentialRampToValueAtTime(140, t + dur);
    toneFilter.frequency.setValueAtTime(450, t);

    toneGain.gain.setValueAtTime(0.0001, t);
    toneGain.gain.linearRampToValueAtTime(0.08, t + 0.03);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  } else {
    // Opening: smooth, audible uplifting air glide with warm presence
    noiseFilter.frequency.setValueAtTime(320, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(1100, t + dur);

    noiseGain.gain.setValueAtTime(0.0001, t);
    noiseGain.gain.linearRampToValueAtTime(0.16, t + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    toneOsc.frequency.setValueAtTime(280, t);
    toneOsc.frequency.exponentialRampToValueAtTime(560, t + dur);
    toneFilter.frequency.setValueAtTime(900, t);

    toneGain.gain.setValueAtTime(0.0001, t);
    toneGain.gain.linearRampToValueAtTime(0.15, t + 0.04);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // Subtle soft bell bloom at the peak of the opening
    playChime(ctx, 523.25, t + 0.06, 0.22, 0.06, 1200);
  }

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  toneOsc.connect(toneFilter);
  toneFilter.connect(toneGain);
  toneGain.connect(ctx.destination);

  noiseSource.start(t);
  toneOsc.start(t);
  noiseSource.stop(t + dur + 0.02);
  toneOsc.stop(t + dur + 0.02);
}

// ──────────────────── Procedural Synthesizers ────────────────────

/**
 * 1. TAP — Pleasant, soft tactile micro-tap (The exact sound the user liked).
 * 460Hz -> 320Hz, 900Hz lowpass filter, 20ms, gentle 0.05 volume.
 */
function synthTap(ctx: AudioContext, startTime: number) {
  const t = Math.max(startTime, ctx.currentTime + 0.004);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(460, t);
  osc.frequency.exponentialRampToValueAtTime(320, t + 0.016);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, t);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(0.05, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.024);
}

/**
 * 2. SWITCH — Crisp, tactile micro-toggle.
 * Two subtle micro-beads (520Hz & 740Hz).
 */
function synthSwitch(ctx: AudioContext, startTime: number) {
  const t1 = Math.max(startTime, ctx.currentTime + 0.004);
  const t2 = t1 + 0.016;

  // Bead 1
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(520, t1);
  gain1.gain.setValueAtTime(0.0001, t1);
  gain1.gain.linearRampToValueAtTime(0.08, t1 + 0.003);
  gain1.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.03);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(t1);
  osc1.stop(t1 + 0.035);

  // Bead 2
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(740, t2);
  gain2.gain.setValueAtTime(0.0001, t2);
  gain2.gain.linearRampToValueAtTime(0.09, t2 + 0.003);
  gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.03);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(t2);
  osc2.stop(t2 + 0.035);
}

/**
 * 3. DRAWER OPEN — Aerodynamic uplifting glide with warm audible presence.
 */
function synthDrawerOpen(ctx: AudioContext, startTime: number) {
  synthWhoosh(ctx, startTime, 'up');
}

/**
 * 4. DRAWER CLOSE — Aerodynamic downward whoosh ("как что-то пронеслось рядом").
 * Gentle, comfortable volume, not loud.
 */
function synthDrawerClose(ctx: AudioContext, startTime: number) {
  synthWhoosh(ctx, startTime, 'down');
}

/**
 * 5. JOIN QUEUE — Soft, warm, welcoming Rhodes triad (F4 -> A4 -> C5).
 * Gentle, cozy, non-intrusive confirmation when joining a queue.
 */
function synthJoinQueue(ctx: AudioContext, startTime: number) {
  const notes = [
    { freq: 349.23, time: 0.0, dur: 0.32, vol: 0.075 },
    { freq: 440.0, time: 0.05, dur: 0.36, vol: 0.08 },
    { freq: 523.25, time: 0.1, dur: 0.44, vol: 0.085 },
  ];

  notes.forEach((n) => {
    playChime(ctx, n.freq, startTime + n.time, n.dur, n.vol, 1400);
  });
}

/**
 * 6. SWAP SENT — Soft outgoing marimba lift (F4 -> C5).
 * Reassuring, gentle tone when you send a swap proposal.
 */
function synthSwapSent(ctx: AudioContext, startTime: number) {
  playChime(ctx, 349.23, startTime, 0.26, 0.08, 1300);
  playChime(ctx, 523.25, startTime + 0.07, 0.34, 0.085, 1400);
}

/**
 * 7. NOTIFICATION (Incoming swap proposal) — Warm, polite wooden marimba chime (G4 -> D5).
 * Friendly, pleasant, zero high-pitched ringing or screeching.
 */
function synthNotification(ctx: AudioContext, startTime: number) {
  playChime(ctx, 392.0, startTime, 0.28, 0.085, 1350);
  playChime(ctx, 587.33, startTime + 0.08, 0.38, 0.09, 1450);
}

/**
 * 8. LEAVE QUEUE — Gentle warm departure chime (E5 -> B4).
 * Reassuring, soft acoustic feedback for leaving a queue.
 */
function synthLeaveQueue(ctx: AudioContext, startTime: number) {
  playChime(ctx, 659.25, startTime, 0.22, 0.08);
  playChime(ctx, 493.88, startTime + 0.065, 0.32, 0.075);
}

/**
 * 9. TURN — Joyful, premium 3-note chime (F#5 -> A5 -> D6).
 * Clear, distinct alert when it's your turn in queue.
 */
function synthTurn(ctx: AudioContext, startTime: number) {
  const notes = [
    { freq: 739.99, time: 0.0, dur: 0.35, vol: 0.12 },
    { freq: 880.0, time: 0.08, dur: 0.42, vol: 0.13 },
    { freq: 1174.66, time: 0.17, dur: 0.65, vol: 0.14 },
  ];

  notes.forEach((n) => {
    playChime(ctx, n.freq, startTime + n.time, n.dur, n.vol);
  });
}

/**
 * 10. SUCCESS — Warm uplifting acoustic triad (D5 -> F#5 -> A5).
 * Cozy, elegant confirmation for general successes.
 */
function synthSuccess(ctx: AudioContext, startTime: number) {
  const notes = [
    { freq: 587.33, time: 0.0, dur: 0.34, vol: 0.09 },
    { freq: 739.99, time: 0.055, dur: 0.4, vol: 0.095 },
    { freq: 880.0, time: 0.11, dur: 0.52, vol: 0.1 },
  ];

  notes.forEach((n) => {
    playChime(ctx, n.freq, startTime + n.time, n.dur, n.vol);
  });
}

/**
 * 11. ERROR — Soft, muted wooden double-tap.
 * Low, gentle, warm feedback, never punishing or piercing.
 */
function synthError(ctx: AudioContext, startTime: number) {
  const notes = [
    { freq: 240, time: 0.0, dur: 0.11, vol: 0.09 },
    { freq: 190, time: 0.075, dur: 0.14, vol: 0.08 },
  ];

  notes.forEach((n) => {
    const t = Math.max(startTime + n.time, ctx.currentTime + 0.005);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(n.freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(n.vol, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + n.dur + 0.03);
  });
}

// ──────────────────── Deduplication & Playback Engine ────────────────────
const lastPlayedAt: Partial<Record<SoundEffect, number>> = {};
let suppressTapUntil = 0;

export function suppressTap(durationMs = 260) {
  suppressTapUntil = Date.now() + durationMs;
}

function dispatchSound(
  ctx: AudioContext,
  effect: SoundEffect,
  audioTime: number,
) {
  switch (effect) {
    case 'tap':
      synthTap(ctx, audioTime);
      break;
    case 'switch':
      synthSwitch(ctx, audioTime);
      break;
    case 'drawerOpen':
      synthDrawerOpen(ctx, audioTime);
      break;
    case 'drawerClose':
      synthDrawerClose(ctx, audioTime);
      break;
    case 'joinQueue':
      synthJoinQueue(ctx, audioTime);
      break;
    case 'swapSent':
      synthSwapSent(ctx, audioTime);
      break;
    case 'leaveQueue':
      synthLeaveQueue(ctx, audioTime);
      break;
    case 'turn':
      synthTurn(ctx, audioTime);
      break;
    case 'notification':
      synthNotification(ctx, audioTime);
      break;
    case 'success':
      synthSuccess(ctx, audioTime);
      break;
    case 'error':
      synthError(ctx, audioTime);
      break;
  }
}

export function playSound(effect: SoundEffect) {
  if (!canPlaySound()) return;

  const now = Date.now();

  // If tap is requested while suppressed by drawer or action, ignore it
  if (effect === 'tap') {
    if (now < suppressTapUntil) return;
    const lastTap = lastPlayedAt['tap'] || 0;
    if (now - lastTap < 75) return;
  }

  // Independent debounce for drawer open and drawer close (never block each other)
  if (effect === 'drawerOpen') {
    const lastOpen = lastPlayedAt['drawerOpen'] || 0;
    if (now - lastOpen < 220) return;
    suppressTapUntil = now + 260;
  }

  if (effect === 'drawerClose') {
    const lastClose = lastPlayedAt['drawerClose'] || 0;
    if (now - lastClose < 220) return;
    suppressTapUntil = now + 260;
  }

  // Deduplicate identical sound effects within 200ms
  const lastForThis = lastPlayedAt[effect] || 0;
  if (
    effect !== 'tap' &&
    effect !== 'drawerOpen' &&
    effect !== 'drawerClose' &&
    now - lastForThis < 200
  ) {
    return;
  }

  lastPlayedAt[effect] = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  const run = () => {
    const audioTime = ctx.currentTime + 0.008;
    dispatchSound(ctx, effect, audioTime);
  };

  if (ctx.state === 'suspended') {
    ctx
      .resume()
      .then(run)
      .catch(() => {});
  } else {
    run();
  }
}

export function playTapSound() {
  playSound('tap');
}

// ──────────────────── Global Interactive Sound Listener ────────────────────
let lastGlobalClickTime = 0;

function initGlobalClickSound() {
  if (typeof window === 'undefined') return;

  if (window.__queue_cleanup_audio__) {
    window.__queue_cleanup_audio__();
  }

  const handleClick = (e: MouseEvent) => {
    const now = Date.now();

    // Prevent rapid click burst in Firefox
    if (now - lastGlobalClickTime < 75) return;
    if (now < suppressTapUntil) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const interactive = target.closest(
      'button, [role="button"], [role="switch"], [role="tab"], a, input[type="radio"], input[type="checkbox"], .tap-press',
    );
    if (!interactive) return;

    if (interactive instanceof HTMLButtonElement && interactive.disabled) {
      return;
    }

    lastGlobalClickTime = now;

    // Switch elements get dedicated switch sound, not tap
    if (interactive.getAttribute('role') === 'switch') {
      playSound('switch');
      return;
    }

    // Interactive elements that trigger their own dedicated sounds
    if (interactive.hasAttribute('data-sound')) {
      return;
    }

    playTapSound();
  };

  window.addEventListener('click', handleClick, {
    capture: true,
    passive: true,
  });

  window.__queue_cleanup_audio__ = () => {
    window.removeEventListener('click', handleClick, true);
  };
}

if (typeof window !== 'undefined') {
  initAutoplayUnlock();
  initGlobalClickSound();
}

export const sound = {
  tap: () => playTapSound(),
  drawerOpen: () => playSound('drawerClose'),
  drawerClose: () => playSound('drawerClose'),
  switch: () => playSound('switch'),
  joinQueue: () => playSound('joinQueue'),
  swapSent: () => playSound('swapSent'),
  leaveQueue: () => playSound('leaveQueue'),
  success: () => playSound('success'),
  notification: () => playSound('notification'),
  turn: () => playSound('turn'),
  error: () => playSound('error'),
};

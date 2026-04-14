/**
 * ============================================================
 * TRAFFIC SIGNAL SYSTEM — script.js
 * Cycle: Red (5s) → Green (5s) → Yellow (2s) → repeat
 * ============================================================
 */

// ── Configuration ──────────────────────────────────────────
const PHASES = [
  { id: 'red',    duration: 5, label: 'STOP',  phaseId: 'phase-red'    },
  { id: 'green',  duration: 5, label: 'GO',    phaseId: 'phase-green'  },
  { id: 'yellow', duration: 2, label: 'READY', phaseId: 'phase-yellow' },
];

// ── State ───────────────────────────────────────────────────
let currentPhaseIndex = 0;   // index into PHASES array
let countdown         = 0;   // seconds remaining in current phase
let intervalId        = null; // setInterval handle
let isRunning         = false;

// ── DOM References ───────────────────────────────────────────
const lightEls    = {
  red:    document.getElementById('light-red'),
  yellow: document.getElementById('light-yellow'),
  green:  document.getElementById('light-green'),
};
const phaseEls    = {
  red:    document.getElementById('phase-red'),
  green:  document.getElementById('phase-green'),
  yellow: document.getElementById('phase-yellow'),
};
const statusEl    = document.getElementById('status-message');
const countdownEl = document.getElementById('countdown');
const btnStart    = document.getElementById('btn-start');
const btnStop     = document.getElementById('btn-stop');
const btnReset    = document.getElementById('btn-reset');

// ── Web Audio — tick / beep sounds ──────────────────────────
let audioCtx = null;

/**
 * Lazily initialise AudioContext on first user gesture.
 * Browsers block audio until the user interacts.
 */
function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a short beep.
 * @param {number} freq      - Hz (e.g. 880)
 * @param {number} duration  - seconds
 * @param {string} type      - OscillatorNode type: 'sine'|'square'|'triangle'
 * @param {number} gain      - volume 0–1
 */
function playBeep(freq = 880, duration = 0.08, type = 'sine', gain = 0.18) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.type      = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    vol.gain.setValueAtTime(gain, ctx.currentTime);
    // Quick fade-out to avoid click artifact
    vol.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // AudioContext not available — silently skip
  }
}

/** Distinct sound cue per phase transition */
function playPhaseSfx(phaseId) {
  if (phaseId === 'red')    playBeep(330, 0.18, 'square',   0.14); // low buzz
  if (phaseId === 'green')  playBeep(660, 0.14, 'sine',     0.16); // friendly ping
  if (phaseId === 'yellow') playBeep(520, 0.10, 'triangle', 0.15); // mid alert
}

/** Soft tick every second */
function playTick() {
  playBeep(1200, 0.04, 'square', 0.06);
}

// ── Core Rendering ───────────────────────────────────────────

/**
 * Activate the light matching `phaseId`, dim all others.
 * Update status label, countdown display, and phase bar.
 */
function renderPhase(phase) {
  // 1. Toggle light classes
  for (const [id, el] of Object.entries(lightEls)) {
    el.classList.toggle('active', id === phase.id);
  }

  // 2. Status message
  statusEl.textContent = phase.label;
  statusEl.className   = `status-message state-${phase.id}`;

  // 3. Phase bar highlight
  for (const [id, el] of Object.entries(phaseEls)) {
    el.classList.toggle('active', id === phase.id);
  }

  // 4. Countdown display
  countdownEl.textContent = countdown;
}

/** Update only the countdown number (called every second) */
function renderCountdown() {
  countdownEl.textContent = countdown;
}

// ── Signal Lifecycle ─────────────────────────────────────────

/**
 * Advance to the next phase in the cycle (wraps around).
 * Resets the countdown to the new phase's duration.
 */
function advancePhase() {
  currentPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;
  const phase = PHASES[currentPhaseIndex];
  countdown   = phase.duration;
  renderPhase(phase);
  playPhaseSfx(phase.id);
}

/**
 * The main tick — called every 1 second while running.
 * Decrements countdown; triggers phase advance at 0.
 */
function tick() {
  countdown--;

  if (countdown <= 0) {
    // Move to next phase
    advancePhase();
  } else {
    // Just update the timer
    renderCountdown();
    playTick();
  }
}

// ── Public Controls ──────────────────────────────────────────

/** Start (or resume) the signal cycle. */
function startSignal() {
  if (isRunning) return;
  isRunning = true;

  // Resume from wherever we are (or kick off first phase if fresh)
  if (countdown === 0) {
    const phase = PHASES[currentPhaseIndex];
    countdown   = phase.duration;
    renderPhase(phase);
    playPhaseSfx(phase.id);
  }

  intervalId = setInterval(tick, 1000);

  // Button states
  btnStart.disabled = true;
  btnStop.disabled  = false;
}

/** Pause the cycle without resetting state. */
function stopSignal() {
  if (!isRunning) return;
  isRunning = false;
  clearInterval(intervalId);
  intervalId = null;

  btnStart.disabled = false;
  btnStop.disabled  = true;
}

/** Stop cycle and return to initial Red state. */
function resetSignal() {
  // Stop interval
  stopSignal();

  // Reset state
  currentPhaseIndex = 0;
  countdown         = 0;
  isRunning         = false;

  // Render idle Red (no active glow — waiting for Start)
  for (const el of Object.values(lightEls)) el.classList.remove('active');
  for (const el of Object.values(phaseEls))  el.classList.remove('active');
  statusEl.textContent = 'STOP';
  statusEl.className   = 'status-message state-red';
  countdownEl.textContent = '—';

  // Button states
  btnStart.disabled = false;
  btnStop.disabled  = true;
}

// ── Init ─────────────────────────────────────────────────────
// On page load, render the idle state (Red, not yet running).
resetSignal();

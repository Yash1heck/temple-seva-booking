/**
 * Sacred Hindu Temple Bell (నిజమైన ఆలయ ఘంటానాదం)
 * Plays ONLY the first 3 seconds of the authentic Sri Sringeri bronze bell strike,
 * with a silky acoustic fade-out at 3.0s.
 */

let audioContext: AudioContext | null = null;
let bellBuffer: AudioBuffer | null = null;
let isDecoding = false;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
      }
    }
    return audioContext;
  } catch {
    return null;
  }
}

async function preloadBell(): Promise<AudioBuffer | null> {
  if (bellBuffer) return bellBuffer;
  if (isDecoding) return null;
  isDecoding = true;
  try {
    const ctx = getAudioContext();
    if (!ctx) return null;
    const res = await fetch('/temple-bell.mp3');
    const arrayBuf = await res.arrayBuffer();
    bellBuffer = await ctx.decodeAudioData(arrayBuf);
    return bellBuffer;
  } catch (err) {
    console.warn('Preload bell error:', err);
    return null;
  } finally {
    isDecoding = false;
  }
}

// Preload immediately in background
if (typeof window !== 'undefined') {
  preloadBell().catch(() => {});
}

/**
 * Plays strictly the first 3 seconds of the authentic temple bell with a smooth natural fade.
 */
export async function playTempleBell(volume = 0.6) {
  try {
    const ctx = getAudioContext();
    const buffer = await preloadBell();

    if (ctx && buffer) {
      if (ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, now);
      // Natural, silky fade-out right at 2.4s to 3.0s
      gain.gain.setValueAtTime(volume, now + 2.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      source.connect(gain);
      gain.connect(ctx.destination);

      // Play strictly the first 3.0 seconds!
      source.start(now, 0, 3.0);
      return;
    }

    // Fallback if Web Audio context decode fails
    const audio = new Audio('/temple-bell.mp3');
    audio.volume = volume;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
    }, 3000);
  } catch (err) {
    console.warn('Temple bell playback unavailable:', err);
  }
}

/**
 * Sacred Hindu Temple Bell (నిజమైన ఆలయ ఘంటానాదం)
 * Plays the authentic Sri Sringeri bronze bell strike,
 * with a silky acoustic fade-out at 3.0s.
 */

let audioContext: AudioContext | null = null;
let bellBuffer: AudioBuffer | null = null;
let isDecoding = false;

export function getAudioContext(): AudioContext | null {
  try {
    if (!audioContext) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        audioContext = new AudioCtxClass();
      }
    }
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
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
  // Unlock on user's first tap or click anywhere
  const unlockListener = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlockListener);
    window.removeEventListener('keydown', unlockListener);
  };
  window.addEventListener('pointerdown', unlockListener, { once: true });
  window.addEventListener('keydown', unlockListener, { once: true });
}

/**
 * Plays strictly the first 3 seconds of the authentic temple bell with a smooth natural fade.
 */
export async function playTempleBell(volume = 0.6) {
  try {
    // Attempt 1: Direct HTML5 Audio playback (supported on all browsers)
    const audio = new Audio('/temple-bell.mp3');
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;

    const promise = audio.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setTimeout(() => {
            // Natural smooth fade
            let vol = audio.volume;
            const fadeInterval = setInterval(() => {
              vol -= 0.1;
              if (vol <= 0.05) {
                clearInterval(fadeInterval);
                audio.pause();
                audio.currentTime = 0;
              } else {
                audio.volume = Math.max(0, vol);
              }
            }, 60);
          }, 2400);
        })
        .catch(async () => {
          // Attempt 2: Web Audio API fallback
          const ctx = getAudioContext();
          const buffer = await preloadBell();
          if (ctx && buffer) {
            if (ctx.state === 'suspended') {
              await ctx.resume().catch(() => {});
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.setValueAtTime(volume, ctx.currentTime + 2.4);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);

            source.connect(gain);
            gain.connect(ctx.destination);
            source.start(0, 0, 3.0);
          }
        });
    }
  } catch (err) {
    console.warn('Temple bell playback unavailable:', err);
  }
}

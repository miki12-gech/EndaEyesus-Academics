/**
 * Synthesizes clean audio tones via Web Audio API and triggers Telegram HapticFeedback.
 */
export function playScanFeedback(kind: "present" | "late" | "error") {
  try {
    const tg = (
      window as unknown as {
        Telegram?: {
          WebApp?: {
            HapticFeedback?: {
              notificationOccurred?: (
                type: "success" | "warning" | "error"
              ) => void;
            };
          };
        };
      }
    ).Telegram?.WebApp;

    const hapticType =
      kind === "present" ? "success" : kind === "late" ? "warning" : "error";
    tg?.HapticFeedback?.notificationOccurred?.(hapticType);
  } catch {
    // Ignore haptic unavailability
  }

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const playTone = (
      freq: number,
      startOffset: number,
      duration: number,
      type: OscillatorType = "sine",
      gainPeak = 0.22
    ) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + startOffset);
      gain.gain.exponentialRampToValueAtTime(
        gainPeak,
        ctx.currentTime + startOffset + 0.015
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + startOffset + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration + 0.02);
    };

    if (kind === "present") {
      // Crisp bright ascending double chime
      playTone(880, 0, 0.11, "sine", 0.24);
      playTone(1174.66, 0.12, 0.16, "sine", 0.26);
    } else if (kind === "late") {
      // Distinct two-tone caution chime
      playTone(659.25, 0, 0.12, "triangle", 0.24);
      playTone(523.25, 0.14, 0.18, "triangle", 0.22);
    } else {
      // Low double buzz for rejected / error
      playTone(260, 0, 0.14, "sawtooth", 0.16);
      playTone(195, 0.16, 0.2, "sawtooth", 0.16);
    }

    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore Web Audio restrictions
  }
}

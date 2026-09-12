        "use client";

import { useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

/**
 * The "welcome video" — an AI character narrating a short script, rather
 * than a recorded video file.
 *
 * Narration has three fallback tiers, tried in order:
 *   1. A real recorded audio file, if one has been uploaded to
 *      /public/audio/ as welcome.mp3, welcome.m4a, or welcome.wav (tried in
 *      that order — whichever exists first wins). This is what actually
 *      plays once someone has recorded the script in their own voice.
 *   2. The browser's built-in text-to-speech (Web Speech API), used only
 *      if no audio file is present or it fails to load.
 *   3. Caption-only manual advance, for a browser with neither — never a
 *      dead button or a silent blank screen.
 * No app code change is needed to move from tier 2 to tier 1 — uploading
 * the file is enough, since the <audio> element's onError handler is what
 * decides which tier is actually active at runtime.
 */
const SCRIPT = [

  "Greetings, I'm your Wealth Copilot.",
  "Think of me as your personal assistant.",
  "You can estimate your refund or your taxes due.",
  "You can plan your budget or figure out your own net worth.",
  "Every number you enter stays right here.",
  "Nothing is sent anywhere without your permission.",
  "I'll explain what the numbers actually mean in plain English.",
  "Every step of the way.",
  "This is about building something that is genuinely yours.",
  "Let's get to it.",
];
  

const AUDIO_CANDIDATES = ["/audio/welcome.mp3", "/audio/welcome.m4a", "/audio/welcome.wav"];

type Status = "idle" | "playing" | "paused" | "finished";

/** Splits the audio's total duration across SCRIPT lines proportional to
 * each line's character count — a reasonable approximation of pacing
 * without needing a separate audio file per line or a hand-authored
 * timestamp file. */
function computeLineBoundaries(totalDuration: number): number[] {
  const totalChars = SCRIPT.reduce((sum, line) => sum + line.length, 0);
  let cumulative = 0;
  return SCRIPT.map((line) => {
    const start = (cumulative / totalChars) * totalDuration;
    cumulative += line.length;
    return start;
  });
}

export function WelcomeVideo({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [lineIndex, setLineIndex] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const cancelledRef = useRef(false);

  const [audioSrcIndex, setAudioSrcIndex] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [audioFailed, setAudioFailed] = useState(false);
  const [lineBoundaries, setLineBoundaries] = useState<number[] | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      cancelledRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function handleAudioError() {
    if (audioSrcIndex + 1 < AUDIO_CANDIDATES.length) {
      setAudioSrcIndex((i) => i + 1);
    } else {
      setAudioFailed(true);
    }
  }

  function handleAudioMetadata() {
    if (!audioRef.current) return;
    const duration = audioRef.current.duration;
    // Some browsers briefly report Infinity before enough of the file has
    // loaded to know the real duration — treat that as "not ready yet"
    // rather than a hard failure; a normal static audio file resolves
    // this on its own almost immediately.
    if (!Number.isFinite(duration) || duration <= 0) return;
    setLineBoundaries(computeLineBoundaries(duration));
    setAudioReady(true);
  }

  function handleAudioTimeUpdate() {
    if (!lineBoundaries || !audioRef.current) return;
    const t = audioRef.current.currentTime;
    let idx = 0;
    for (let i = 0; i < lineBoundaries.length; i++) {
      if (t >= lineBoundaries[i]) idx = i;
    }
    setLineIndex(idx);
  }

  function speakFrom(index: number) {
    if (index >= SCRIPT.length) {
      setStatus("finished");
      return;
    }
    setLineIndex(index);
    const utterance = new SpeechSynthesisUtterance(SCRIPT[index]);
    utterance.rate = 1;
    utterance.onend = () => {
      if (!cancelledRef.current) speakFrom(index + 1);
    };
    utterance.onerror = () => {
      // A TTS engine hiccup shouldn't strand the person mid-video —
      // move on to the next line instead of freezing silently.
      if (!cancelledRef.current) speakFrom(index + 1);
    };
    window.speechSynthesis.speak(utterance);
  }

  function fallbackPlay() {
    if (!speechSupported) {
      setStatus("playing");
      setLineIndex(0);
      return;
    }
    window.speechSynthesis.cancel();
    cancelledRef.current = false;
    setStatus("playing");
    speakFrom(0);
  }

  function handlePlay() {
    if (audioReady && audioRef.current) {
      audioRef.current.currentTime = 0;
      setLineIndex(0);
      setStatus("playing");
      audioRef.current.play().catch(() => {
        // Playback failed even though metadata loaded fine (a decode
        // error, an autoplay-policy rejection, etc.) — fall back rather
        // than leaving the dialog stuck on "playing" with silence.
        setAudioReady(false);
        setAudioFailed(true);
        fallbackPlay();
      });
      return;
    }
    fallbackPlay();
  }

  function handlePause() {
    if (audioReady && audioRef.current) {
      audioRef.current.pause();
    } else if (speechSupported) {
      window.speechSynthesis.pause();
    }
    setStatus("paused");
  }

  function handleResume() {
    if (audioReady && audioRef.current) {
      audioRef.current.play();
    } else if (speechSupported) {
      window.speechSynthesis.resume();
    }
    setStatus("playing");
  }

  function handleReplay() {
    handlePlay();
  }

  function handleNextLine() {
    // Fallback mode only (no audio file, no speech synthesis) — manual advance.
    if (lineIndex + 1 >= SCRIPT.length) {
      setStatus("finished");
    } else {
      setLineIndex((i) => i + 1);
    }
  }

  function handleClose() {
    cancelledRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (speechSupported) window.speechSynthesis.cancel();
    onClose();
  } 

  const hasRealNarration = audioReady || speechSupported;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Wealth Copilot"
      onClick={handleClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28, 16, 36, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "20px",
      }}
    >
      {!audioFailed && (
        <audio
          ref={audioRef}
          src={AUDIO_CANDIDATES[audioSrcIndex]}
          preload="metadata"
          onError={handleAudioError}
          onLoadedMetadata={handleAudioMetadata}
          onTimeUpdate={handleAudioTimeUpdate}
          onEnded={() => setStatus("finished")}
          style={{ display: "none" }}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ maxWidth: "480px", width: "100%", position: "relative", textAlign: "center" }}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close welcome video"
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "transparent",
            border: "none",
            fontSize: "20px",
            color: "var(--muted)",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div className="flex justify-center">
          {/* The real Power Taxx Ltd. logo — see public/brand/power-taxx-logo.png.
              This used to be a generic drawn face; a first-time visitor should
              see whose product this actually is before anything else. The glow
              ring (reused from the old avatar's "speaking" cue) still pulses
              while the narration plays, just around the real mark instead of a
              cartoon one. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/power-taxx-logo.png"
            alt="Power Taxx Ltd."
            style={{
              width: 150,
              height: "auto",
              borderRadius: 14,
              boxShadow:
                status === "playing"
                  ? "0 0 0 8px rgba(124, 58, 237, 0.22), 0 10px 26px -10px rgba(0,0,0,.55)"
                  : "0 10px 26px -10px rgba(0,0,0,.55)",
              transition: "box-shadow 0.4s ease",
            }}
          />
        </div>

        <span
          className="mt-3 w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--line-soft)", color: "var(--navy-2)", display: "inline-block" }}
        >
          Welcome to Wealth Copilot
        </span>

        <div
          className="mt-4"
          style={{ minHeight: "72px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <p style={{ fontSize: "16px", color: "var(--ink)", fontWeight: 500 }}>
            {status === "idle" ? "Press play to meet your Wealth Copilot." : SCRIPT[lineIndex]}
          </p>
        </div>

        {status === "finished" && (
          <p className="text-sm mt-1" style={{ color: "var(--status-good)" }}>
            That's the whole idea — you're ready to dive in.
          </p>
        )}

        {!hasRealNarration && status !== "idle" && (
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Your browser doesn&apos;t support spoken narration, so here it is in captions instead.
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {status === "idle" && (
            <button type="button" onClick={handlePlay} className="btn gold">
              ▶ Play Welcome
            </button>
          )}
          {status === "playing" && hasRealNarration && (
            <button type="button" onClick={handlePause} className="btn ghost">
              ⏸ Pause
            </button>
          )}
          {status === "playing" && !hasRealNarration && (
            <button type="button" onClick={handleNextLine} className="btn gold">
              Next →
            </button>
          )}
          {status === "paused" && (
            <button type="button" onClick={handleResume} className="btn gold">
              ▶ Resume
            </button>
          )}
          {status === "finished" && (
            <button type="button" onClick={handleReplay} className="btn ghost">
              ↻ Replay
            </button>
          )}
          <button type="button" onClick={handleClose} className="btn ghost">
            {status === "finished" ? "Get Started" : "Skip"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wrapper that decides *whether* to show the video: automatically, once,
 * for a person who's never seen it (tracked in localStorage the same way
 * every other panel's state is), and otherwise available on demand.
 *
 * v2: the rewatch control used to be a full-width "btn ghost" sitting in
 * its own row above the Home hero — same visual weight as the actual
 * "Continue" call to action, for something almost nobody clicks twice.
 * Per user feedback, it's now a small text link with the same avatar face
 * as the modal (so it's still recognizable as "the intro"), meant to sit
 * inline next to the greeting on Home (see app/page.tsx's owner-name-row)
 * instead of commanding its own line.
 */
export function WelcomeVideoLauncher() {
  const [seen, setSeen] = useLocalStorageState<boolean>("wc.welcomeVideoSeen", false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!seen) setOpen(true);
  }, [seen]);

  function close() {
    setOpen(false);
    setSeen(true);
  }

  return (
    <>
      {!open && (
        <button type="button" onClick={() => setOpen(true)} className="welcome-replay">
          <BrandMark size={20} />
          Replay intro
        </button>
      )}
      {open && <WelcomeVideo onClose={close} />}
    </>
  );
}

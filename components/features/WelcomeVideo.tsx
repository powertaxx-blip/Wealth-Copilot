        "use client";

import { useEffect, useRef, useState } from "react";
import { AICharacterAvatar } from "@/components/features/AICharacterAvatar";
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
  "Hey — I'm your Wealth Copilot.",
  "Think of me like the assistant every big firm already has, except this one works for you.",
  "Run your real tax numbers, plan your budget, and price your business with confidence.",
  "Every number you enter stays right here — nothing is sent anywhere without you asking.",
  "I'll explain what the numbers actually mean in plain English, every step of the way.",
  "This is about building something that's genuinely yours. Let's get to it.",
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

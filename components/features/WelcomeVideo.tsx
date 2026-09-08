"use client";

import { useEffect, useRef, useState } from "react";
import { AICharacterAvatar } from "@/components/features/AICharacterAvatar";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

const SCRIPT = [
  "Hey — I'm your Wealth Copilot.",
  "Think of me like the assistant every big firm already has, except this one works for you.",
  "Run your real tax numbers, plan your budget, and price your business with confidence.",
  "Every number you enter stays right here — nothing is sent anywhere without you asking.",
  "I'll explain what the numbers actually mean in plain English, every step of the way.",
  "This is about building something that's genuinely yours. Let's get to it.",
];

type Status = "idle" | "playing" | "paused" | "finished";

export function WelcomeVideo({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [lineIndex, setLineIndex] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    setSpeechSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      cancelledRef.current = true;
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

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
      if (!cancelledRef.current) speakFrom(index + 1);
    };
    window.speechSynthesis.speak(utterance);
  }

  function handlePlay() {
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

  function handlePause() {
    if (speechSupported) window.speechSynthesis.pause();
    setStatus("paused");
  }

  function handleResume() {
    if (speechSupported) window.speechSynthesis.resume();
    setStatus("playing");
  }

  function handleReplay() {
    handlePlay();
  }

  function handleNextLine() {
    if (lineIndex + 1 >= SCRIPT.length) {
      setStatus("finished");
    } else {
      setLineIndex((i) => i + 1);
    }
  }

  function handleClose() {
    cancelledRef.current = true;
    if (speechSupported) window.speechSynthesis.cancel();
    onClose();
  }
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

        <span
          className="w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: "var(--line-soft)", color: "var(--navy-2)", display: "inline-block" }}
        >
          Welcome to Wealth Copilot
        </span>

        <div className="mt-4 flex justify-center">
          <AICharacterAvatar speaking={status === "playing"} />
        </div>

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

        {!speechSupported && status !== "idle" && (
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Your browser doesn&apos;t support spoken narration, so here it is in captions instead.
          </p>
        )}

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

"use client";

import { useState } from "react";

export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="info-tip"
      aria-label={open ? `Hide explanation: ${text}` : "Show explanation"}
      aria-expanded={open}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((o) => !o);
      }}
    >
      i{open && <span className="tip-bubble">{text}</span>}
    </button>
  );
}

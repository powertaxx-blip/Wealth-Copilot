"use client";

/** `size` defaults to the full 120px modal badge. Pass a smaller value (see
 * the "Replay intro" trigger in WelcomeVideo.tsx) to reuse the same face as
 * a small recognizable icon elsewhere, instead of a generic emoji or glyph. */
export function AICharacterAvatar({ speaking, size = 120 }: { speaking: boolean; size?: number }) {
  const faceSize = Math.round(size * 0.5);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "linear-gradient(135deg, var(--navy-2) 0%, var(--navy) 60%, var(--gold) 130%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: speaking ? "0 0 0 8px rgba(124, 58, 237, 0.18)" : "0 0 0 0 rgba(124, 58, 237, 0)",
        transition: "box-shadow 0.4s ease",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" width={faceSize} height={faceSize}>
        <g>
          <circle className="wc-avatar-eye" cx="32" cy="46" r="6" fill="#fff" />
          <circle className="wc-avatar-eye" cx="68" cy="46" r="6" fill="#fff" />
        </g>
        {speaking ? (
          <ellipse className="wc-avatar-mouth-speaking" cx="50" cy="68" rx="14" ry="8" fill="#fff" />
        ) : (
          <rect x="38" y="66" width="24" height="5" rx="2.5" fill="#fff" opacity="0.9" />
        )}
      </svg>

      <style>{`
        .wc-avatar-eye {
          animation: wc-blink 4.5s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes wc-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        .wc-avatar-mouth-speaking {
          animation: wc-talk 0.42s ease-in-out infinite alternate;
          transform-origin: center;
        }
        @keyframes wc-talk {
          from { transform: scaleY(0.5); }
          to { transform: scaleY(1.15); }
        }
      `}</style>
    </div>
  );
}

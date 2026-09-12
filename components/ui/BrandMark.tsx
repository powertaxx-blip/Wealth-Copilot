/**
 * The real Power Taxx Ltd. mark (the red pyramid), cropped square from the
 * full logo image at public/brand/power-taxx-logo.png. Replaces the
 * abstract animated face that used to stand in for a real logo — see
 * WelcomeVideo.tsx (main modal + the small "Replay intro" trigger) and
 * TopNav.tsx (the header badge), all of which used to render a generic
 * "PT" square or an invented cartoon face instead of the user's actual
 * brand.
 *
 * `speaking` reuses the same glow-ring affordance the old avatar had, so
 * the welcome modal still visibly "comes alive" while narrating, just
 * around a real logo instead of a drawn one.
 */
export function BrandMark({ size = 40, speaking = false }: { size?: number; speaking?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: speaking ? "0 0 0 8px rgba(124, 58, 237, 0.18)" : "0 0 0 0 rgba(124, 58, 237, 0)",
        transition: "box-shadow 0.4s ease",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/power-taxx-mark.png"
        alt="Power Taxx Ltd."
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </span>
  );
}

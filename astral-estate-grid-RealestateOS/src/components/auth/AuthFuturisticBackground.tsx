/** Decorative background only — no layout logic. */
export function AuthFuturisticBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-[#050a18] via-[#0a1228] to-[#0f0a20]" />
      <div className="absolute -top-32 left-1/2 h-[520px] w-[120%] -translate-x-1/2 rounded-[100%] bg-[radial-gradient(ellipse_at_center,oklch(0.55_0.18_270_/_0.35),transparent_65%)] blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[420px] w-[70%] rounded-full bg-[radial-gradient(ellipse_at_bottom_right,oklch(0.72_0.14_85_/_0.18),transparent_70%)] blur-3xl" />
      <div className="absolute top-1/3 left-0 h-[380px] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_left,oklch(0.55_0.2_240_/_0.2),transparent_70%)] blur-3xl" />

      <svg className="absolute bottom-0 left-0 right-0 h-[45vh] min-h-[220px] w-full opacity-[0.35]" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="gline" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="oklch(0.75 0.12 250 / 0)" />
            <stop offset="50%" stopColor="oklch(0.82 0.1 250 / 0.5)" />
            <stop offset="100%" stopColor="oklch(0.75 0.12 250 / 0)" />
          </linearGradient>
          <linearGradient id="goldwin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="oklch(0.85 0.12 85 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0.55 0.08 85 / 0)" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
          <rect
            key={i}
            x={80 + i * 95}
            y={120 - (i % 4) * 18}
            width={42 + (i % 3) * 8}
            height={160 + (i % 5) * 12}
            rx={4}
            fill="url(#goldwin)"
            opacity={0.15 + (i % 3) * 0.06}
          />
        ))}
        <path
          d="M0 240 L1200 240"
          stroke="url(#gline)"
          strokeWidth="1"
          strokeDasharray="6 14"
          opacity={0.6}
        />
        <path d="M0 260 L1200 260" stroke="oklch(0.7 0.08 250 / 0.15)" strokeWidth="1" />
        {[
          [120, 210],
          [340, 190],
          [560, 200],
          [780, 175],
          [980, 195],
        ].map(([cx, cy], i) => (
          <g key={i} transform={`translate(${cx},${cy})`}>
            <circle r="5" fill="oklch(0.75 0.2 250 / 0.5)" />
            <circle r="12" fill="none" stroke="oklch(0.75 0.2 250 / 0.25)" strokeWidth="1" />
          </g>
        ))}
      </svg>

      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.9 0.02 250) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.02 250) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

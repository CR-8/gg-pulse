/** Decorative line art for auth and onboarding: a task board with a delivery pulse. Original artwork. */
export function BoardIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 400"
      className={className}
      role="img"
      aria-label=""
      aria-hidden
      fill="none"
    >
      <g
        className="text-foreground/70"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* clouds */}
        <path
          d="M402 62c-2-16 12-28 26-24 6-14 30-14 36 2 14-2 24 10 20 22H402z"
          fill="#FCD34D"
          stroke="none"
        />
        <path
          d="M22 262c-2-12 10-22 21-18 5-11 24-11 29 2 11-2 19 8 16 18H22z"
          fill="#FCD34D"
          stroke="none"
        />
        {/* sparkles */}
        <path d="M150 48v18M141 57h18" />
        <path d="M330 34v12M324 40h12" />
        <path d="M96 120v10M91 125h10" />
        {/* board */}
        <rect x="88" y="96" width="320" height="220" rx="12" className="fill-background" />
        <path d="M88 128h320" />
        <circle cx="106" cy="112" r="4" />
        <circle cx="120" cy="112" r="4" />
        <circle cx="134" cy="112" r="4" />
        <path d="M194 140v160M302 140v160" strokeDasharray="4 6" />
        {/* column 1 cards */}
        <rect x="102" y="144" width="80" height="40" rx="6" className="fill-background" />
        <path d="M112 158h48M112 170h30" />
        <rect x="102" y="194" width="80" height="40" rx="6" className="fill-background" />
        <path d="M112 208h56M112 220h24" />
        {/* column 2 cards, one highlighted */}
        <rect x="208" y="144" width="80" height="40" rx="6" fill="#FF6B3D" stroke="none" />
        <path d="M218 158h44M218 170h28" stroke="#fff" />
        <rect x="208" y="194" width="80" height="40" rx="6" className="fill-background" />
        <path d="M218 208h50M218 220h20" />
        {/* column 3 card with check */}
        <rect x="316" y="144" width="80" height="40" rx="6" className="fill-background" />
        <path d="M328 164l7 7 13-14" stroke="#12805C" strokeWidth="2.5" />
        <path d="M358 160h26M358 170h18" />
        {/* pulse line */}
        <path d="M104 282h70l14-26 18 44 16-30 12 12h152" stroke="#FF6B3D" strokeWidth="2.5" />
        {/* plant */}
        <path d="M452 316c-4-30 4-52 18-62 4 22-2 44-18 62z" fill="#86EFAC" stroke="none" />
        <path d="M452 316c8-22 22-34 36-36-2 18-16 32-36 36z" fill="#86EFAC" stroke="none" />
        <path d="M452 316v-40" />
        <path d="M40 330h440" />
      </g>
    </svg>
  );
}

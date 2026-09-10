export function Leaves() {
  return (
    <>
      <div className="pointer-events-none absolute -right-3 -bottom-6 w-36 opacity-[0.14] animate-[spin_20s_linear_infinite]" style={{ animation: "none" }}>
        <LeafSvg />
      </div>
      <div className="pointer-events-none absolute -left-6 -bottom-3 w-32 opacity-[0.14] -scale-x-100">
        <LeafSvg />
      </div>
    </>
  );
}

function LeafSvg() {
  return (
    <svg viewBox="0 0 160 160" fill="none" className="w-full h-auto">
      <path d="M80 150C80 150 40 120 30 80C20 40 50 20 80 40C110 20 140 40 130 80C120 120 80 150 80 150Z" fill="#EC4899" />
      <path d="M80 140C80 140 55 115 48 85C41 55 60 40 80 55C100 40 119 55 112 85C105 115 80 140 80 140Z" fill="#F9A8D4" opacity="0.7" />
      <ellipse cx="55" cy="55" rx="18" ry="28" transform="rotate(-30 55 55)" fill="#FBCFE8" opacity="0.8" />
      <ellipse cx="110" cy="60" rx="16" ry="26" transform="rotate(25 110 60)" fill="#FBCFE8" opacity="0.7" />
    </svg>
  );
}

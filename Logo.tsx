export function Logo({ white = false, size = "md" }: { white?: boolean; size?: "sm" | "md" | "lg" }) {
  const fill = white ? "#fff" : "#EC4899";
  const text = size === "lg" ? "text-[28px]" : size === "sm" ? "text-[20px]" : "text-[24px]";
  return (
    <div className="flex items-center gap-2">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden>
        <path d="M12 28C12 28 10 22 14 16C18 10 26 8 30 12C34 16 32 24 26 27C20 30 14 28 12 28Z" fill={fill} opacity="0.25" />
        <path d="M8 30C10 18 18 8 28 10C34 11 36 18 32 24C28 30 20 32 14 28" stroke={fill} strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M14 22C16 16 22 13 27 16" stroke={fill} strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
      <span className={`font-script ${text} leading-none ${white ? "text-white" : "text-primary"}`}>
        Janiquelen
      </span>
    </div>
  );
}

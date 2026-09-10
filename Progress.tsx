export function Progress({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <div className="flex items-center justify-center gap-0 px-6 pt-4 pb-1">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        return (
          <div key={n} className="flex items-center">
            {n > 1 && (
              <div className={`w-6 h-0.5 ${n <= step ? "bg-primary-mid" : "bg-primary-border"}`} />
            )}
            <div
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                n === step
                  ? "bg-primary scale-110 shadow-[0_0_0_4px_rgba(236,72,153,0.15)]"
                  : n < step
                  ? "bg-primary-mid"
                  : "bg-primary-border"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

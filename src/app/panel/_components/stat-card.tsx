export type StatCardProps = {
  id: string;
  label: string;
  value: string | number;
  suffix?: string;
  delta?: string;
  deltaPositive?: boolean;
  foot?: string;
  sparkPath?: string;
};

export function StatCard({
  id,
  label,
  value,
  suffix,
  delta,
  deltaPositive = true,
  foot,
  sparkPath,
}: StatCardProps) {
  const gradId = `${id}-grad`;

  return (
    <div className="card relative flex flex-col gap-3 overflow-hidden p-5">
      <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
        {label}
      </div>
      <div className="flex items-baseline gap-1.5">
        <div
          className="tight tabular font-medium text-ink"
          style={{ fontSize: '40px', lineHeight: 1 }}
        >
          {value}
        </div>
        {suffix && (
          <div className="tight text-[14px] text-stone">{suffix}</div>
        )}
      </div>
      <div className="flex items-center gap-2 text-[12px]">
        {delta && (
          <span
            className="pill"
            style={
              deltaPositive
                ? { background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }
                : { background: 'rgba(177,72,72,0.15)', color: '#7C2E2E' }
            }
          >
            {deltaPositive ? '↑' : '↓'} {delta}
          </span>
        )}
        {foot && <span className="text-stone">{foot}</span>}
      </div>
      {sparkPath && (
        <svg
          viewBox="0 0 200 60"
          className="absolute right-0 bottom-0 h-[60px] w-[180px] opacity-60"
        >
          <path
            d={sparkPath}
            fill="none"
            stroke="#C5562C"
            strokeWidth="1.5"
            className="draw"
          />
          <path
            d={sparkPath + ' L 200 60 L 0 60 Z'}
            fill={`url(#${gradId})`}
            opacity="0.15"
          />
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#C5562C" />
              <stop offset="100%" stopColor="#C5562C" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      )}
    </div>
  );
}

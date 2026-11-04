interface QueueLogoProps {
  className?: string;
  size?: number;
}

export function QueueLogo({ className = "w-10 h-10", size = 40 }: QueueLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      {/* Upper line */}
      <line
        x1="264"
        y1="219"
        x2="313"
        y2="255"
        stroke="#e8e8e8"
        strokeWidth="16"
        strokeLinecap="round"
        className="stroke-neutral-300/60 dark:stroke-neutral-700/60"
      />
      {/* Lower line */}
      <line
        x1="313"
        y1="345"
        x2="276"
        y2="370"
        stroke="#e8e8e8"
        strokeWidth="14"
        strokeLinecap="round"
        className="stroke-neutral-300/60 dark:stroke-neutral-700/60"
      />
      {/* Top circle */}
      <circle
        cx="190"
        cy="168"
        r="81"
        fill="#e8e8e8"
        className="fill-neutral-200 dark:fill-neutral-800"
      />
      {/* Mid circle */}
      <circle
        cx="372"
        cy="297"
        r="61"
        fill="#e8e8e8"
        className="fill-neutral-200 dark:fill-neutral-800"
      />
      {/* Bottom accent circle - adapts to active primary color */}
      <circle
        cx="232.5"
        cy="389.5"
        r="35.5"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}

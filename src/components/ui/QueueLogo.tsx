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
      {/* Lower connecting line */}
      <path
        opacity="0.5"
        d="M295.784 354.244L274.017 370.219"
        strokeWidth="13.8365"
        strokeLinecap="round"
        className="stroke-neutral-800/40 dark:stroke-neutral-600/50"
      />
      {/* Upper connecting line */}
      <path
        opacity="0.5"
        d="M283.974 231.101L263.849 215.886"
        strokeWidth="19.6017"
        strokeLinecap="round"
        className="stroke-neutral-800/40 dark:stroke-neutral-600/50"
      />
      {/* Mid-right ellipse */}
      <ellipse
        cx="374.895"
        cy="287.269"
        rx="84.1055"
        ry="83.4217"
        className="fill-neutral-800 dark:fill-neutral-700"
      />
      {/* Top-left circle */}
      <circle
        cx="169.841"
        cy="146.841"
        r="91.8407"
        className="fill-neutral-800 dark:fill-neutral-700"
      />
      {/* Bottom accent circle - adapts to active primary accent color */}
      <circle
        cx="214.234"
        cy="407.168"
        r="49.2325"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}

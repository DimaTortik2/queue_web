import { useState, memo } from "react";

interface SlotAvatarProps {
  photoUrl?: string | null;
  name?: string | null;
  isMe?: boolean;
  size?: number;
  className?: string;
}

export const SlotAvatar = memo(function SlotAvatar({
  photoUrl,
  name,
  isMe = false,
  size = 20,
  className = "",
}: SlotAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const letter = (name || "?").trim()[0]?.toUpperCase() || "?";
  const fontSize = Math.max(9, Math.round(size * 0.42));

  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover shrink-0 select-none pointer-events-none ${className}`}
      />
    );
  }

  const defaultBg = isMe
    ? "bg-primary/15 text-primary"
    : "bg-secondary text-muted-foreground";

  return (
    <div
      style={{ width: size, height: size, fontSize }}
      className={`rounded-full shrink-0 flex items-center justify-center font-bold leading-none select-none ${defaultBg} ${className}`}
    >
      {letter}
    </div>
  );
});

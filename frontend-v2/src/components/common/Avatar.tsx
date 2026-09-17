import { useState } from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  /** Pixel size. Thread: 40. Sidebar rows: 64. */
  size: number;
  className?: string;
}

/**
 * Circular character/persona avatar. Deliberately frameless — the art already
 * has an edge. Falls back to initials if there's no image or it fails to load.
 */
export const Avatar = ({ src, name, size, className = '' }: AvatarProps) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const style = { width: size, height: size };

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        style={style}
        onError={() => setFailedSrc(src)}
        className={`shrink-0 rounded-full bg-surface-2 object-cover ${className}`}
      />
    );
  }

  const initials = name.trim().slice(0, 2).toUpperCase() || '?';
  return (
    <div
      aria-hidden
      style={{ ...style, fontSize: Math.round(size * 0.34) }}
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-semibold text-text-dim ${className}`}
    >
      {initials}
    </div>
  );
};

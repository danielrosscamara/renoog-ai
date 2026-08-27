import React from 'react';

// ─── Base Atomic Skeleton ───────────────────────────────────────────────────
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-800/70 border border-white/5 ${className}`}
      {...props}
    />
  );
};

// ─── Character Gallery Card Skeleton ────────────────────────────────────────
export const CharacterCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col rounded-2xl bg-[#18181b] border border-[#27272a] overflow-hidden">
      {/* 4:3 Image Placeholder */}
      <div className="relative aspect-4/3 w-full bg-zinc-900 overflow-hidden">
        <Skeleton className="w-full h-full rounded-none bg-zinc-800/50" />
        {/* Top Tag Pill */}
        <div className="absolute top-3 left-3">
          <Skeleton className="w-16 h-5 rounded-md bg-zinc-700/60" />
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col p-4 space-y-2.5">
        <Skeleton className="w-3/4 h-5 rounded-md" />
        <Skeleton className="w-full h-3.5 rounded-md" />
        <Skeleton className="w-2/3 h-3.5 rounded-md" />

        <div className="mt-auto pt-3 border-t border-[#232326] flex items-center justify-between">
          <Skeleton className="w-16 h-3 rounded-md" />
          <Skeleton className="w-14 h-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

// ─── Chat Turn Timeline Skeleton ─────────────────────────────────────────────
export const ChatTurnSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl w-full mx-auto px-4 py-6">
      {/* Assistant Turn Placeholder */}
      <div className="flex gap-4">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2.5">
          <Skeleton className="w-32 h-4 rounded-md" />
          <div className="p-4 rounded-2xl bg-[#1c1c20] border border-[#27272a] space-y-2">
            <Skeleton className="w-full h-4 rounded-md" />
            <Skeleton className="w-5/6 h-4 rounded-md" />
            <Skeleton className="w-2/3 h-4 rounded-md" />
          </div>
        </div>
      </div>

      {/* User Turn Placeholder */}
      <div className="flex justify-end gap-3">
        <div className="max-w-md w-full p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
          <Skeleton className="w-full h-4 rounded-md bg-indigo-500/20" />
          <Skeleton className="w-3/4 h-4 rounded-md bg-indigo-500/20" />
        </div>
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      </div>
    </div>
  );
};

// ─── Sidebar Chat Item Skeleton ──────────────────────────────────────────────
export const SidebarChatSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-3 w-full p-2 rounded-xl">
      <Skeleton className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="w-3/4 h-3.5 rounded-md" />
        <Skeleton className="w-1/2 h-2.5 rounded-md" />
      </div>
    </div>
  );
};

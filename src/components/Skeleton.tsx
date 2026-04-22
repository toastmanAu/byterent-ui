// Minimal loading skeleton primitive. Same dimensions as real content so
// layout doesn't shift when data arrives. Per ui-design skill §9: "loading
// state must be same dimensions — prevents layout shift".

import { type HTMLAttributes } from 'react';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Tailwind height class, e.g. "h-5", defaults to h-4. */
  h?: string;
  /** Tailwind width class, e.g. "w-24", defaults to w-full. */
  w?: string;
}

export function Skeleton({ h = 'h-4', w = 'w-full', className = '', ...rest }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-br-surface-2 ${h} ${w} ${className}`}
      {...rest}
    />
  );
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-lg bg-br-surface-1 p-6">
      <Skeleton h="h-3" w="w-32" />
      <div className="mt-5 flex items-baseline gap-2">
        <Skeleton h="h-8" w="w-20" />
        <Skeleton h="h-4" w="w-12" />
      </div>
      <div className="mt-2">
        <Skeleton h="h-3" w="w-40" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton h="h-5" w="w-20" />
        <Skeleton h="h-5" w="w-16" />
      </div>
    </div>
  );
}

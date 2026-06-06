// src/components/ui/Skeleton.tsx
"use client";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={
        "bg-gray-200/30 animate-pulse rounded-md" + (className ? " " + className : "")
      }
    />
  );
}

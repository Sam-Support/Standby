"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="clay s btn sm" onClick={() => window.print()}>
      {label}
    </button>
  );
}

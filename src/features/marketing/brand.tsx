import { useId } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, "");
  const bgId = `ff-bg-${id}`;
  const saffronId = `ff-saffron-${id}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      role="img"
      aria-label="FoodFlow"
      className={cn("size-9 shrink-0", className)}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14919B" />
          <stop offset="1" stopColor="#0B5C66" />
        </linearGradient>
        <linearGradient id={saffronId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB93B" />
          <stop offset="1" stopColor="#F58A07" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${bgId})`} />
      <path
        fill="#FFFFFF"
        d="M150 112c-22 0-40 18-40 40v208c0 22 18 40 40 40s40-18 40-40V192h128c22 0 40-18 40-40s-18-40-40-40z"
      />
      <path
        fill={`url(#${saffronId})`}
        d="M190 250h112c22 0 40 18 40 40s-18 40-40 40H190z"
      />
      <circle cx="392" cy="290" r="26" fill={`url(#${saffronId})`} />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        Food<span className="text-primary">Flow</span>
      </span>
    </span>
  );
}

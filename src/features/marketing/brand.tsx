import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={cn("size-9", className)}>
      <rect width="40" height="40" rx="11" className="fill-primary" />
      <path d="M9 21h22a11 11 0 0 1-22 0Z" className="fill-primary-foreground" />
      <circle cx="26" cy="13" r="4" className="fill-saffron" />
      <path d="M15 16c0-2 2-2 2-4M20 16c0-2 2-2 2-4" className="stroke-primary-foreground" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="font-display text-xl font-semibold tracking-tight">
        Food<span className="text-primary">Flow</span>
      </span>
    </span>
  );
}

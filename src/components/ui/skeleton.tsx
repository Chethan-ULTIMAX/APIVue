import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  // `.skeleton` (see motion.css) uses a travelling highlight rather than an
  // opacity pulse: it reads as "loading" on large blocks without the whole
  // panel throbbing.
  return <div className={cn("skeleton", className)} {...props} />;
}

export { Skeleton };

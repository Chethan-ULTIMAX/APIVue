import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Inset look: slightly darker than the card it sits on, so form
          // fields read as "holes" rather than raised chips.
          "flex h-9 w-full rounded-lg border border-input bg-surface-3 px-3 py-2 text-sm",
          "shadow-[inset_0_1px_2px_0_hsl(var(--foreground)/0.04)]",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/70",
          "hover:border-border",
          "focus-visible:outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Button
 * ------
 * The single interactive primitive for the whole app.
 *
 * Motion rules encoded here:
 *  - colour transitions only (fast, 120ms) so hovering a toolbar never
 *    looks sluggish;
 *  - a 1px downward press, never a scale bounce;
 *  - a visible focus ring driven by :focus-visible so mouse users are
 *    not shown a ring they did not ask for.
 */
const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg",
    "text-sm font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "active:translate-y-px",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_1px_0_0_hsl(var(--primary-foreground)/0.12)_inset,var(--elev-1)] hover:bg-primary/90 hover:shadow-[0_1px_0_0_hsl(var(--primary-foreground)/0.12)_inset,var(--elev-2)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elev hover:bg-destructive/90",
        outline:
          "border border-border bg-surface-1 text-foreground shadow-elev hover:border-border hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        /** Tinted, low-emphasis action for use inside dense toolbars. */
        subtle:
          "border border-border/60 bg-surface-3 text-foreground hover:border-border hover:bg-accent",
      },
      size: {
        default: "h-9 px-3.5",
        sm: "h-8 rounded-md px-3 text-[13px]",
        xs: "h-7 rounded-md px-2 text-xs [&_svg]:size-3.5",
        lg: "h-11 rounded-xl px-6",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

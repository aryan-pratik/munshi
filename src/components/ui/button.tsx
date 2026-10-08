import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Buttons per DESIGN.md (Components, Buttons): 8px radius, 36px tall, UI role at 500.
// One primary per view. Loading keeps the width and swaps the leading icon for a spinner.

const buttonVariants = cva(
  "pressable inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] t-ui font-medium select-none disabled:pointer-events-none disabled:text-ink-3 disabled:border-transparent [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-neel text-on-fill hover:bg-neel-hover disabled:bg-wash",
        secondary: "bg-surface text-ink border border-rule-strong hover:bg-wash disabled:bg-wash",
        ghost: "bg-transparent text-ink-2 hover:bg-wash hover:text-ink",
        destructive: "bg-debit text-on-fill hover:opacity-90 disabled:bg-wash",
      },
      size: {
        default: "h-9 px-3.5 [&_svg]:size-4",
        sm: "h-7 px-2.5 t-caption font-medium [&_svg]:size-3.5",
        lg: "h-10 px-4 [&_svg]:size-4",
        icon: "size-9 [&_svg]:size-4",
        "icon-sm": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Replaces the leading icon with a spinner and disables the button. Pass the in-progress label as children. */
    loading?: boolean;
  };

function Button({ className, variant, size, loading, children, disabled, style, ...props }: ButtonProps) {
  // Loading keeps the variant's fill and the width it had before the label swapped (DESIGN.md,
  // Buttons): the button is working, not disabled, so it is only inert to the pointer.
  const ref = React.useRef<HTMLButtonElement>(null);
  const width = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    if (!loading && ref.current) width.current = ref.current.offsetWidth;
  }, [loading]);
  return (
    <button
      ref={ref}
      type="button"
      data-variant={variant ?? "secondary"}
      data-loading={loading || undefined}
      className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none")}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      style={loading && width.current ? { minWidth: width.current, ...style } : style}
      {...props}
    >
      {loading ? <Loader2 className="spin size-3.5!" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { Button, buttonVariants };

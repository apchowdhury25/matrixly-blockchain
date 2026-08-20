import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium tracking-wide transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine",
  {
    variants: {
      variant: {
        primary: "bg-pine text-pine-fg hover:bg-pine-deep",
        secondary: "border border-rule bg-paper-raised text-ink hover:bg-paper",
        ghost: "text-ink-soft hover:bg-paper-raised hover:text-ink",
        danger: "bg-invalid text-paper-raised hover:opacity-90",
      },
      size: {
        md: "h-11 px-5",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-6",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

const variants = cva("inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50", {
  variants: { variant: { primary: "bg-primary text-primary-foreground hover:bg-primary/90", secondary: "border border-border bg-card text-foreground hover:bg-accent", ghost: "text-muted-foreground hover:bg-accent hover:text-foreground", accent: "bg-highlight text-highlight-foreground hover:bg-highlight/90" }, size: { default: "h-10", icon: "size-10 p-0", sm: "h-8 min-h-8 px-3 text-xs" } },
  defaultVariants: { variant: "primary", size: "default" },
});

export function Button({ className, variant, size, asChild, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
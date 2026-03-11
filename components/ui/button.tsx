"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:ring-offset-2 disabled:opacity-50",
          variant === "primary" &&
            "bg-[#4CAF50] text-white hover:bg-[#388E3C]",
          variant === "secondary" &&
            "border-2 border-[#1A2E4A] text-[#1A2E4A] hover:bg-[#1A2E4A] hover:text-white",
          variant === "outline" &&
            "border border-[#E0E0E0] bg-white text-[#1A2E4A] hover:bg-[#F5F5F5]",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

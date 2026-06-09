import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = ({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: string }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 tracking-widest uppercase",
        variant === "secondary" ? "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80" : "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        className
      )}
      {...props}
    />
  )
}

export { Badge }

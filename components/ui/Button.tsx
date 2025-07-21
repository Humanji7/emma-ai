import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-br from-trust-500 to-trust-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-trust-500/30 focus-visible:ring-trust-300",
        secondary: "bg-neutral-100 text-neutral-700 border-2 border-neutral-200 hover:bg-neutral-200 focus-visible:ring-neutral-300",
        danger: "bg-gradient-to-br from-crisis-500 to-crisis-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-crisis-500/30 focus-visible:ring-crisis-300",
        success: "bg-gradient-to-br from-growth-500 to-growth-600 text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-growth-500/30 focus-visible:ring-growth-300",
        outline: "border-2 border-trust-300 text-trust-700 hover:bg-trust-50 focus-visible:ring-trust-300",
        ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-300",
        link: "text-trust-600 underline-offset-4 hover:underline focus-visible:ring-trust-300",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-base",
        lg: "h-13 px-6 text-lg",
        icon: "h-11 w-11",
        voice: "h-16 w-16 rounded-full text-2xl", // Special size for voice controls
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading...
          </>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, ...props }, ref) => {
    const [internalChecked, setInternalChecked] = React.useState(!!props.defaultChecked)
    const isChecked = props.checked !== undefined ? props.checked : internalChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalChecked(e.target.checked)
      onCheckedChange?.(e.target.checked)
      if (props.onChange) {
        props.onChange(e)
      }
    }

    return (
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          ref={ref}
          onChange={handleChange}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-slate-300 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "appearance-none checked:bg-blue-600 checked:border-blue-600 transition-colors cursor-pointer",
            className
          )}
          {...props}
        />
        {isChecked && <Check className="pointer-events-none absolute h-3 w-3 text-white" strokeWidth={3} />}
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }

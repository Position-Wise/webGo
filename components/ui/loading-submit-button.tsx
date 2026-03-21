"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type LoadingSubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingText?: string
}

export default function LoadingSubmitButton({
  pendingText = "Saving...",
  children,
  disabled,
  ...props
}: LoadingSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button
      {...props}
      type="submit"
      disabled={Boolean(disabled) || pending}
    >
      {pending ? pendingText : children}
    </Button>
  )
}

"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { submitSupportInquiry } from "@/app/inquiries/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type AskAdminDialogProps = {
  buttonLabel?: string
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  buttonSize?: React.ComponentProps<typeof Button>["size"]
}

export default function AskAdminDialog({
  buttonLabel = "Ask Admin",
  buttonVariant = "outline",
  buttonSize = "default",
}: AskAdminDialogProps) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function resetForm() {
    setMessage("")
    setError(null)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)

    if (!nextOpen) {
      resetForm()
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError("Please enter your message.")
      return
    }

    const formData = new FormData()
    formData.append("message", trimmedMessage)

    startTransition(async () => {
      const result = await submitSupportInquiry(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      handleOpenChange(false)
      toast.success("Your message has been sent to admin.")
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant}>
          {buttonLabel}
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ask Admin</DialogTitle>
          <DialogDescription>
            Send a support message directly to the admin team.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Message
            </label>
            <textarea
              required
              rows={6}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              placeholder="Tell admin what you need help with."
            />
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send message"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

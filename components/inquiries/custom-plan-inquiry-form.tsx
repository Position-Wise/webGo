"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitCustomPlanInquiry } from "@/app/inquiries/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CustomPlanInquiryFormProps = {
  successRedirectPath?: string
}

export default function CustomPlanInquiryForm({
  successRedirectPath = "/inquiries/confirmation",
}: CustomPlanInquiryFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState("")
  const [budget, setBudget] = useState("")
  const [preference, setPreference] = useState("")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmedMessage = message.trim()
    if (!trimmedMessage) {
      setError("Please tell admin what kind of custom plan you need.")
      return
    }

    const formData = new FormData()
    formData.append("message", trimmedMessage)
    formData.append("budget", budget.trim())
    formData.append("preference", preference.trim())

    startTransition(async () => {
      const result = await submitCustomPlanInquiry(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      router.push(successRedirectPath)
      router.refresh()
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Message
        </label>
        <textarea
          required
          rows={5}
          maxLength={2000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="Describe the kind of custom plan or support you want."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Budget (optional)
          </label>
          <Input
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder="Example: Rs 5,000 per month"
            maxLength={120}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Preference (optional)
          </label>
          <Input
            value={preference}
            onChange={(event) => setPreference(event.target.value)}
            placeholder="Example: long-term investing"
            maxLength={120}
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Submitting..." : "Submit custom request"}
      </Button>
    </form>
  )
}

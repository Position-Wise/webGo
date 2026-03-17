"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitSubscriptionRequest } from "@/app/subscribe/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type SubscribePlan = {
  id: string
  name: string
  description: string | null
}

type SubscribeFormProps = {
  userId: string
  plans: SubscribePlan[]
  initialPlanId: string
}

export default function SubscribeForm({
  userId,
  plans,
  initialPlanId,
}: SubscribeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [planId, setPlanId] = useState(initialPlanId || plans[0]?.id || "")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError("Please upload payment proof.")
      return
    }

    const formData = new FormData()
    formData.append("planId", planId)
    formData.append("payment_proof", file)

    startTransition(async () => {
      const result = await submitSubscriptionRequest(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      router.push("/waiting")
      router.refresh()
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Plan
        </label>

        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={planId}
          onChange={(e) => setPlanId(e.target.value)}
        >
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Upload Payment Screenshot
        </label>

        <Input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />

        <p className="text-xs text-muted-foreground">
          Upload the screenshot of your payment confirmation.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button disabled={isPending || !planId || !file} type="submit">
        {isPending ? "Submitting..." : "Submit for review"}
      </Button>
    </form>
  )
}
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
  initialPaymentProof: string | null
}

export default function SubscribeForm({
  userId,
  plans,
  initialPlanId,
  initialPaymentProof,
}: SubscribeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [planId, setPlanId] = useState(initialPlanId || plans[0]?.id || "")
  const [paymentProof, setPaymentProof] = useState(initialPaymentProof ?? "")
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await submitSubscriptionRequest({
        planId,
        paymentProof,
      })

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
      <input name="userId" type="hidden" value={userId} />

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Plan
        </label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => setPlanId(event.target.value)}
          value={planId}
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
          Payment proof URL
        </label>
        <Input
          onChange={(event) => setPaymentProof(event.target.value)}
          placeholder="https://..."
          required
          type="url"
          value={paymentProof}
        />
        <p className="text-xs text-muted-foreground">
          Paste a public image or file link for your payment screenshot.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button disabled={isPending || !planId || !paymentProof.trim()} type="submit">
        {isPending ? "Submitting..." : "Submit for review"}
      </Button>
    </form>
  )
}

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
  lockedPlanId?: string | null
  hidePlanSelector?: boolean
  submitLabel?: string
  successRedirectPath?: string | null
  onSuccess?: () => void
  allowReuseExistingProof?: boolean
  existingProofUrl?: string | null
  proofHelpText?: string
}

export default function SubscribeForm({
  userId,
  plans,
  initialPlanId,
  lockedPlanId = null,
  hidePlanSelector = false,
  submitLabel = "Submit for review",
  successRedirectPath = "/waiting",
  onSuccess,
  allowReuseExistingProof = false,
  existingProofUrl = null,
  proofHelpText = "Upload the screenshot of your payment confirmation.",
}: SubscribeFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [planId, setPlanId] = useState(lockedPlanId || initialPlanId || plans[0]?.id || "")
  const [file, setFile] = useState<File | null>(null)
  const [reuseExistingProof, setReuseExistingProof] = useState(
    Boolean(allowReuseExistingProof && existingProofUrl)
  )
  const [error, setError] = useState<string | null>(null)

  const effectivePlanId = lockedPlanId || planId
  const canReuseProof = Boolean(allowReuseExistingProof && existingProofUrl)
  const hasProofInput = Boolean(file) || (canReuseProof && reuseExistingProof)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!effectivePlanId) {
      setError("Please select a plan.")
      return
    }

    if (!file && !(canReuseProof && reuseExistingProof)) {
      setError("Please upload payment proof or use your existing proof.")
      return
    }

    const formData = new FormData()
    formData.append("planId", effectivePlanId)
    if (file) {
      formData.append("payment_proof", file)
    }
    formData.append("reuseExistingProof", canReuseProof && reuseExistingProof ? "true" : "false")

    startTransition(async () => {
      const result = await submitSubscriptionRequest(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      if (onSuccess) {
        onSuccess()
      }

      if (successRedirectPath) {
        router.push(successRedirectPath)
        router.refresh()
      }
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <input type="hidden" name="userId" value={userId} />

      {!hidePlanSelector ? (
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
      ) : null}

      {canReuseProof ? (
        <label className="flex items-center gap-2 rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={reuseExistingProof}
            onChange={(event) => setReuseExistingProof(event.target.checked)}
          />
          Use existing payment proof
        </label>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs uppercase tracking-wide text-muted-foreground">
          Upload Payment Screenshot
        </label>

        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const nextFile = e.target.files?.[0] || null
            setFile(nextFile)
            if (nextFile) {
              setReuseExistingProof(false)
            }
          }}
        />

        <p className="text-xs text-muted-foreground">{proofHelpText}</p>
      </div>

      {canReuseProof && reuseExistingProof && existingProofUrl ? (
        <p className="text-xs text-muted-foreground">
          Existing proof: <a href={existingProofUrl} target="_blank" rel="noreferrer" className="underline">View screenshot</a>
        </p>
      ) : null}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button disabled={isPending || !effectivePlanId || !hasProofInput} type="submit">
        {isPending ? "Submitting..." : submitLabel}
      </Button>
    </form>
  )
}

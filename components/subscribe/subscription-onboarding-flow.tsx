"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import SubscribeForm from "@/components/subscribe/subscribe-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SubscribePlanOption = {
  id: string
  name: string
  description: string | null
  price: number | null
}

type FlowMode = "new" | "edit"

type SubscriptionOnboardingFlowProps = {
  mode: FlowMode
  userId: string
  userName: string
  userEmail: string
  avatarUrl: string | null
  plans: SubscribePlanOption[]
  initialPlanId: string
  accessState: string
  isRejected: boolean
  currentPlanLabel: string | null
  currentProofUrl: string | null
  lastSubmittedAt: string | null
  paymentQrUrl: string | null
}

const NEW_FLOW_STEPS = ["Welcome", "Requirements", "Plan", "Payment", "Proof", "Relax"] as const
const EDIT_FLOW_STEPS = ["Welcome", "Change Plan", "Repayment", "Proof", "Relax"] as const

function normalizePlanKey(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase()
  if (normalized === "growth") return "pro"
  if (normalized === "elite") return "premium"
  return normalized || "basic"
}

function getFallbackPriceLabel(planName: string | null | undefined) {
  const key = normalizePlanKey(planName)
  if (key === "basic") return "$0"
  if (key === "pro") return "$49"
  if (key === "premium") return "$189"
  return "Custom"
}

function formatAmount(plan: SubscribePlanOption | null) {
  if (!plan) return "Select a plan first"

  if (typeof plan.price === "number" && Number.isFinite(plan.price)) {
    return `Rs ${plan.price.toLocaleString("en-IN")}`
  }

  return getFallbackPriceLabel(plan.name)
}

export default function SubscriptionOnboardingFlow({
  mode,
  userId,
  userName,
  userEmail,
  avatarUrl,
  plans,
  initialPlanId,
  accessState,
  isRejected,
  currentPlanLabel,
  currentProofUrl,
  lastSubmittedAt,
  paymentQrUrl,
}: SubscriptionOnboardingFlowProps) {
  const waitingState = accessState === "waiting"
  const isEditMode = mode === "edit"
  const steps = isEditMode ? EDIT_FLOW_STEPS : NEW_FLOW_STEPS

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId || plans[0]?.id || "")
  const [stepIndex, setStepIndex] = useState(waitingState && !isEditMode ? steps.length - 1 : 0)
  const [willRepay, setWillRepay] = useState(false)

  const selectedPlan = useMemo(() => {
    return plans.find((plan) => plan.id === selectedPlanId) ?? null
  }, [plans, selectedPlanId])

  const amountLabel = formatAmount(selectedPlan)
  const progressValue = Math.round(((stepIndex + 1) / steps.length) * 100)

  const proofStepIndex = isEditMode ? 3 : 4
  const lastStepIndex = steps.length - 1

  const canGoNext =
    stepIndex < proofStepIndex &&
    !(stepIndex === (isEditMode ? 1 : 2) && !selectedPlanId) &&
    !(stepIndex === (!isEditMode ? 3 : -1) && !selectedPlan)

  function goNext() {
    if (!canGoNext) return
    setStepIndex((current) => Math.min(lastStepIndex, current + 1))
  }

  function goPrev() {
    setStepIndex((current) => Math.max(0, current - 1))
  }

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Membership Onboarding</p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          {isEditMode ? "Update your submission" : "Welcome to your financial journey"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Follow this update flow to edit plan or proof details safely."
            : "Complete each step once and unlock broadcast access after admin approval."}
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              Step {stepIndex + 1}: {steps[stepIndex]}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {stepIndex + 1}/{steps.length}
            </p>
          </div>

          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {steps.map((label, index) => {
              const canOpenStep = index <= stepIndex

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (canOpenStep) {
                      setStepIndex(index)
                    }
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    stepIndex === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : canOpenStep
                        ? "border-border text-muted-foreground hover:text-foreground"
                        : "border-border/60 text-muted-foreground/60"
                  )}
                  disabled={!canOpenStep}
                >
                  {index + 1}. {label}
                </button>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isRejected ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Your previous submission was rejected. Please re-submit with corrected details.
            </div>
          ) : null}

          {!isEditMode && stepIndex === 0 ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="h-14 w-14">
                  <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
                  <AvatarFallback>{(userName || userEmail).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-lg font-semibold">Welcome, {userName}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                You are one short flow away from accessing trade calls, investment broadcasts,
                and advanced member features.
              </p>
            </div>
          ) : null}

          {!isEditMode && stepIndex === 1 ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">To unlock your access, complete these actions:</p>
              <ul className="mt-3 space-y-2">
                <li>1. Choose your preferred membership plan.</li>
                <li>2. Pay the exact amount using the payment QR code.</li>
                <li>3. Upload a clear payment screenshot.</li>
                <li>4. Submit and wait for admin verification.</li>
              </ul>
              <p className="mt-3">
                After approval, your dashboard broadcasts and member tools will be unlocked automatically.
              </p>
            </div>
          ) : null}

          {isEditMode && stepIndex === 0 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="h-14 w-14">
                  <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
                  <AvatarFallback>{(userName || userEmail).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-lg font-semibold">Welcome back, {userName}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border border-border/70 bg-background p-4 text-sm">
                <p>
                  Current plan: <span className="font-medium capitalize">{currentPlanLabel ?? "Not selected"}</span>
                </p>
                <p>
                  Last submitted: <span className="font-medium">{lastSubmittedAt ?? "Not available"}</span>
                </p>
                {currentProofUrl ? (
                  <p>
                    Current proof: <a href={currentProofUrl} target="_blank" rel="noreferrer" className="underline">View screenshot</a>
                  </p>
                ) : (
                  <p>No payment proof found in your current submission.</p>
                )}
              </div>
            </div>
          ) : null}

          {(isEditMode ? stepIndex === 1 : stepIndex === 2) ? (
            <div className="space-y-3">
              {!plans.length ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  No public plans are configured yet. Ask admin to configure plans.
                </div>
              ) : (
                plans.map((plan) => {
                  const isSelected = plan.id === selectedPlanId

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "w-full rounded-lg border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-muted/20 hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold capitalize">{plan.name}</p>
                        <span className="text-sm text-muted-foreground">{formatAmount(plan)}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.description || "Membership access plan"}
                      </p>
                    </button>
                  )
                })
              )}
            </div>
          ) : null}

          {!isEditMode && stepIndex === 3 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <p className="text-sm font-medium text-foreground">Pay using this QR code</p>

              {paymentQrUrl ? (
                <div className="rounded-md border border-border/70 bg-background p-3">
                  <img src={paymentQrUrl} alt="Payment QR" className="mx-auto w-full max-w-xs rounded-md" />
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  Payment QR is not configured yet. Please ask admin to add it.
                </div>
              )}

              <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
                <p className="text-muted-foreground">Paying amount</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{amountLabel}</p>
              </div>
            </div>
          ) : null}

          {isEditMode && stepIndex === 2 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <p className="text-sm font-medium text-foreground">Re-payment is optional</p>
              <p className="text-sm text-muted-foreground">
                If you are only correcting details, you can keep existing proof. If you made a fresh payment,
                choose yes and upload the latest screenshot in the next step.
              </p>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={willRepay ? "default" : "outline"}
                  onClick={() => setWillRepay(true)}
                >
                  Yes, I re-paid
                </Button>
                <Button
                  type="button"
                  variant={!willRepay ? "default" : "outline"}
                  onClick={() => setWillRepay(false)}
                >
                  No, use current proof
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Selected option: {willRepay ? "I will upload a new payment proof." : "I will reuse current proof."}
              </p>
            </div>
          ) : null}

          {stepIndex === proofStepIndex ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <p className="text-sm text-muted-foreground">
                Upload your payment screenshot for
                <span className="font-medium text-foreground"> {selectedPlan?.name ?? "selected plan"}</span>.
              </p>

              {selectedPlan ? (
                <SubscribeForm
                  userId={userId}
                  plans={plans.map((plan) => ({
                    id: plan.id,
                    name: plan.name,
                    description: plan.description,
                  }))}
                  initialPlanId={selectedPlan.id}
                  lockedPlanId={selectedPlan.id}
                  hidePlanSelector
                  submitLabel={isEditMode ? "Submit updated request" : "Submit payment proof"}
                  successRedirectPath={null}
                  onSuccess={() => setStepIndex(lastStepIndex)}
                  allowReuseExistingProof={isEditMode && !willRepay}
                  existingProofUrl={currentProofUrl}
                  proofHelpText={
                    isEditMode
                      ? "Upload a new screenshot, or keep existing proof if you selected no re-payment."
                      : "Upload the screenshot of your payment confirmation."
                  }
                />
              ) : (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  Please go back and select a plan first.
                </div>
              )}
            </div>
          ) : null}

          {stepIndex === lastStepIndex ? (
            <div className="space-y-4 rounded-lg border border-emerald-300/50 bg-emerald-50 p-5 text-emerald-900">
              <h3 className="text-lg font-semibold">
                {isEditMode ? "Submission update completed" : "Submission completed"}
              </h3>
              <p className="text-sm">
                Sit back and relax. Your lovely admin will review and approve your access shortly.
              </p>

              {lastSubmittedAt ? (
                <p className="text-xs text-emerald-800/80">Last submitted: {lastSubmittedAt}</p>
              ) : null}

              {currentProofUrl ? (
                <p className="text-xs">
                  Proof link: <a href={currentProofUrl} target="_blank" rel="noreferrer" className="underline">View screenshot</a>
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/profile">View profile</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/waiting">Check approval status</Link>
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={goPrev}
              disabled={stepIndex === 0 || stepIndex === lastStepIndex}
            >
              Prev
            </Button>

            {stepIndex < proofStepIndex ? (
              <Button type="button" onClick={goNext} disabled={!canGoNext}>
                Next
              </Button>
            ) : stepIndex === proofStepIndex ? (
              <p className="text-xs text-muted-foreground">Submit proof above to continue.</p>
            ) : (
              <span className="text-xs text-muted-foreground">All steps completed</span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

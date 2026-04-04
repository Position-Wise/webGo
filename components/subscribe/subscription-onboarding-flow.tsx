"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import CustomPlanInquiryForm from "@/components/inquiries/custom-plan-inquiry-form";
import SubscribeForm from "@/components/subscribe/subscribe-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanIntent = "trader" | "investor" | "both" | "custom";

type SubscribePlanOption = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  planType: "trader" | "investor" | null;
};

type FlowMode = "new" | "edit";

type SubscriptionOnboardingFlowProps = {
  mode: FlowMode;
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  plans: SubscribePlanOption[];
  initialPlanId: string;
  accessState: string;
  isBlocked: boolean;
  currentPlanLabel: string | null;
  currentProofUrl: string | null;
  lastSubmittedAt: string | null;
  paymentQrUrl: string | null;
  paymentQrDownloadUrl: string | null;
};

type PaymentQrPanelProps = {
  amountLabel?: string | null;
  description: string;
  paymentQrDownloadUrl: string | null;
  paymentQrUrl: string | null;
};

const WELCOME_STEP = "Welcome";
const REQUIREMENTS_STEP = "Requirements";
const INTENT_STEP = "Intent";
const PLAN_STEP = "Plan";
const PAYMENT_STEP = "Payment";
const PROOF_STEP = "Proof";
const RELAX_STEP = "Relax";
const CHANGE_PLAN_STEP = "Change Plan";
const REPAYMENT_STEP = "Repayment";
const CUSTOM_REQUEST_STEP = "Custom Request";

const PAYMENT_QR_EMPTY_STATE =
  "Payment QR is not available in the paymentQR storage bucket yet. Please ask admin to upload PaymentQR.";

type FlowStep =
  | typeof WELCOME_STEP
  | typeof REQUIREMENTS_STEP
  | typeof INTENT_STEP
  | typeof PLAN_STEP
  | typeof PAYMENT_STEP
  | typeof PROOF_STEP
  | typeof RELAX_STEP
  | typeof CHANGE_PLAN_STEP
  | typeof REPAYMENT_STEP
  | typeof CUSTOM_REQUEST_STEP;

const NEW_FLOW_STEPS: readonly FlowStep[] = [
  WELCOME_STEP,
  REQUIREMENTS_STEP,
  INTENT_STEP,
  PLAN_STEP,
  PAYMENT_STEP,
  PROOF_STEP,
  RELAX_STEP,
];
const NEW_CUSTOM_FLOW_STEPS: readonly FlowStep[] = [
  WELCOME_STEP,
  REQUIREMENTS_STEP,
  INTENT_STEP,
  CUSTOM_REQUEST_STEP,
];
const EDIT_FLOW_STEPS: readonly FlowStep[] = [
  WELCOME_STEP,
  INTENT_STEP,
  CHANGE_PLAN_STEP,
  REPAYMENT_STEP,
  PROOF_STEP,
  RELAX_STEP,
];
const EDIT_CUSTOM_FLOW_STEPS: readonly FlowStep[] = [
  WELCOME_STEP,
  INTENT_STEP,
  CUSTOM_REQUEST_STEP,
];

const INTENT_OPTIONS: {
  value: PlanIntent;
  label: string;
  description: string;
}[] = [
  {
    value: "trader",
    label: "Trader",
    description: "Show trading-focused plans and active market access.",
  },
  {
    value: "investor",
    label: "Investor",
    description: "Show investment-focused plans and longer-term support.",
  },
  {
    value: "both",
    label: "Both",
    description: "Show every public plan so you can compare everything.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Skip plan selection and send admin a tailored inquiry.",
  },
];

function normalizePlanKey(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "growth") return "pro";
  if (normalized === "elite") return "premium";
  return normalized || "basic";
}

function getFallbackPriceLabel(planName: string | null | undefined) {
  const key = normalizePlanKey(planName);
  if (key === "basic") return "Rs 0";
  if (key === "pro") return "Rs 299";
  if (key === "premium") return "Rs 599";
  return "Custom";
}

function formatAmount(plan: SubscribePlanOption | null) {
  if (!plan) return "Select a plan first";

  if (typeof plan.price === "number" && Number.isFinite(plan.price)) {
    return `Rs ${plan.price.toLocaleString("en-IN")}`;
  }

  return getFallbackPriceLabel(plan.name);
}

function getStepIndex(steps: readonly FlowStep[], step: FlowStep) {
  return steps.indexOf(step);
}

function getEmptyPlanMessage(intent: PlanIntent | undefined) {
  if (intent === "trader") return "No public trader plans are configured yet.";
  if (intent === "investor") {
    return "No public investor plans are configured yet.";
  }
  return "No public plans are configured yet.";
}

function PaymentQrPanel({
  amountLabel = null,
  description,
  paymentQrDownloadUrl,
  paymentQrUrl,
}: PaymentQrPanelProps) {
  const downloadHref = paymentQrDownloadUrl ?? paymentQrUrl;

  return (
    <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Pay using this QR code</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {paymentQrUrl ? (
        <>
          <div className="rounded-md border border-border/70 bg-background p-3">
            <img
              src={paymentQrUrl}
              alt="Payment QR"
              className="mx-auto w-full max-w-xs rounded-md"
            />
          </div>

          {downloadHref ? (
            <div className="flex justify-center">
              <Button asChild size="sm" variant="outline">
                <a href={downloadHref} rel="noreferrer">
                  Download QR image
                </a>
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {PAYMENT_QR_EMPTY_STATE}
        </div>
      )}

      {amountLabel ? (
        <div className="rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
          <p className="text-muted-foreground">Paying amount</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{amountLabel}</p>
        </div>
      ) : null}
    </div>
  );
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
  isBlocked,
  currentPlanLabel,
  currentProofUrl,
  lastSubmittedAt,
  paymentQrUrl,
  paymentQrDownloadUrl,
}: SubscriptionOnboardingFlowProps) {
  const waitingState = accessState === "waiting";
  const isEditMode = mode === "edit" || isBlocked;
  const [intent, setIntent] = useState<PlanIntent>();
  const [selectedPlanId, setSelectedPlanId] = useState(() => {
    if (initialPlanId && plans.some((plan) => plan.id === initialPlanId)) {
      return initialPlanId;
    }
    return plans[0]?.id ?? "";
  });
  const [stepIndex, setStepIndex] = useState(() => {
    return waitingState && !isEditMode ? NEW_FLOW_STEPS.length - 1 : 0;
  });
  const [willRepay, setWillRepay] = useState(false);

  const filteredPlans = useMemo(() => {
    if (intent === "trader") {
      return plans.filter((plan) => plan.planType === "trader");
    }

    if (intent === "investor") {
      return plans.filter((plan) => plan.planType === "investor");
    }

    return plans;
  }, [intent, plans]);

  const isCustomIntent = intent === "custom";
  const steps = isEditMode
    ? isCustomIntent
      ? EDIT_CUSTOM_FLOW_STEPS
      : EDIT_FLOW_STEPS
    : isCustomIntent
      ? NEW_CUSTOM_FLOW_STEPS
      : NEW_FLOW_STEPS;
  const effectiveStepIndex = Math.min(stepIndex, steps.length - 1);

  const planStepLabel = isEditMode ? CHANGE_PLAN_STEP : PLAN_STEP;
  const paymentStepLabel = isEditMode ? REPAYMENT_STEP : PAYMENT_STEP;
  const intentStepIndex = getStepIndex(steps, INTENT_STEP);
  const planStepIndex = getStepIndex(steps, planStepLabel);
  const paymentStepIndex = getStepIndex(steps, paymentStepLabel);
  const customRequestStepIndex = getStepIndex(steps, CUSTOM_REQUEST_STEP);
  const proofStepIndex = getStepIndex(steps, PROOF_STEP);
  const submitStepIndex =
    customRequestStepIndex >= 0 ? customRequestStepIndex : proofStepIndex;
  const lastStepIndex = steps.length - 1;
  const hasLocalSuccessStep = lastStepIndex > submitStepIndex;

  const effectiveSelectedPlanId = useMemo(() => {
    if (
      selectedPlanId &&
      filteredPlans.some((plan) => plan.id === selectedPlanId)
    ) {
      return selectedPlanId;
    }

    return filteredPlans[0]?.id ?? "";
  }, [filteredPlans, selectedPlanId]);

  const selectedPlan = useMemo(() => {
    return (
      filteredPlans.find((plan) => plan.id === effectiveSelectedPlanId) ?? null
    );
  }, [filteredPlans, effectiveSelectedPlanId]);

  const amountLabel = formatAmount(selectedPlan);
  const progressValue = Math.round(
    ((effectiveStepIndex + 1) / steps.length) * 100,
  );

  const canGoNext =
    effectiveStepIndex < submitStepIndex &&
    !(effectiveStepIndex === intentStepIndex && !intent) &&
    !(effectiveStepIndex === planStepIndex && !effectiveSelectedPlanId);

  function goNext() {
    if (!canGoNext) return;
    setStepIndex(Math.min(lastStepIndex, effectiveStepIndex + 1));
  }

  function goPrev() {
    setStepIndex(Math.max(0, effectiveStepIndex - 1));
  }

  return (
    <section className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Membership Onboarding
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          {isBlocked
            ? "Restore your membership access"
            : isEditMode
              ? "Update your submission"
              : "Welcome to your financial journey"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isBlocked
            ? "Choose the path that fits you, then re-submit your details or send a custom request for admin review."
            : isEditMode
              ? "Follow this update flow to safely revise your membership path, plan, or proof details."
              : "Complete each step once and unlock broadcast access after admin approval."}
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              Step {effectiveStepIndex + 1}: {steps[effectiveStepIndex]}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {effectiveStepIndex + 1}/{steps.length}
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
              const canOpenStep = index <= effectiveStepIndex;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (canOpenStep) {
                      setStepIndex(index);
                    }
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    effectiveStepIndex === index
                      ? "border-primary bg-primary text-primary-foreground"
                      : canOpenStep
                        ? "border-border text-muted-foreground hover:text-foreground"
                        : "border-border/60 text-muted-foreground/60",
                  )}
                  disabled={!canOpenStep}
                >
                  {index + 1}. {label}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {isBlocked ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Your access is currently blocked. Choose a matching plan with
              proof, or send a custom request, so admin can review your next
              step.
            </div>
          ) : null}

          {!isEditMode && effectiveStepIndex === 0 ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="h-14 w-14">
                  <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
                  <AvatarFallback>
                    {(userName || userEmail).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-lg font-semibold">Welcome, {userName}</p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                You are one short flow away from accessing trade calls,
                investment broadcasts, and advanced member features.
              </p>
            </div>
          ) : null}

          {!isEditMode &&
          effectiveStepIndex === getStepIndex(steps, REQUIREMENTS_STEP) ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                To unlock your access, complete these actions:
              </p>
              <ul className="mt-3 space-y-2">
                <li>
                  1. Choose what you are looking for so we can guide you to the
                  right plan path.
                </li>
                <li>
                  2. Pick a matching membership plan, or choose Custom if you
                  need something tailored.
                </li>
                <li>
                  3. For standard plans, pay the exact amount using the payment
                  QR code and keep a clear screenshot ready.
                </li>
                <li>
                  4. Submit your proof or custom request and wait for admin
                  verification or follow-up.
                </li>
              </ul>
              <p className="mt-3">
                After approval, your dashboard broadcasts and member tools will
                be unlocked automatically.
              </p>
            </div>
          ) : null}

          {isEditMode && effectiveStepIndex === 0 ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="h-14 w-14">
                  <AvatarImage src={avatarUrl ?? undefined} alt={userName} />
                  <AvatarFallback>
                    {(userName || userEmail).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="text-lg font-semibold">
                    Welcome back, {userName}
                  </p>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              <div className="grid gap-3 rounded-md border border-border/70 bg-background p-4 text-sm">
                <p>
                  Current plan:{" "}
                  <span className="font-medium capitalize">
                    {currentPlanLabel ?? "Not selected"}
                  </span>
                </p>
                <p>
                  Last submitted:{" "}
                  <span className="font-medium">
                    {lastSubmittedAt ?? "Not available"}
                  </span>
                </p>
                {currentProofUrl ? (
                  <p>
                    Current proof:{" "}
                    <a
                      href={currentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      View screenshot
                    </a>
                  </p>
                ) : (
                  <p>No payment proof found in your current submission.</p>
                )}
              </div>
            </div>
          ) : null}

          {effectiveStepIndex === intentStepIndex ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  What are you looking for?
                </p>
                <p className="text-sm text-muted-foreground">
                  We will tailor the next step based on your intent without
                  changing any backend subscription logic.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {INTENT_OPTIONS.map((option) => {
                  const isSelected = intent === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setIntent(option.value)}
                      className={cn(
                        "rounded-lg border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-background hover:border-border",
                      )}
                    >
                      <p className="text-base font-semibold text-foreground">
                        {option.label}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {planStepIndex >= 0 && effectiveStepIndex === planStepIndex ? (
            <div className="space-y-3">
              {!filteredPlans.length ? (
                <div className="rounded-md border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  {getEmptyPlanMessage(intent)} Ask admin to configure plans.
                </div>
              ) : (
                filteredPlans.map((plan) => {
                  const isSelected = plan.id === effectiveSelectedPlanId;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "w-full rounded-lg border p-4 text-left transition-colors",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border/70 bg-muted/20 hover:border-border",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-semibold capitalize">
                          {plan.name}
                        </p>
                        <span className="text-sm text-muted-foreground">
                          {formatAmount(plan)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {plan.description || "Membership access plan"}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          ) : null}

          {!isEditMode && effectiveStepIndex === paymentStepIndex ? (
            <PaymentQrPanel
              amountLabel={amountLabel}
              description="Scan this QR code to complete your payment. You can download the same image if you want to open it on another device."
              paymentQrDownloadUrl={paymentQrDownloadUrl}
              paymentQrUrl={paymentQrUrl}
            />
          ) : null}

          {customRequestStepIndex >= 0 &&
          effectiveStepIndex === customRequestStepIndex ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Request a custom plan
                </p>
                <p className="text-sm text-muted-foreground">
                  Tell admin what you need. You do not need to upload payment
                  proof for a custom inquiry.
                </p>
              </div>

              <CustomPlanInquiryForm />
            </div>
          ) : null}

          {isEditMode && effectiveStepIndex === paymentStepIndex ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <p className="text-sm font-medium text-foreground">
                Re-payment is optional
              </p>
              <p className="text-sm text-muted-foreground">
                If you are only correcting details, you can keep existing proof.
                If you made a fresh payment, choose yes and upload the latest
                screenshot in the next step.
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
                Selected option:{" "}
                {willRepay
                  ? "I will upload a new payment proof."
                  : "I will reuse current proof."}
              </p>

              <PaymentQrPanel
                amountLabel={selectedPlan ? amountLabel : null}
                description="If you plan to make a fresh payment, use this same QR code. You can also download it before uploading your new proof."
                paymentQrDownloadUrl={paymentQrDownloadUrl}
                paymentQrUrl={paymentQrUrl}
              />
            </div>
          ) : null}

          {proofStepIndex >= 0 && effectiveStepIndex === proofStepIndex ? (
            <div className="space-y-4 rounded-lg border border-border/70 bg-muted/20 p-5">
              <p className="text-sm text-muted-foreground">
                Upload your payment screenshot for
                <span className="font-medium text-foreground">
                  {" "}
                  {selectedPlan?.name ?? "selected plan"}
                </span>
                .
              </p>

              {selectedPlan ? (
                <SubscribeForm
                  userId={userId}
                  plans={filteredPlans.map((plan) => ({
                    id: plan.id,
                    name: plan.name,
                    description: plan.description,
                  }))}
                  initialPlanId={selectedPlan.id}
                  lockedPlanId={selectedPlan.id}
                  hidePlanSelector
                  submitLabel={
                    isEditMode
                      ? "Submit updated request"
                      : "Submit payment proof"
                  }
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

          {hasLocalSuccessStep && effectiveStepIndex === lastStepIndex ? (
            <div className="space-y-4 rounded-lg border border-emerald-300/50 bg-emerald-50 p-5 text-emerald-900">
              <h3 className="text-lg font-semibold">
                {isEditMode
                  ? "Submission update completed"
                  : "Submission completed"}
              </h3>
              <p className="text-sm">
                Sit back and relax. Your lovely admin will review and approve
                your access shortly.
              </p>

              {lastSubmittedAt ? (
                <p className="text-xs text-emerald-800/80">
                  Last submitted: {lastSubmittedAt}
                </p>
              ) : null}

              {currentProofUrl ? (
                <p className="text-xs">
                  Proof link:{" "}
                  <a
                    href={currentProofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    View screenshot
                  </a>
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
              disabled={
                effectiveStepIndex === 0 ||
                (hasLocalSuccessStep && effectiveStepIndex === lastStepIndex)
              }
            >
              Prev
            </Button>

            {effectiveStepIndex < submitStepIndex ? (
              <Button type="button" onClick={goNext} disabled={!canGoNext}>
                Next
              </Button>
            ) : effectiveStepIndex === submitStepIndex ? (
              <p className="text-xs text-muted-foreground">
                {customRequestStepIndex >= 0
                  ? "Submit your custom request above to continue."
                  : "Submit proof above to continue."}
              </p>
            ) : (
              <span className="text-xs text-muted-foreground">
                All steps completed
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

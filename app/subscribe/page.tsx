import Link from "next/link";
import { redirect } from "next/navigation";
import SubscribeForm from "@/components/subscribe/subscribe-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserAccessState } from "@/lib/subscription-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  name: string | null;
  description?: string | null;
  is_public?: boolean | null;
};

const PLAN_ORDER = ["basic", "pro", "premium"] as const;

const PLAN_COPY: Record<
  string,
  {
    title: string;
    price: string;
    summary: string;
    features: string[];
  }
> = {
  basic: {
    title: "Basic",
    price: "$0 / month",
    summary: "Entry access for users who want the core market framework.",
    features: [
      "Weekly market scaffolding brief",
      "Core risk dashboards",
      "Email-only distribution",
    ],
  },
  pro: {
    title: "Pro",
    price: "$49 / month",
    summary:
      "The main operating tier for active intelligence and trade access.",
    features: [
      "Full intelligence library",
      "Quarterly strategy calls",
      "Priority briefing window",
    ],
  },
  premium: {
    title: "Premium",
    price: "$189 / month",
    summary: "High-touch advisory support for larger capital commitments.",
    features: [
      "Direct advisory channel",
      "Bespoke portfolio mapping",
      "Institutional-style reporting pack",
    ],
  },
};

function normalizePlanKey(value: string | null | undefined) {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "pro" || normalized === "growth") return "pro";
  if (normalized === "premium" || normalized === "elite") return "premium";
  return "basic";
}

function sortPlans(plans: PlanRow[]) {
  return [...plans].sort((left, right) => {
    const leftIndex = PLAN_ORDER.indexOf(normalizePlanKey(left.name));
    const rightIndex = PLAN_ORDER.indexOf(normalizePlanKey(right.name));
    return leftIndex - rightIndex;
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function SubscribePage() {
  const access = await getCurrentUserAccessState();

  if (!access.user) {
    redirect("/sign-in");
  }

  if (access.accessState === "approved") {
    redirect("/dashboard");
  }

  const db = await createSupabaseServerClient();
  const publicPlansQuery = await db
    .from("subscription_plans")
    .select("id,name,description,is_public")
    .eq("is_public", true)
    .order("name", { ascending: true });

  const planRows = publicPlansQuery.error
    ? (
        await db
          .from("subscription_plans")
          .select("id,name,description")
          .order("name", { ascending: true })
      ).data
    : publicPlansQuery.data;

  const plans = sortPlans(
    ((planRows as PlanRow[] | null) ?? []).filter((plan) => {
      const normalized = (plan.name ?? "").trim().toLowerCase();
      if (!normalized) return false;
      if (plan.is_public === false) return false;
      return normalized !== "new" && normalized !== "admin";
    }),
  );

  const currentPlanId = plans.some((plan) => plan.id === access.planId)
    ? (access.planId ?? "")
    : (plans[0]?.id ?? "");
  const lastSubmittedAt = formatDate(access.subscription?.submitted_at ?? null);
  const lastProof = access.subscription?.payment_proof ?? null;
  const isRejected = access.accessState === "rejected";

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-6xl mx-auto space-y-4">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Membership Onboarding
        </p>
        <h1 className="text-3xl sm:text-4xl font-semibold">
          Submit your plan and payment proof
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Choose a plan, upload the payment screenshot, and wait for admin
          approval before the dashboard is unlocked.
        </p>

        {isRejected ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Your last submission was rejected. Update the plan or proof and
            submit again.
          </div>
        ) : null}
      </section>

      <section className="max-w-6xl mx-auto mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,420px)]">
        <div className="grid gap-6 grid-cols-1">
          {plans.map((plan) => {
            const planKey = normalizePlanKey(plan.name);
            const copy = PLAN_COPY[planKey];
            const isFeatured = planKey === "pro";

            return (
              <Card
                key={plan.id}
                className={
                  isFeatured
                    ? "border-2 border-accent bg-accent/5 shadow-lg shadow-accent/20"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle className="text-base">{copy.title}</CardTitle>
                  <CardDescription>{copy.price}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <p>{plan.description?.trim() || copy.summary}</p>
                  <ul className="space-y-2">
                    {copy.features.map((feature) => (
                      <li key={feature}>- {feature}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Payment Submission</CardTitle>
            <CardDescription>
              Your request moves to admin review as soon as proof is submitted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!plans.length ? (
              <div className="rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                No public plans are configured yet. Add them in Supabase before
                opening onboarding.
              </div>
            ) : (
              <SubscribeForm
                userId={access.user.id}
                plans={plans.map((plan) => ({
                  id: plan.id,
                  name: plan.name ?? "Plan",
                  description: plan.description ?? null,
                }))}
                initialPlanId={currentPlanId}
              />
            )}

            {(lastSubmittedAt || lastProof) && (
              <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
                <p className="font-medium">Latest submission</p>
                {lastSubmittedAt ? (
                  <p className="mt-1 text-muted-foreground">
                    Submitted on {lastSubmittedAt}
                  </p>
                ) : null}
                {lastProof ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Payment proof preview
                    </p>

                    <a href={lastProof} target="_blank" rel="noreferrer">
                      <img
                        src={lastProof}
                        alt="Payment proof"
                        className="w-full max-w-xs rounded-md border hover:opacity-90 transition"
                      />
                    </a>
                  </div>
                ) : null}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm" variant="outline">
                <Link href="/profile">View profile</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/membership">Plan overview</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

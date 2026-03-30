import Link from "next/link"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default async function InquiryConfirmationPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/sign-in")
  }

  return (
    <main className="min-h-screen bg-background text-foreground pt-24 pb-20 px-6">
      <section className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Inquiry Submitted
            </p>
            <CardTitle className="text-3xl leading-tight">
              Your custom plan request is with admin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <p>
              We sent your request for review. Admin can use your message, budget,
              and preferences to prepare the right next step for you.
            </p>

            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Account
              </p>
              <p className="mt-1 font-medium text-foreground">
                {user.email}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="sm">
                <Link href="/profile">View profile</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/membership">Back to membership</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

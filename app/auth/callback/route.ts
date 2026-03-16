import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getCurrentUserAccessState } from "@/lib/subscription-access"
import { getPostLoginRedirectPathForState } from "@/lib/subscription-status"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.exchangeCodeForSession(code)

    const access = await getCurrentUserAccessState(supabase)

    if (access.user) {
      return NextResponse.redirect(
        `${origin}${getPostLoginRedirectPathForState(access.accessState)}`
      )
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}

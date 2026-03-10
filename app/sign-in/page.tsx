"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
  if (loading) return

  setLoading(true)

  const { error } = await supabase.auth.signInWithOtp({
    email,
  })

  if (error) {
    alert(error.message)
    setLoading(false)
    return
  }

  setStep("otp")

  setTimeout(() => {
    setLoading(false)
  }, 60000)
}

  const verifyOtp = async () => {
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    })

    setLoading(false)

    if (error) {
      alert(error.message)
      return
    }

  router.push("/tips")
  }

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-6">

        <h1 className="text-2xl font-semibold text-center">
          Sign In
        </h1>

        {step === "email" && (
          <>
            <Input
              type="email"
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
            />

            <Button
              onClick={sendOtp}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Sending code..." : "Continue"}
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            <Input
              placeholder="Enter 6-digit code"
              onChange={(e) => setOtp(e.target.value)}
            />

            <Button
              onClick={verifyOtp}
              className="w-full"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </Button>
          </>
        )}

        <div className="flex items-center gap-4 text-muted-foreground text-sm">
          <div className="flex-1 h-px bg-border" />
          OR
          <div className="flex-1 h-px bg-border" />
        </div>

        <Button
          variant="outline"
          onClick={handleGoogleLogin}
          className="w-full"
        >
          Continue with Google
        </Button>

      </div>
    </div>
  )
} 
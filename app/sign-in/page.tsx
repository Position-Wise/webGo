"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showOtp, setShowOtp] = useState(false)
  const [otp, setOtp] = useState("")

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (!error) {
      setShowOtp(true)
      await supabase.auth.signInWithOtp({ email })
    }
  }

  const verifyOtp = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    })

    if (error) alert(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Sign In
        </h1>

        <Input
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button onClick={handleLogin} className="w-full">
          Continue
        </Button>

        {showOtp && (
          <>
            <Input
              placeholder="Enter OTP from email"
              onChange={(e) => setOtp(e.target.value)}
            />
            <Button onClick={verifyOtp} className="w-full">
              Verify OTP
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
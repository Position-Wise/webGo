"use server"

import { revalidatePath } from "next/cache"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  resolveCurrentUserAdminState,
  type AccessQueryClient,
} from "@/lib/current-user-access"
import type { InquiryType } from "@/lib/inquiries"

const ROUTES_TO_REVALIDATE = [
  "/dashboard",
  "/profile",
  "/inquiries/confirmation",
  "/subscribe",
  "/admin",
  "/admin/inquiries",
] as const

function revalidateInquiryRoutes() {
  ROUTES_TO_REVALIDATE.forEach((path) => revalidatePath(path))
}

function getTrimmedString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function toNullableString(value: FormDataEntryValue | null) {
  const normalized = getTrimmedString(value)
  return normalized || null
}

async function requireAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}

async function requireAdminUser() {
  const { supabase, user } = await requireAuthenticatedUser()

  if (!user) {
    return { supabase, user: null, isAdmin: false }
  }

  const { isAdmin } = await resolveCurrentUserAdminState(
    supabase as unknown as AccessQueryClient,
    user.id
  )

  return { supabase, user, isAdmin }
}

async function insertInquiry(params: {
  type: InquiryType
  message: string
  metadata?: Record<string, string | null> | null
}) {
  const { supabase, user } = await requireAuthenticatedUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const message = params.message.trim()
  if (!message) {
    return { error: "Message is required." }
  }

  const payload: {
    user_id: string
    type: InquiryType
    message: string
    metadata?: Record<string, string | null>
  } = {
    user_id: user.id,
    type: params.type,
    message,
  }

  if (params.metadata) {
    payload.metadata = params.metadata
  }

  const { error } = await supabase.from("inquiries").insert(payload)

  if (error) {
    console.error("Inquiry insert failed:", error)
    return { error: error.message ?? "Failed to submit inquiry." }
  }

  revalidateInquiryRoutes()

  return { error: null }
}

export async function submitSupportInquiry(formData: FormData) {
  return insertInquiry({
    type: "support",
    message: getTrimmedString(formData.get("message")),
  })
}

export async function submitCustomPlanInquiry(formData: FormData) {
  return insertInquiry({
    type: "custom_plan",
    message: getTrimmedString(formData.get("message")),
    metadata: {
      budget: toNullableString(formData.get("budget")),
      preference: toNullableString(formData.get("preference")),
    },
  })
}

export async function resolveInquiry(formData: FormData): Promise<void> {
  const inquiryId = getTrimmedString(formData.get("inquiryId"))
  if (!inquiryId) return

  const { supabase, isAdmin } = await requireAdminUser()
  if (!isAdmin) return

  const { error } = await supabase
    .from("inquiries")
    .update({ status: "resolved" })
    .eq("id", inquiryId)

  if (error) {
    console.error("Inquiry resolve failed:", error)
    return
  }

  revalidateInquiryRoutes()
}

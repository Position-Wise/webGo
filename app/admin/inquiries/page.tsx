import { resolveInquiry } from "@/app/inquiries/actions"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAdminInquiries } from "../queries"
import {
  isResolvedInquiryStatus,
  readInquiryMetadataValue,
  toInquiryStatusLabel,
  toInquiryTypeLabel,
} from "@/lib/inquiries"

export const dynamic = "force-dynamic"

function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Date unavailable"

  return parsed.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function getInquiryProfile(
  value:
    | {
        full_name?: string | null
        avatar_url?: string | null
      }
    | {
        full_name?: string | null
        avatar_url?: string | null
      }[]
    | null
    | undefined
) {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function AdminInquiriesPage() {
  const inquiries = await fetchAdminInquiries()

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inquiries</CardTitle>
        </CardHeader>
        <CardContent>
          {!inquiries.length ? (
            <p className="text-sm text-muted-foreground">
              No inquiries have been submitted yet.
            </p>
          ) : (
            <div className="space-y-4">
              {inquiries.map((inquiry) => {
                const profile = getInquiryProfile(inquiry.profiles)
                const userLabel = profile?.full_name?.trim() || inquiry.user_id
                const budget = readInquiryMetadataValue(inquiry.metadata, "budget")
                const preference = readInquiryMetadataValue(inquiry.metadata, "preference")
                const isResolved = isResolvedInquiryStatus(inquiry.status)

                return (
                  <article
                    key={inquiry.id}
                    className="rounded-xl border border-border/70 bg-muted/20 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11">
                          <AvatarImage
                            src={profile?.avatar_url ?? undefined}
                            alt={userLabel}
                          />
                          <AvatarFallback>
                            {userLabel.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="space-y-2">
                          <div>
                            <p className="font-medium">
                              {userLabel}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(inquiry.created_at)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-border px-2 py-1">
                              {toInquiryTypeLabel(inquiry.type)}
                            </span>
                            <span className="rounded-full border border-border px-2 py-1">
                              {toInquiryStatusLabel(inquiry.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isResolved ? (
                        <form action={resolveInquiry}>
                          <input type="hidden" name="inquiryId" value={inquiry.id} />
                          <LoadingSubmitButton size="sm" pendingText="Resolving...">
                            Mark as resolved
                          </LoadingSubmitButton>
                        </form>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          Resolved
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          Message
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                          {inquiry.message}
                        </p>
                      </div>

                      {inquiry.type === "custom_plan" && (budget || preference) ? (
                        <div className="grid gap-3 rounded-lg border border-border/70 bg-background p-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Budget
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                              {budget ?? "Not provided"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">
                              Preference
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                              {preference ?? "Not provided"}
                            </p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

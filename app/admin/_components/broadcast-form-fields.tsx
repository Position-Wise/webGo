"use client"

import { type ChangeEvent, useState } from "react"
import {
  BROADCAST_AUDIENCE_TYPES,
  BROADCAST_EXPIRY_OPTIONS,
  toAudienceTypeLabel,
  toExpiryOptionLabel,
} from "../helpers"
import {
  normalizeBroadcastAudienceType,
  normalizeBroadcastExpiryOption,
  normalizeTargetUserIds,
} from "@/lib/broadcast-audience"
import { Input } from "@/components/ui/input"

export type BroadcastUserOption = {
  id: string
  label: string
}

type BroadcastFormFieldsProps = {
  userOptions: BroadcastUserOption[]
  initialTitle?: string | null
  initialMessage?: string | null
  initialAudienceType?: string | null
  initialTargetUserIds?: string[] | null
  initialExpiryOption?: string | null
  showConversionNotice?: boolean
}

export default function BroadcastFormFields({
  userOptions,
  initialTitle,
  initialMessage,
  initialAudienceType,
  initialTargetUserIds,
  initialExpiryOption,
  showConversionNotice = false,
}: BroadcastFormFieldsProps) {
  const normalizedAudienceType = normalizeBroadcastAudienceType(initialAudienceType)
  const normalizedExpiryOption =
    normalizeBroadcastExpiryOption(initialExpiryOption) ?? "none"
  const normalizedTargetUserIds = normalizeTargetUserIds(initialTargetUserIds)

  const [audienceType, setAudienceType] = useState<string>(normalizedAudienceType ?? "")
  const [selectedTargetUserIds, setSelectedTargetUserIds] = useState<string[]>(
    normalizedAudienceType === "users" ? normalizedTargetUserIds : []
  )

  function handleAudienceTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextAudienceType = event.target.value
    setAudienceType(nextAudienceType)

    if (nextAudienceType !== "users") {
      setSelectedTargetUserIds([])
    }
  }

  function handleTargetUserChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedTargetUserIds(
      Array.from(event.target.selectedOptions)
        .map((option) => option.value.trim())
        .filter(Boolean)
    )
  }

  const isSpecificUsersAudience = audienceType === "users"

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Audience type
          </label>
          <select
            name="audienceType"
            required
            value={audienceType}
            onChange={handleAudienceTypeChange}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="" disabled>
              Select audience type
            </option>
            {BROADCAST_AUDIENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {toAudienceTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Title (optional)
          </label>
          <Input
            name="title"
            defaultValue={initialTitle ?? ""}
            placeholder="Example: Weekly risk update"
            maxLength={120}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Expiry
          </label>
          <select
            name="expiryOption"
            defaultValue={normalizedExpiryOption}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {BROADCAST_EXPIRY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {toExpiryOptionLabel(option)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showConversionNotice ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This legacy broadcast must be converted to the new audience model before
          you can save it.
        </p>
      ) : null}

      {isSpecificUsersAudience ? (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wide">
            Select users
          </label>
          <select
            name="targetUserIds"
            multiple
            required
            value={selectedTargetUserIds}
            onChange={handleTargetUserChange}
            className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Hold Ctrl or Cmd to select multiple users. The selected auth user ids
            will be stored as targets.
          </p>
        </div>
      ) : null}

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground uppercase tracking-wide">
          Description
        </label>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={1000}
          defaultValue={initialMessage ?? ""}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          placeholder="Write the broadcast shown to users in the selected audience."
        />
      </div>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteBroadcast, updateBroadcast } from "../actions"
import BroadcastFormFields, {
  type BroadcastUserOption,
} from "../_components/broadcast-form-fields"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  isPrivateBroadcastAudienceType,
  requiresBroadcastAudienceTypeConversion,
  resolveBroadcastAudienceTypeForEditor,
} from "@/lib/broadcast-audience"

type BroadcastCardActionsProps = {
  broadcast: {
    id: string
    audience: string | null
    audience_type: string | null
    target_user_ids: string[] | null
    broadcast_type: string | null
    duration: string | null
    expiry_option: string | null
    title: string | null
    message: string
  }
  userOptions: BroadcastUserOption[]
}

export default function BroadcastCardActions({
  broadcast,
  userOptions,
}: BroadcastCardActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareLabel, setShareLabel] = useState("Share")
  const [isUpdating, startUpdateTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const initialAudienceType = resolveBroadcastAudienceTypeForEditor({
    audienceType: broadcast.audience_type,
    audience: broadcast.audience,
  })
  const showConversionNotice = requiresBroadcastAudienceTypeConversion({
    audienceType: broadcast.audience_type,
    audience: broadcast.audience,
  })
  const isPrivateBroadcast = isPrivateBroadcastAudienceType(broadcast.audience_type)

  async function handleShare() {
    if (isSharing || isPrivateBroadcast) return

    setIsSharing(true)
    setShareLabel("Preparing...")

    try {
      const response = await fetch(
        `/api/admin/broadcasts/${encodeURIComponent(broadcast.id)}/share`,
        {
          method: "GET",
          cache: "no-store",
        }
      )

      const payload = (await response.json()) as { shareUrl?: string; error?: string }

      if (!response.ok || !payload.shareUrl) {
        throw new Error(payload.error || "Unable to generate share link.")
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.shareUrl)
        setShareLabel("Copied")
      } else {
        window.prompt("Copy this share link", payload.shareUrl)
        setShareLabel("Ready")
      }
    } catch {
      setShareLabel("Share failed")
    } finally {
      setIsSharing(false)
      window.setTimeout(() => setShareLabel("Share"), 1500)
    }
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startUpdateTransition(async () => {
      await updateBroadcast(formData)
      setEditOpen(false)
      router.refresh()
    })
  }

  function handleDelete() {
    if (isDeleting) return

    const shouldDelete = window.confirm(
      "Delete this broadcast? This action cannot be undone."
    )
    if (!shouldDelete) return

    startDeleteTransition(async () => {
      const formData = new FormData()
      formData.set("broadcastId", broadcast.id)
      await deleteBroadcast(formData)
      router.refresh()
    })
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPrivateBroadcast || isSharing || isUpdating || isDeleting}
        onClick={() => void handleShare()}
      >
        {isPrivateBroadcast ? "Private" : isSharing ? "Sharing..." : shareLabel}
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="outline" disabled={isUpdating || isDeleting}>
            Edit
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Broadcast</DialogTitle>
            <DialogDescription>
              Update targeting, expiry, and content without breaking legacy display.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <input type="hidden" name="broadcastId" value={broadcast.id} />
            <BroadcastFormFields
              userOptions={userOptions}
              initialTitle={broadcast.title}
              initialMessage={broadcast.message}
              initialAudienceType={initialAudienceType}
              initialTargetUserIds={broadcast.target_user_ids}
              initialExpiryOption={broadcast.expiry_option}
              showConversionNotice={showConversionNotice}
            />

            <DialogFooter showCloseButton>
              <Button type="submit" size="sm" disabled={isUpdating || isDeleting}>
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        onClick={handleDelete}
        disabled={isDeleting || isUpdating}
        aria-label="Delete broadcast"
        title="Delete broadcast"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { deleteBroadcast, updateBroadcast } from "../actions"
import {
  BROADCAST_AUDIENCES,
  BROADCAST_DURATIONS,
  BROADCAST_TYPES,
  toAudienceLabel,
  toBroadcastTypeLabel,
  toDurationLabel,
} from "../helpers"
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
import { Input } from "@/components/ui/input"

type BroadcastCardActionsProps = {
  broadcast: {
    id: string
    audience: string | null
    broadcast_type: string | null
    duration: string | null
    title: string | null
    message: string
  }
}

export default function BroadcastCardActions({ broadcast }: BroadcastCardActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  const [shareLabel, setShareLabel] = useState("Share")
  const [isUpdating, startUpdateTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  async function handleShare() {
    if (isSharing) return

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
        disabled={isSharing || isUpdating || isDeleting}
        onClick={() => void handleShare()}
      >
        {isSharing ? "Sharing..." : shareLabel}
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
              Update audience, message type, duration, and content.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-3" onSubmit={handleEditSubmit}>
            <input type="hidden" name="broadcastId" value={broadcast.id} />

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Target audience
                </label>
                <select
                  name="audience"
                  defaultValue={broadcast.audience ?? "all"}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {BROADCAST_AUDIENCES.map((audience) => (
                    <option key={audience} value={audience}>
                      {toAudienceLabel(audience)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Broadcast type
                </label>
                <select
                  name="broadcastType"
                  defaultValue={broadcast.broadcast_type ?? "investment"}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {BROADCAST_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {toBroadcastTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Display duration
                </label>
                <select
                  name="duration"
                  defaultValue={broadcast.duration ?? "forever"}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {BROADCAST_DURATIONS.map((duration) => (
                    <option key={duration} value={duration}>
                      {toDurationLabel(duration)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                Title (optional)
              </label>
              <Input
                name="title"
                defaultValue={broadcast.title ?? ""}
                maxLength={120}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">
                Message
              </label>
              <textarea
                name="message"
                required
                rows={5}
                defaultValue={broadcast.message}
                maxLength={1000}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>

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

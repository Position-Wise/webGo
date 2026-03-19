"use client"

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"

type ProofPreviewDrawerProps = {
  paymentProof: string
  memberLabel: string
}

export default function ProofPreviewDrawer({
  paymentProof,
  memberLabel,
}: ProofPreviewDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="inline-flex rounded border border-border hover:opacity-90 transition-opacity"
        >
          <img
            src={paymentProof}
            alt={`${memberLabel} payment proof`}
            className="h-12 w-12 rounded object-cover"
          />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            Payment Proof
          </DrawerTitle>
          <DrawerDescription>
            Submitted by {memberLabel}
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-6">
          <a href={paymentProof} target="_blank" rel="noreferrer">
            <img
              src={paymentProof}
              alt={`${memberLabel} payment proof full preview`}
              className="mx-auto max-h-[70vh] w-auto rounded-md border"
            />
          </a>
          <div className="mt-3 flex justify-end">
            <Button asChild size="sm" variant="outline">
              <a href={paymentProof} target="_blank" rel="noreferrer">
                Open in new tab
              </a>
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

"use client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProofPreviewDrawerProps = {
  paymentProof: string;
  memberLabel: string;
};

export default function ProofPreviewDrawer({
  paymentProof,
  memberLabel,
}: ProofPreviewDrawerProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
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
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment Proof</DialogTitle>
          <DialogDescription>Submitted by {memberLabel}</DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-6">
          <a href={paymentProof} target="_blank" rel="noreferrer">
            <img
              src={paymentProof}
              alt={`${memberLabel} payment proof full preview`}
              className="mx-auto max-h-[70vh] w-auto rounded-md border"
            />
          </a>
        </div>
        <DialogFooter>
          <Button asChild size="sm" variant="outline">
            <a href={paymentProof} target="_blank" rel="noreferrer">
              Open in new tab
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

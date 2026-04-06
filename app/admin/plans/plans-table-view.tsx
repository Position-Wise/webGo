"use client";

import { useState } from "react";
import { updatePlan } from "../actions";
import { toTitleCase } from "../helpers";
import type { SubscriptionPlanRow } from "../types";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import LoadingSubmitButton from "@/components/ui/loading-submit-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PlansTableViewProps = {
  plans: SubscriptionPlanRow[];
};

export function getPlanName(plan: SubscriptionPlanRow) {
  const normalized = (plan.name ?? "").trim().toLowerCase();
  if (normalized === "growth") return "pro";
  if (normalized === "elite") return "premium";
  return normalized || "basic";
}

function isSystemPlan(plan: SubscriptionPlanRow) {
  const name = getPlanName(plan);
  if (typeof plan.is_public === "boolean") {
    return !plan.is_public;
  }
  return name === "new" || name === "admin";
}

export function getDescription(plan: SubscriptionPlanRow) {
  const fromDb = (plan.description ?? "").trim();
  if (fromDb) return fromDb;

  const name = getPlanName(plan);
  if (name === "basic") return "Entry access for public onboarding";
  if (name === "pro") return "Trade signals and active intelligence";
  if (name === "premium") return "Full access and high-touch support";
  if (name === "new") return "Assigned automatically on signup";
  if (name === "admin") return "Internal admin access";
  return "Custom plan";
}

export function getAllowTrade(plan: SubscriptionPlanRow) {
  if (typeof plan.allow_trade === "boolean") return plan.allow_trade;
  const name = getPlanName(plan);
  return name === "pro" || name === "premium" || name === "admin";
}

export function getAllowInvestment(plan: SubscriptionPlanRow) {
  if (typeof plan.allow_investment === "boolean") return plan.allow_investment;
  return getPlanName(plan) !== "new";
}

export function getTradeLimit(plan: SubscriptionPlanRow) {
  if (typeof plan.trade_limit_per_week === "number") {
    return Math.max(0, Math.floor(plan.trade_limit_per_week));
  }

  const name = getPlanName(plan);
  if (name === "basic" || name === "new") return 0;
  if (name === "pro") return 2;
  if (name === "premium" || name === "admin") return 99;
  return 0;
}

export function getVisibilityLabel(plan: SubscriptionPlanRow) {
  return isSystemPlan(plan) ? "System" : "Public";
}

function FeatureFlag({ enabled }: { enabled: boolean }) {
  return (
    <span className={enabled ? "text-emerald-700" : "text-muted-foreground"}>
      {enabled ? "Yes" : "No"}
    </span>
  );
}

function getPlanTypeLabel(plan: SubscriptionPlanRow) {
  const trade = getAllowTrade(plan);
  const invest = getAllowInvestment(plan);

  if (trade && invest) return "Trsder & Investor";
  if (trade) return "Trader";
  if (invest) return "Investor";

  return "—";
}

function PlanViewDrawer({ plan }: { plan: SubscriptionPlanRow }) {
  const planName = getPlanName(plan);
  const description = getDescription(plan);
  const allowTrade = getAllowTrade(plan);
  const allowInvestment = getAllowInvestment(plan);
  const tradeLimit = getTradeLimit(plan);

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm">
          View
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Plan Details</DrawerTitle>
          <DrawerDescription>
            Read-only plan capability snapshot.
          </DrawerDescription>
        </DrawerHeader>

        <div className="space-y-2 text-sm">
          <p>Plan: {toTitleCase(planName)}</p>
          <p>Visibility: {getVisibilityLabel(plan)}</p>
          <p>Plan Type: {getPlanTypeLabel(plan)}</p>
          <p>Description: {description}</p>
          <p>Trade allowed: {allowTrade ? "Yes" : "No"}</p>
          <p>Investment allowed: {allowInvestment ? "Yes" : "No"}</p>
          <p>Trade limit per week: {tradeLimit}</p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function PlanEditDrawer({ plan }: { plan: SubscriptionPlanRow }) {
  const [allowTrade, setAllowTrade] = useState(getAllowTrade(plan));
  const [allowInvestment, setAllowInvestment] = useState(
    getAllowInvestment(plan),
  );
  const [tradeLimit, setTradeLimit] = useState(String(getTradeLimit(plan)));
  const [description, setDescription] = useState(getDescription(plan));

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button size="sm">Edit</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Edit Plan</DrawerTitle>
          <DrawerDescription>
            Update trade and investment permissions.
          </DrawerDescription>
        </DrawerHeader>

        <form action={updatePlan} className="space-y-4">
          <input type="hidden" name="planId" value={plan.id} />
          <input
            type="hidden"
            name="allowTrade"
            value={allowTrade ? "true" : "false"}
          />
          <input
            type="hidden"
            name="allowInvestment"
            value={allowInvestment ? "true" : "false"}
          />

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Plan Name
            </label>
            <Input value={toTitleCase(getPlanName(plan))} readOnly />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Visibility
            </label>
            <Input value={getVisibilityLabel(plan)} readOnly />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Description
            </label>
            <Input
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Trade Allowed</p>
              <p className="text-xs text-muted-foreground">
                Enable trade broadcast access
              </p>
            </div>
            <Switch checked={allowTrade} onCheckedChange={setAllowTrade} />
          </div>

          <div className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
            <div>
              <p className="text-sm font-medium">Investment Allowed</p>
              <p className="text-xs text-muted-foreground">
                Enable investment broadcast access
              </p>
            </div>
            <Switch
              checked={allowInvestment}
              onCheckedChange={setAllowInvestment}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Trade limit per week
            </label>
            <Input
              name="tradeLimit"
              type="number"
              min={0}
              value={tradeLimit}
              onChange={(event) => setTradeLimit(event.target.value)}
            />
          </div>

          <LoadingSubmitButton type="submit" size="sm" pendingText="Saving...">
            Save plan
          </LoadingSubmitButton>
        </form>
      </DrawerContent>
    </Drawer>
  );
}

export default function PlansTableView({ plans }: PlansTableViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead>Plan Type</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Trades</TableHead>
          <TableHead>Investments</TableHead>
          <TableHead>Limit / Week</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell className="font-medium">
              {toTitleCase(getPlanName(plan))}
            </TableCell>
            <TableCell>{getVisibilityLabel(plan)}</TableCell>
            <TableCell>{getPlanTypeLabel(plan)}</TableCell>
            <TableCell className="max-w-[320px] whitespace-normal text-muted-foreground">
              {getDescription(plan)}
            </TableCell>
            <TableCell>
              <FeatureFlag enabled={getAllowTrade(plan)} />
            </TableCell>
            <TableCell>
              <FeatureFlag enabled={getAllowInvestment(plan)} />
            </TableCell>
            <TableCell>{getTradeLimit(plan)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <PlanViewDrawer plan={plan} />
                <PlanEditDrawer plan={plan} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

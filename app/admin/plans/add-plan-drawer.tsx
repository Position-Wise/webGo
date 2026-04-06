"use client"

import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useState } from "react"
import { addPlan } from "../actions"
import { Input } from "@/components/ui/input"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"

export function AddPlanDrawer() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [planType, setPlanType] = useState<"trader" | "investor" | "both">("both")
  const [price, setPrice] = useState("")
  const [tradeLimit, setTradeLimit] = useState("0")

  const [allowTrade] = useState(true)
  const [allowInvestment, setAllowInvestment] = useState(true)
  const [isPublic, setIsPublic] = useState(true)
  const [isActive] = useState(true)

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="w-full">Add New Plan</Button>
      </DrawerTrigger>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add New Plan</DrawerTitle>
          <DrawerDescription>
            Create and configure a new subscription plan.
          </DrawerDescription>
        </DrawerHeader>

        <form action={addPlan} className="space-y-4">

          {/* Hidden values */}
          <input type="hidden" name="allowTrade" value={allowTrade ? "true" : "false"} />
          <input type="hidden" name="allowInvestment" value={allowInvestment ? "true" : "false"} />
          <input type="hidden" name="isPublic" value={isPublic ? "true" : "false"} />
          <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />

          {/* Plan Name */}
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">
              Plan Name
            </label>
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pro Plan"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">
              Description
            </label>
            <Input
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>

          {/* Plan Type */}
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">
              Plan Type
            </label>
            <select
              name="planType"
              value={planType}
              onChange={(e) =>
                setPlanType(e.target.value as "trader" | "investor" | "both")
              }
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="both">Trader & Investor</option>
              <option value="trader">Trader Only</option>
              <option value="investor">Investor Only</option>
            </select>
          </div>

          {/* Price */}
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">
              Price
            </label>
            <Input
              name="price"
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 999"
            />
          </div>

          {/* Trade Limit */}
          <div className="space-y-1">
            <label className="text-xs uppercase text-muted-foreground">
              Trade Limit / Week
            </label>
            <Input
              name="tradeLimit"
              type="number"
              min={0}
              value={tradeLimit}
              onChange={(e) => setTradeLimit(e.target.value)}
            />
          </div>
          

          {/* Toggles */}
          {/* <div className="space-y-3">

            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="text-sm font-medium">Allow Trade</p>
                <p className="text-xs text-muted-foreground">
                  Enable trading signals
                </p>
              </div>
              <Switch checked={allowTrade} onCheckedChange={setAllowTrade} />
            </div>

            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="text-sm font-medium">Allow Investment</p>
                <p className="text-xs text-muted-foreground">
                  Enable investment signals
                </p>
              </div>
              <Switch
                checked={allowInvestment}
                onCheckedChange={setAllowInvestment}
              />
            </div>

            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="text-sm font-medium">Public Plan</p>
                <p className="text-xs text-muted-foreground">
                  Visible to users
                </p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex items-center justify-between border rounded-md px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Enable or disable this plan
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>

          </div> */}

          <LoadingSubmitButton type="submit" size="sm" pendingText="Creating...">
            Create Plan
          </LoadingSubmitButton>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
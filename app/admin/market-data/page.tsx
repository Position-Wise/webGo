import {
  createMarketSymbol,
  deleteMarketSymbol,
  updateMarketSymbol,
} from "../actions"
import { fetchAdminMarketSymbols } from "../queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import LoadingSubmitButton from "@/components/ui/loading-submit-button"

export const dynamic = "force-dynamic"

export default async function AdminMarketDataPage() {
  const symbols = await fetchAdminMarketSymbols()

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Market Symbol</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createMarketSymbol} className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Symbol
              </label>
              <Input name="symbol" placeholder="RELIANCE.NS" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Display name
              </label>
              <Input name="displayName" placeholder="Reliance Industries" />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">
                Sort order
              </label>
              <Input name="sortOrder" type="number" defaultValue="0" min={0} />
            </div>

            <div className="flex items-end gap-3">
              <input type="hidden" name="isActive" value="false" />
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" name="isActive" value="true" defaultChecked />
                Active
              </label>
            </div>

            <div className="md:col-span-4">
              <LoadingSubmitButton type="submit" size="sm" pendingText="Adding...">
                Add symbol
              </LoadingSubmitButton>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured Symbols</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!symbols.length ? (
            <p className="text-sm text-muted-foreground">
              No symbols configured yet. Add symbols above.
            </p>
          ) : (
            symbols.map((row) => (
              <article
                key={row.id}
                className="rounded-lg border border-border/70 bg-muted/20 p-4"
              >
                <form action={updateMarketSymbol} className="grid gap-3 md:grid-cols-5">
                  <input type="hidden" name="id" value={row.id} />

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Symbol
                    </label>
                    <Input
                      name="symbol"
                      defaultValue={(row.symbol ?? "").trim().toUpperCase()}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Display name
                    </label>
                    <Input
                      name="displayName"
                      defaultValue={(row.display_name ?? "").trim()}
                      placeholder="Display name"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">
                      Sort order
                    </label>
                    <Input
                      name="sortOrder"
                      type="number"
                      min={0}
                      defaultValue={String(row.sort_order ?? 0)}
                    />
                  </div>

                  <div className="flex items-end gap-3">
                    <input type="hidden" name="isActive" value="false" />
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="isActive"
                        value="true"
                        defaultChecked={row.is_active !== false}
                      />
                      Active
                    </label>
                  </div>

                  <div className="flex items-end gap-2">
                    <LoadingSubmitButton type="submit" size="sm" pendingText="Saving...">
                      Save
                    </LoadingSubmitButton>
                  </div>
                </form>

                <form action={deleteMarketSymbol} className="mt-3">
                  <input type="hidden" name="id" value={row.id} />
                  <LoadingSubmitButton
                    type="submit"
                    size="sm"
                    variant="destructive"
                    pendingText="Deleting..."
                  >
                    Delete
                  </LoadingSubmitButton>
                </form>
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </section>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MarketSymbolOption } from "@/lib/market-symbols"

const POLL_INTERVAL_MS = 8_000
const SYMBOL_PATTERN = /^[A-Za-z0-9^.\-=&]+$/

type QuoteRow = {
  symbol: string
  shortName: string | null
  regularMarketPrice: number | null
  regularMarketChange: number | null
  regularMarketChangePercent: number | null
  regularMarketTime: number | null
  marketState: string | null
  currency: string | null
}

type QuotesResponse = {
  symbols: string[]
  quotes: QuoteRow[]
  error?: string
}

function normalizeSymbol(value: string) {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  if (normalized.length > 20) return null
  if (!SYMBOL_PATTERN.test(normalized)) return null
  return normalized
}

function normalizeLabel(value: string | null | undefined, fallback: string) {
  const normalized = (value ?? "").trim()
  return normalized || fallback
}

function formatPrice(value: number | null, currency: string | null) {
  if (typeof value !== "number") return "N/A"
  if (!currency) return value.toLocaleString("en-IN", { maximumFractionDigits: 2 })

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return value.toLocaleString("en-IN", { maximumFractionDigits: 2 })
  }
}

function formatSigned(value: number | null, fractionDigits = 2) {
  if (typeof value !== "number") return "N/A"
  const prefix = value > 0 ? "+" : ""
  return `${prefix}${value.toFixed(fractionDigits)}`
}

function formatUpdatedAt(unixSeconds: number | null) {
  if (typeof unixSeconds !== "number") return "Update unavailable"
  const parsed = new Date(unixSeconds * 1000)
  if (Number.isNaN(parsed.getTime())) return "Update unavailable"

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed)
}

export default function LiveMarketBoard({
  availableSymbols,
}: {
  availableSymbols: MarketSymbolOption[]
}) {
  const [dataError, setDataError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])

  const selectedSymbols = useMemo(() => {
    const seen = new Set<string>()
    const symbols: string[] = []

    for (const option of availableSymbols) {
      const symbol = normalizeSymbol(option.symbol)
      if (!symbol || seen.has(symbol)) continue
      seen.add(symbol)
      symbols.push(symbol)
    }

    return symbols
  }, [availableSymbols])

  const labelBySymbol = useMemo(() => {
    return availableSymbols.reduce<Record<string, string>>((acc, option) => {
      const symbol = normalizeSymbol(option.symbol)
      if (!symbol) return acc
      acc[symbol] = normalizeLabel(option.label, symbol)
      return acc
    }, {})
  }, [availableSymbols])

  const quoteBySymbol = useMemo(() => {
    return quotes.reduce<Record<string, QuoteRow>>((acc, quote) => {
      acc[quote.symbol.toUpperCase()] = quote
      return acc
    }, {})
  }, [quotes])

  useEffect(() => {
    if (!selectedSymbols.length) {
      setQuotes([])
      setDataError(null)
      setLoading(false)
      return
    }

    let isMounted = true
    const symbolsParam = encodeURIComponent(selectedSymbols.join(","))

    const loadQuotes = async (showLoading: boolean) => {
      if (showLoading && isMounted) setLoading(true)

      try {
        const response = await fetch(`/api/market/quotes?symbols=${symbolsParam}`, {
          cache: "no-store",
        })
        const payload = (await response.json()) as QuotesResponse

        if (!isMounted) return

        if (!response.ok) {
          setDataError(payload.error ?? "Unable to load live quote data.")
          return
        }

        setQuotes(payload.quotes ?? [])
        setDataError(payload.error ?? null)
      } catch {
        if (!isMounted) return
        setDataError("Unable to load live quote data right now.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    void loadQuotes(true)
    const timer = window.setInterval(() => {
      void loadQuotes(false)
    }, POLL_INTERVAL_MS)

    return () => {
      isMounted = false
      window.clearInterval(timer)
    }
  }, [selectedSymbols])

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Live market update</CardTitle>
        <p className="text-sm text-muted-foreground">
          Market symbols below come directly from your active Supabase market
          configuration and refresh every few seconds.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {!selectedSymbols.length ? (
          <p className="text-sm text-muted-foreground">
            No active market symbols are configured yet.
          </p>
        ) : null}

        {dataError && (
          <p className="text-sm text-destructive">
            {dataError}
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {selectedSymbols.map((symbol) => {
            const quote = quoteBySymbol[symbol]
            const change = quote?.regularMarketChange ?? null
            const isPositive = typeof change === "number" && change > 0
            const isNegative = typeof change === "number" && change < 0

            return (
              <article
                key={symbol}
                className="rounded-lg border border-border/70 bg-muted/20 p-4"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {symbol}
                </p>
                <h3 className="mt-1 text-sm font-semibold">
                  {labelBySymbol[symbol] ?? quote?.shortName ?? symbol}
                </h3>
                <p className="mt-3 text-lg font-semibold">
                  {formatPrice(quote?.regularMarketPrice ?? null, quote?.currency ?? "INR")}
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    isPositive && "text-emerald-600",
                    isNegative && "text-red-600",
                    !isPositive && !isNegative && "text-muted-foreground"
                  )}
                >
                  {formatSigned(quote?.regularMarketChange ?? null)} (
                  {formatSigned(quote?.regularMarketChangePercent ?? null)}%)
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {quote ? formatUpdatedAt(quote.regularMarketTime) : "Waiting for live data..."}
                </p>
              </article>
            )
          })}
        </div>

        {loading && selectedSymbols.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Refreshing quotes...
          </p>
        ) : null}

        <p className="text-xs text-muted-foreground">
          Cards source: Yahoo public quote feed via server API.
        </p>
      </CardContent>
    </Card>
  )
}

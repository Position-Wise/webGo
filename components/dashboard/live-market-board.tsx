"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { MarketSymbolOption } from "@/lib/market-symbols"

const FOREGROUND_POLL_INTERVAL_MS = 10_000
const BACKGROUND_POLL_INTERVAL_MS = 30_000
const ERROR_POLL_INTERVAL_MS = 45_000
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

function formatDelay(unixSeconds: number | null) {
  if (typeof unixSeconds !== "number") return null
  const delaySeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  const delayMinutes = Math.floor(delaySeconds / 60)
  if (delayMinutes <= 0) return "near real-time"
  if (delayMinutes === 1) return "1 min delayed"
  return `${delayMinutes} min delayed`
}

function formatUpdateDate(unixSeconds: number | null) {
  if (typeof unixSeconds !== "number") return "--"
  const parsed = new Date(unixSeconds * 1000)
  if (Number.isNaN(parsed.getTime())) return "--"
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed)
}

function formatUpdateTime(unixSeconds: number | null) {
  if (typeof unixSeconds !== "number") return "--"
  const parsed = new Date(unixSeconds * 1000)
  if (Number.isNaN(parsed.getTime())) return "--"
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed)
}

function formatDelayMinutes(unixSeconds: number | null) {
  if (typeof unixSeconds !== "number") return "--"
  const delaySeconds = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  return `${Math.floor(delaySeconds / 60)} min`
}

export default function LiveMarketBoard({
  availableSymbols,
}: {
  availableSymbols: MarketSymbolOption[]
}) {
  const [dataError, setDataError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [errorStreak, setErrorStreak] = useState(0)

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
          setErrorStreak((current) => current + 1)
          return
        }

        setQuotes(payload.quotes ?? [])
        setDataError(payload.error ?? null)
        setErrorStreak(0)
      } catch {
        if (!isMounted) return
        setDataError("Unable to load live quote data right now.")
        setErrorStreak((current) => current + 1)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    let timer: number | null = null
    const scheduleNextPoll = () => {
      if (!isMounted) return
      const isTabVisible = document.visibilityState === "visible"
      const nextInterval = errorStreak > 0
        ? ERROR_POLL_INTERVAL_MS
        : isTabVisible
          ? FOREGROUND_POLL_INTERVAL_MS
          : BACKGROUND_POLL_INTERVAL_MS

      timer = window.setTimeout(async () => {
        await loadQuotes(false)
        scheduleNextPoll()
      }, nextInterval)
    }

    void loadQuotes(true).then(() => {
      scheduleNextPoll()
    })

    return () => {
      isMounted = false
      if (timer !== null) {
        window.clearTimeout(timer)
      }
    }
  }, [errorStreak, selectedSymbols])

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Live market update</CardTitle>
        <p className="text-sm text-muted-foreground">
          Data is not live and is updated every 30 seconds. Please look up on the exchange for the latest price.
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

        <div className="grid gap-4 lg:grid-cols-2">
          {selectedSymbols.map((symbol) => {
            const quote = quoteBySymbol[symbol]
            const change = quote?.regularMarketChange ?? null
            const isPositive = typeof change === "number" && change > 0
            const isNegative = typeof change === "number" && change < 0
            const showName = (labelBySymbol[symbol] ?? quote?.shortName ?? symbol).toUpperCase()

            return (
              <article
                key={symbol}
                className="overflow-hidden rounded-3xl bg-[#1f3761] text-white shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* <div className="grid h-20 w-20 shrink-0 grid-cols-2 overflow-hidden rounded-2xl bg-white p-3 sm:h-24 sm:w-24">
                    </div> */}
                    <h3 className="mt-1 truncate text-2xl font-extrabold  sm:text-3xl">
                      {showName}
                    </h3>

                    <div>
                      {/* <p className="text-xs tracking-[0.2em] text-blue-100/80">{symbol}</p> */}
                      <p className="mt-1 justify-end text-lg text-right font-extrabold sm:text-xl">
                        {formatPrice(quote?.regularMarketPrice ?? null, quote?.currency ?? "INR")}
                      </p>
                      <p
                        className={cn(
                          "mt-1 text-xs sm:text-base font-bold",
                          isPositive && "text-emerald-300",
                          isNegative && "text-rose-300",
                          !isPositive && !isNegative && "text-blue-100"
                        )}
                      >
                        {formatSigned(quote?.regularMarketChange ?? null)} (
                        {formatSigned(quote?.regularMarketChangePercent ?? null)}%)
                      </p>
                    </div>
                  </div>

                  {/* <div className="mt-6 grid grid-cols-2 divide-x divide-white/25 rounded-2xl border border-white/20 bg-white/5">
                    <div className="p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-100/80">
                        Updated
                      </p>
                      <p className="mt-2 text-lg font-extrabold sm:text-2xl">
                        {formatUpdateDate(quote?.regularMarketTime ?? null)}
                      </p>
                      
                    </div>
                    <div className="p-4 text-center">
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-100/80">
                        Delay
                      </p>
                      <p className="mt-2 text-3xl font-extrabold sm:text-4xl">
                        {formatDelayMinutes(quote?.regularMarketTime ?? null)}
                      </p>
                      
                    </div>
                  </div> */}

                  <div className="flex justify-between items-center">
                  <p className="text-xs text-blue-100/80">
                    {quote ? formatUpdatedAt(quote.regularMarketTime) : "Waiting for live data..."}
                  </p>
                  <p className="text-xs text-blue-100/80">
                    {formatDelay(quote?.regularMarketTime ?? null) ?? "Waiting for live data..."}
                  </p>
                  </div>
                  
                </div>
              </article>
            )
          })}
        </div>

        {loading && selectedSymbols.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Refreshing quotes...
          </p>
        ) : null}

        <div className="flex flex-wrap justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Cards source: Yahoo public quote feed via server API.
        </p>
        <p className="text-xs text-muted-foreground">
          Polling: 10s active tab, 30s in background, 45s on provider errors.
        </p>
        </div>
      </CardContent>
    </Card>
  )
}

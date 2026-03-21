"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  MANDATORY_MARKET_OPTIONS,
  MANDATORY_MARKET_SYMBOLS,
  type MarketSymbolOption,
} from "@/lib/market-symbols"

const STORAGE_KEY = "dashboard-market-custom-symbols-v2"
const MANDATORY_SYMBOLS = MANDATORY_MARKET_SYMBOLS
const MAX_CUSTOM_SYMBOLS = 6
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

function toTradingViewProName(symbol: string) {
  const normalized = symbol.trim().toUpperCase()
  if (normalized === "^BSESN") return "BSE:SENSEX"
  if (normalized === "^NSEI") return "NSE:NIFTY"
  if (normalized.endsWith(".NS")) return `NSE:${normalized.slice(0, -3)}`
  if (normalized.endsWith(".BO")) return `BSE:${normalized.slice(0, -3)}`
  if (normalized.includes(":")) return normalized
  return null
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

function parseStoredSymbols(raw: string | null) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is string => typeof item === "string")
      .map(normalizeSymbol)
      .filter((value): value is string => Boolean(value))
      .slice(0, MAX_CUSTOM_SYMBOLS)
  } catch {
    return []
  }
}

export default function LiveMarketBoard({
  availableSymbols,
}: {
  availableSymbols: MarketSymbolOption[]
}) {
  const [customSymbols, setCustomSymbols] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    return parseStoredSymbols(localStorage.getItem(STORAGE_KEY))
  })
  const [selectedSymbol, setSelectedSymbol] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [stripError, setStripError] = useState<string | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const stripRef = useRef<HTMLDivElement | null>(null)

  const baseLabelBySymbol = useMemo(() => {
    return MANDATORY_MARKET_OPTIONS.reduce<Record<string, string>>((acc, option) => {
      acc[option.symbol.toUpperCase()] = option.label
      return acc
    }, {})
  }, [])

  const adminConfiguredOptions = useMemo<MarketSymbolOption[]>(() => {
    const seen = new Set<string>()
    const list: MarketSymbolOption[] = []

    for (const option of availableSymbols) {
      const symbol = normalizeSymbol(option.symbol)
      if (!symbol) continue
      if (MANDATORY_SYMBOLS.includes(symbol as (typeof MANDATORY_SYMBOLS)[number])) {
        continue
      }
      if (seen.has(symbol)) continue
      seen.add(symbol)

      list.push({
        symbol,
        label: normalizeLabel(option.label, symbol),
      })
    }

    return list
  }, [availableSymbols])

  const supportedCustomSymbols = useMemo(() => {
    return new Set(adminConfiguredOptions.map((option) => option.symbol))
  }, [adminConfiguredOptions])

  const effectiveCustomSymbols = useMemo(() => {
    return customSymbols
      .map(normalizeSymbol)
      .filter((value): value is string => Boolean(value))
      .filter((symbol) => supportedCustomSymbols.has(symbol))
      .slice(0, MAX_CUSTOM_SYMBOLS)
  }, [customSymbols, supportedCustomSymbols])

  const selectedSymbols = useMemo(
    () => [...MANDATORY_SYMBOLS, ...effectiveCustomSymbols],
    [effectiveCustomSymbols]
  )

  const labelBySymbol = useMemo(() => {
    const next = { ...baseLabelBySymbol }
    for (const option of adminConfiguredOptions) {
      next[option.symbol.toUpperCase()] = option.label
    }
    return next
  }, [adminConfiguredOptions, baseLabelBySymbol])

  const addableOptions = useMemo(() => {
    return adminConfiguredOptions.filter(
      (option) => !effectiveCustomSymbols.includes(option.symbol)
    )
  }, [adminConfiguredOptions, effectiveCustomSymbols])

  const effectiveSelectedSymbol = useMemo(() => {
    if (!addableOptions.length) return ""
    if (addableOptions.some((option) => option.symbol === selectedSymbol)) {
      return selectedSymbol
    }
    return addableOptions[0].symbol
  }, [addableOptions, selectedSymbol])

  const quoteBySymbol = useMemo(() => {
    return quotes.reduce<Record<string, QuoteRow>>((acc, quote) => {
      acc[quote.symbol.toUpperCase()] = quote
      return acc
    }, {})
  }, [quotes])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(effectiveCustomSymbols))
  }, [effectiveCustomSymbols])

  useEffect(() => {
    const root = stripRef.current
    if (!root) return
    root.innerHTML = ""

    const sensexSymbol = toTradingViewProName("^BSESN")
    if (!sensexSymbol) return

    const widgetContainer = document.createElement("div")
    widgetContainer.className = "tradingview-widget-container__widget"
    root.appendChild(widgetContainer)

    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js"
    script.type = "text/javascript"
    script.async = true
    script.text = JSON.stringify({
      symbols: [{ proName: sensexSymbol, description: "SENSEX" }],
      isTransparent: true,
      showSymbolLogo: true,
      colorTheme: "light",
      displayMode: "adaptive",
      locale: "en",
    })
    script.onerror = () => {
      setStripError(
        "Sensex strip could not load. Disable ad-block/privacy shield for this site and refresh."
      )
    }
    script.onload = () => {
      setStripError(null)
    }
    root.appendChild(script)

    return () => {
      root.innerHTML = ""
    }
  }, [])

  useEffect(() => {
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

  const onAddSymbol = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizeSymbol(effectiveSelectedSymbol)

    if (!normalized) {
      setFormError("No symbol available to add. Ask admin to add symbols.")
      return
    }

    if (effectiveCustomSymbols.includes(normalized)) {
      setFormError("That symbol is already in your list.")
      return
    }

    if (effectiveCustomSymbols.length >= MAX_CUSTOM_SYMBOLS) {
      setFormError("You can add up to 6 extra symbols.")
      return
    }

    setCustomSymbols((current) => [...current, normalized])
    setSelectedSymbol("")
    setFormError(null)
  }

  const onRemoveSymbol = (symbol: string) => {
    setCustomSymbols((current) => current.filter((value) => value !== symbol))
  }

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">Live market update</CardTitle>
        <p className="text-sm text-muted-foreground">
          Sensex strip is shown on top. Live cards below refresh every few seconds.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div
          ref={stripRef}
          className="tradingview-widget-container min-h-[84px] rounded-lg border border-border/70 bg-muted/20 p-2"
        />

        {stripError && (
          <p className="text-sm text-destructive">
            {stripError}
          </p>
        )}

        <form onSubmit={onAddSymbol} className="flex flex-col gap-2 sm:flex-row">
          <select
            value={effectiveSelectedSymbol}
            onChange={(event) => setSelectedSymbol(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            disabled={!addableOptions.length || effectiveCustomSymbols.length >= MAX_CUSTOM_SYMBOLS}
          >
            {addableOptions.length ? (
              addableOptions.map((option) => (
                <option key={option.symbol} value={option.symbol}>
                  {option.label} ({option.symbol})
                </option>
              ))
            ) : (
              <option value="">No symbols configured by admin</option>
            )}
          </select>
          <Button
            type="submit"
            className="sm:w-auto"
            disabled={!effectiveSelectedSymbol || effectiveCustomSymbols.length >= MAX_CUSTOM_SYMBOLS}
          >
            Add symbol
          </Button>
        </form>

        {!!effectiveCustomSymbols.length && (
          <div className="flex flex-wrap gap-2">
            {effectiveCustomSymbols.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => onRemoveSymbol(symbol)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="Remove symbol"
              >
                {labelBySymbol[symbol] ?? symbol} x
              </button>
            ))}
          </div>
        )}

        {formError && (
          <p className="text-sm text-destructive">
            {formError}
          </p>
        )}

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

        {loading && (
          <p className="text-xs text-muted-foreground">
            Refreshing quotes...
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          Cards source: Yahoo public quote feed via server API. Strip source: TradingView.
        </p>
      </CardContent>
    </Card>
  )
}

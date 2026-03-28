import { NextResponse } from "next/server"

export const revalidate = 0

const MAX_TOTAL_SYMBOLS = 24
const SYMBOL_PATTERN = /^[A-Za-z0-9^.\-=&]+$/

type YahooQuoteRow = {
  symbol?: string
  shortName?: string | null
  longName?: string | null
  regularMarketPrice?: number | null
  regularMarketChange?: number | null
  regularMarketChangePercent?: number | null
  regularMarketTime?: number | null
  marketState?: string | null
  currency?: string | null
}

function normalizeSymbol(value: string) {
  const normalized = value.trim().toUpperCase()
  if (!normalized) return null
  if (normalized.length > 20) return null
  if (!SYMBOL_PATTERN.test(normalized)) return null
  return normalized
}

function extractSymbols(raw: string | null) {
  const requested = (raw ?? "")
    .split(",")
    .map(normalizeSymbol)
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(requested)).slice(0, MAX_TOTAL_SYMBOLS)
}

async function fetchWithTimeout(url: string, timeoutMs = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "PositionWiseWeb/1.0",
      },
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbols = extractSymbols(searchParams.get("symbols"))

  if (!symbols.length) {
    return NextResponse.json({
      symbols: [],
      quotes: [],
    })
  }

  const encodedSymbols = encodeURIComponent(symbols.join(","))
  const quoteUrls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbols}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbols}`,
  ]

  try {
    for (const quoteUrl of quoteUrls) {
      const response = await fetchWithTimeout(quoteUrl)
      if (!response.ok) {
        continue
      }

      const payload = (await response.json()) as {
        quoteResponse?: {
          result?: YahooQuoteRow[]
        }
      }

      const quotes = (payload.quoteResponse?.result ?? [])
        .filter((row) => typeof row.symbol === "string" && row.symbol.trim().length > 0)
        .map((row) => ({
          symbol: row.symbol!.toUpperCase(),
          shortName: row.shortName ?? row.longName ?? null,
          regularMarketPrice:
            typeof row.regularMarketPrice === "number" ? row.regularMarketPrice : null,
          regularMarketChange:
            typeof row.regularMarketChange === "number" ? row.regularMarketChange : null,
          regularMarketChangePercent:
            typeof row.regularMarketChangePercent === "number"
              ? row.regularMarketChangePercent
              : null,
          regularMarketTime:
            typeof row.regularMarketTime === "number" ? row.regularMarketTime : null,
          marketState: row.marketState ?? null,
          currency: row.currency ?? null,
        }))

      if (quotes.length > 0) {
        return NextResponse.json({
          symbols,
          quotes,
        })
      }
    }

    return NextResponse.json({
      symbols,
      quotes: [],
      error: "Live quote provider request failed.",
    })
  } catch {
    return NextResponse.json(
      {
        symbols,
        quotes: [],
        error: "Unable to fetch live quotes right now.",
      }
    )
  }
}

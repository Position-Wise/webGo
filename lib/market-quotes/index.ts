const MAX_TOTAL_SYMBOLS = 24
const SYMBOL_PATTERN = /^[A-Za-z0-9^.\-=&]+$/

const YAHOO_HEADERS: HeadersInit = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://finance.yahoo.com/",
  Origin: "https://finance.yahoo.com",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
}

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

type ChartMeta = {
  currency?: string | null
  symbol?: string | null
  shortName?: string | null
  longName?: string | null
  regularMarketPrice?: number | null
  chartPreviousClose?: number | null
  previousClose?: number | null
  regularMarketTime?: number | null
  marketState?: string | null
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
      headers: YAHOO_HEADERS,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

function mapV7Row(row: YahooQuoteRow) {
  return {
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
  }
}

function quoteFromChartMeta(symbol: string, meta: ChartMeta) {
  const sym = (meta.symbol ?? symbol).toUpperCase()
  const price =
    typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null
  const prevClose =
    typeof meta.chartPreviousClose === "number"
      ? meta.chartPreviousClose
      : typeof meta.previousClose === "number"
        ? meta.previousClose
        : null

  let regularMarketChange: number | null = null
  let regularMarketChangePercent: number | null = null
  if (typeof price === "number" && typeof prevClose === "number") {
    regularMarketChange = price - prevClose
    if (prevClose !== 0) {
      regularMarketChangePercent = (regularMarketChange / prevClose) * 100
    }
  }

  return {
    symbol: sym,
    shortName: meta.shortName ?? meta.longName ?? null,
    regularMarketPrice: price,
    regularMarketChange,
    regularMarketChangePercent,
    regularMarketTime:
      typeof meta.regularMarketTime === "number" ? meta.regularMarketTime : null,
    marketState: meta.marketState ?? null,
    currency: meta.currency ?? null,
  }
}

async function fetchQuotesViaV7Batch(encodedSymbols: string) {
  const quoteUrls = [
    `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbols}`,
    `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodedSymbols}`,
  ]

  for (const quoteUrl of quoteUrls) {
    const response = await fetchWithTimeout(quoteUrl)
    if (!response.ok) continue

    const payload = (await response.json()) as {
      quoteResponse?: {
        result?: YahooQuoteRow[]
      }
    }

    const quotes = (payload.quoteResponse?.result ?? [])
      .filter((row) => typeof row.symbol === "string" && row.symbol.trim().length > 0)
      .map((row) => mapV7Row(row))

    if (quotes.length > 0) return quotes
  }

  return null
}

async function fetchQuoteViaV8Chart(symbol: string) {
  const encoded = encodeURIComponent(symbol)
  const chartUrls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=5m`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=5m`,
  ]

  for (const chartUrl of chartUrls) {
    const response = await fetchWithTimeout(chartUrl)
    if (!response.ok) continue

    const payload = (await response.json()) as {
      chart?: {
        result?: { meta?: ChartMeta }[]
        error?: { description?: string }
      }
    }

    if (payload.chart?.error) continue

    const meta = payload.chart?.result?.[0]?.meta
    if (!meta || typeof meta.regularMarketPrice !== "number") continue

    return quoteFromChartMeta(symbol, meta)
  }

  return null
}

// Deno.serve(async (request) => {
//   const url = new URL(request.url)
//   const symbols = extractSymbols(url.searchParams.get("symbols"))

//   if (!symbols.length) {
//     return Response.json({ symbols: [], quotes: [] })
//   }

//   const encodedSymbols = encodeURIComponent(symbols.join(","))

//   try {
//     const v7Quotes = await fetchQuotesViaV7Batch(encodedSymbols)
//     if (v7Quotes && v7Quotes.length >= symbols.length) {
//       return Response.json({ symbols, quotes: v7Quotes })
//     }

//     const chartResults = await Promise.all(symbols.map((symbol) => fetchQuoteViaV8Chart(symbol)))
//     const quotes = chartResults.filter((row): row is NonNullable<typeof row> => row !== null)

//     if (quotes.length > 0) {
//       return Response.json({ symbols, quotes })
//     }

//     return Response.json({
//       symbols,
//       quotes: [],
//       error: "Live quote provider request failed.",
//     })
//   } catch {
//     return Response.json({
//       symbols,
//       quotes: [],
//       error: "Unable to fetch live quotes right now.",
//     })
//   }
// })

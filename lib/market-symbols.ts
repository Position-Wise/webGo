export const MANDATORY_MARKET_SYMBOLS = ["^BSESN", "^NSEI"] as const

export type MarketSymbolOption = {
  symbol: string
  label: string
}

export const MANDATORY_MARKET_OPTIONS: MarketSymbolOption[] = [
  { symbol: "^BSESN", label: "SENSEX" },
  { symbol: "^NSEI", label: "NIFTY 50" },
]

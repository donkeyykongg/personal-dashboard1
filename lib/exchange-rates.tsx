// lib/exchange-rates.tsx
"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Base storage currency is CAD. The DB columns are named *_chf for historical
// reasons (template inherited from a CHF-based reference design) but everything
// stored in those columns is interpreted as CAD now.
export type Currency = "CAD" | "USD" | "EUR";

type Rates = Record<Currency, number>;

const DEFAULT_RATES: Rates = { CAD: 1, USD: 1, EUR: 1 };

type ContextValue = {
  rates: Rates;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  convert: (cadAmount: number) => number;
  format: (cadAmount: number) => string;
};

const ExchangeRatesContext = createContext<ContextValue | null>(null);

const CURRENCY_KEY = "nw_currency";

export function ExchangeRatesProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<Rates>(DEFAULT_RATES);
  const [currency, setCurrencyState] = useState<Currency>("CAD");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(CURRENCY_KEY) : null;
    if (saved === "CAD" || saved === "USD" || saved === "EUR") {
      setCurrencyState(saved);
    }
    let cancelled = false;
    fetch("https://open.er-api.com/v6/latest/CAD")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.rates) return;
        setRates({
          CAD: 1,
          USD: Number(data.rates.USD) || 1,
          EUR: Number(data.rates.EUR) || 1,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(CURRENCY_KEY, c);
  };

  const convert = (cadAmount: number) => (Number(cadAmount) || 0) * (rates[currency] || 1);
  const format = (cadAmount: number) => {
    const num = convert(cadAmount);
    const fractionDigits = Math.abs(num % 1) < 0.005 ? 0 : 2;
    return `${currency} ${num.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <ExchangeRatesContext.Provider value={{ rates, currency, setCurrency, convert, format }}>
      {children}
    </ExchangeRatesContext.Provider>
  );
}

export function useExchangeRates() {
  const ctx = useContext(ExchangeRatesContext);
  if (!ctx) throw new Error("useExchangeRates must be used within ExchangeRatesProvider");
  return ctx;
}

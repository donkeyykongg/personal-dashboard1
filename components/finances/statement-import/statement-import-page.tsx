"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Loader2 } from "lucide-react";
import { ParsedTransactionsTable } from "./parsed-transactions-table";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

export function StatementImportPage() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedTransaction[] | null>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    if (file.type === "application/pdf") {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      setPdfBase64(typeof window !== "undefined" ? window.btoa(binary) : "");
    } else {
      const txt = await file.text();
      setText(txt);
      setPdfBase64(null);
    }
  }

  async function handleParse() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/parse-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pdfBase64 ? undefined : text, pdfBase64: pdfBase64 ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      setParsed(data.transactions as ParsedTransaction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href="/finances?tab=cash-flow"
        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-[#B8B6B0] hover:bg-white/[0.08]"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Cash Flow
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight text-white">Import statement</h1>
      <p className="text-sm text-[#76746E]">
        Paste statement text or upload a PDF. Claude parses transactions and you review before
        importing.
      </p>

      {!parsed ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#76746E]">
              Paste text
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste your statement text here…"
              className="w-full rounded-md bg-black/30 p-3 text-sm text-white outline-none placeholder:text-[#76746E]"
            />
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-4">
            <div className="mb-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#76746E]">
              Or upload PDF / text file
            </div>
            <input
              type="file"
              accept=".pdf,.txt,.csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block text-sm text-white"
            />
            {fileName && (
              <div className="mt-2 text-xs text-[#76746E]">Loaded: {fileName}</div>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-[#FF8A8A]/30 bg-[#FF8A8A]/10 px-3 py-2 text-sm text-[#FF8A8A]">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleParse}
            disabled={pending || (!text && !pdfBase64)}
            className="inline-flex items-center gap-2 rounded-md bg-white/[0.08] px-4 py-2 text-sm font-bold uppercase tracking-[0.10em] text-white hover:bg-white/[0.12] disabled:opacity-50"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Parse with Claude
          </button>
        </div>
      ) : (
        <ParsedTransactionsTable
          transactions={parsed}
          onReset={() => {
            setParsed(null);
            setError(null);
          }}
        />
      )}
    </div>
  );
}

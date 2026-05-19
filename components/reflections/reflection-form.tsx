"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

export function ReflectionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState("");
  const [score, setScore] = useState(7);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!content.trim()) {
      setError("Write a quick note about your day.");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: dbError } = await supabase.from("reflections").upsert(
        { date, score, content: content.trim() },
        { onConflict: "date" }
      );
      if (dbError) {
        setError(dbError.message);
        return;
      }
      setContent("");
      setScore(7);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New reflection</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="reflection-date">Date</Label>
            <Input
              id="reflection-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reflection-content">What's on your mind</Label>
            <Textarea
              id="reflection-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="What worked today, what didn't, what's one thing to improve tomorrow…"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="reflection-score">Day score</Label>
              <span className="text-sm font-medium">{score}/10</span>
            </div>
            <input
              id="reflection-score"
              type="range"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Save reflection"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

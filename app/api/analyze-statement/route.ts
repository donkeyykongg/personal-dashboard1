import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 500 },
    );
  }

  let file: File;
  try {
    const form = await request.formData();
    const raw = form.get("file");
    if (!(raw instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    file = raw;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const isImage =
    file.type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif)$/i.test(file.name);

  if (!isImage) {
    return NextResponse.json(
      { error: "Only image files are handled by this endpoint" },
      { status: 400 },
    );
  }

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const mediaType = (file.type || "image/jpeg") as
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp";

  const prompt = `This is a bank statement screenshot or photo. Extract every transaction you can see and return them as a plain text table with one transaction per line in this exact format:
DATE | DESCRIPTION | AMOUNT

Rules:
- DATE: use the transaction date (not posting date), formatted as MMM DD (e.g. "Mar 31")
- DESCRIPTION: the merchant or activity name, cleaned up — no reference numbers or long ID strings
- AMOUNT: positive number with two decimal places (no $ sign, no commas). All charges are positive.
- Skip any lines that are totals, subtotals, payment due, minimum payment, or account balance rows
- Skip any line that is a credit/payment back to the account
- If a line is genuinely ambiguous, skip it
- Output ONLY the table rows, no header row, no explanation, no markdown

Example output:
Mar 17 | Claude.ai Anthropic | 15.82
Mar 19 | Coinamatic | 20.25
Mar 22 | Metrolinx GO Transit | 10.00`;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Claude API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

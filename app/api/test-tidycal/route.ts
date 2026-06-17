import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TIDYCAL_API_KEY;

  const rawValue = process.env.TIDYCAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "TIDYCAL_API_KEY está vacía o ausente",
        value_length: rawValue?.length ?? 0,
        value_trimmed_length: rawValue?.trim().length ?? 0,
        existe_en_env: "TIDYCAL_API_KEY" in process.env,
      },
      { status: 500 }
    );
  }

  const res = await fetch("https://tidycal.com/api/bookings", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `TidyCal respondió ${res.status}`, body: text },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}

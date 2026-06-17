import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.TIDYCAL_API_KEY;

  if (!apiKey) {
    const envKeys = Object.keys(process.env).filter((k) => k.includes("TIDY") || k.includes("TIDYCAL"));
    return NextResponse.json(
      { error: "TIDYCAL_API_KEY no encontrada", vars_con_TIDY: envKeys, todas_las_vars: Object.keys(process.env).sort() },
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

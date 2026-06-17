import { NextResponse } from "next/server";

function normalizeAnswer(answer: string | string[]): string {
  if (Array.isArray(answer)) return answer.join(", ");
  return answer ?? "";
}

export async function GET() {
  const apiKey = process.env.TIDYCAL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "TIDYCAL_API_KEY no está configurada" },
      { status: 500 }
    );
  }

  const res = await fetch("https://tidycal.com/api/bookings?page=1", {
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
  const rawBookings: Record<string, unknown>[] = data.data ?? [];

  const bookings = rawBookings
    .filter((b) => b.cancelled_at === null)
    .map((b) => {
      const rawQuestions = (b.questions as { question: string; answer: string | string[] }[]) ?? [];

      const questions = rawQuestions.map((q) => ({
        question: q.question,
        answer: normalizeAnswer(q.answer),
      }));

      const webQuestion = questions.find(
        (q) => q.question === "¿Cuál es tu web?"
      );
      const web_url = webQuestion?.answer ?? "";

      const contact = b.contact as { name?: string; email?: string } | undefined;
      const bookingType = b.booking_type as { title?: string } | undefined;

      return {
        id: b.id,
        starts_at: b.starts_at,
        booking_type_title: bookingType?.title ?? "",
        contact_name: contact?.name ?? "",
        contact_email: contact?.email ?? "",
        web_url,
        questions,
      };
    })
    .sort((a, b) =>
      new Date(b.starts_at as string).getTime() - new Date(a.starts_at as string).getTime()
    );

  return NextResponse.json({ bookings });
}

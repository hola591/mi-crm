import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Question {
  question: string;
  answer: string;
}

interface Booking {
  id: number | string;
  contact_name: string;
  contact_email: string;
  web_url: string;
  booking_type_title: string;
  starts_at: string;
  questions: Question[];
}

export async function POST(req: NextRequest) {
  const { booking }: { booking: Booking } = await req.json();

  if (!booking) {
    return NextResponse.json({ error: "booking requerido" }, { status: 400 });
  }

  const questionsText = booking.questions
    .filter((q) => q.answer)
    .map((q) => `- ${q.question}: ${q.answer}`)
    .join("\n");

  const prompt = `Analiza este prospecto que ha reservado una reunión y genera un informe de preparación.

Nombre: ${booking.contact_name}
Email: ${booking.contact_email}
Tipo de reunión: ${booking.booking_type_title}
Fecha: ${booking.starts_at}
Web: ${booking.web_url || "No proporcionada"}

Respuestas del formulario:
${questionsText || "Sin respuestas"}

${booking.web_url ? `Si puedes, busca información sobre la empresa en ${booking.web_url} para enriquecer el análisis.` : ""}

Devuelve ÚNICAMENTE este JSON sin ningún texto extra:
{
  "scoring": "warm" | "mild" | "cold",
  "razon_scoring": "explicación breve del scoring",
  "resumen_empresa": "qué hace esta empresa o persona, sector, tamaño aproximado",
  "perfil_lead": "análisis del perfil del lead: motivación, madurez, urgencia",
  "objeciones": [
    { "objecion": "objeción probable", "como_responder": "cómo responderla" }
  ],
  "que_proponer": "qué servicios o enfoque proponer en la reunión",
  "preguntas_clave": ["pregunta 1", "pregunta 2", "pregunta 3"]
}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system:
      "Eres un asistente especializado en análisis de leads B2B para ZasZas, la consultoría de marketing de Mila Coco. Tu trabajo es analizar la información de un prospecto que ha reservado una reunión y generar un informe de preparación. Responde SIEMPRE en JSON válido, sin texto adicional ni backticks.",
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: prompt }],
  });

  const textBlocks = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const cleaned = textBlocks
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const informe = JSON.parse(cleaned);
    return NextResponse.json(informe);
  } catch {
    return NextResponse.json(
      { error: "No se pudo parsear la respuesta de Claude", raw: cleaned },
      { status: 500 }
    );
  }
}

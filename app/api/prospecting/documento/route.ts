import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const maxDuration = 300;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DOC_SYSTEM = `Eres un GTM Engineer experto. A partir de la conversación de diagnóstico, genera un documento de campaña estructurado en JSON estricto. No incluyas nada fuera del JSON.

El JSON debe tener exactamente esta estructura:
{
  "empresa": "nombre o descripción de la empresa",
  "propuestaValor": "propuesta de valor en 1-2 frases",
  "problemaResuelve": "dolor principal que resuelve",
  "icp": {
    "industrias": ["lista de industrias/verticales"],
    "tamanoEmpresa": "rango de empleados o facturación",
    "geografias": ["países o regiones objetivo"],
    "tecnologias": ["stack tecnológico relevante"],
    "triggerEvents": ["eventos que indican momento de compra"]
  },
  "personas": {
    "champion": {
      "cargos": ["lista de cargos típicos"],
      "doloresPrincipales": ["dolor 1", "dolor 2", "dolor 3"],
      "motivaciones": ["qué busca lograr"],
      "mensajeRelevante": "qué le resuena"
    },
    "economicBuyer": {
      "cargos": ["lista de cargos típicos"],
      "doloresPrincipales": ["dolor 1", "dolor 2"],
      "motivaciones": ["qué busca lograr"],
      "mensajeRelevante": "qué le resuena"
    }
  },
  "objeciones": [
    { "objecion": "texto de la objeción", "respuesta": "cómo responderla" }
  ],
  "diferenciadores": ["diferenciador 1", "diferenciador 2"],
  "contexto": "tendencias o contexto de mercado relevante para la campaña"
}`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const synthesisPrompt = `Basándote en toda la conversación anterior, genera el documento de campaña JSON completo. Rellena con inferencias razonables cualquier campo que no se haya mencionado explícitamente, marcándolo con "(inferido)" al final del valor. Devuelve SOLO el JSON, sin markdown, sin explicaciones.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: DOC_SYSTEM,
    messages: [
      ...messages,
      { role: "user", content: synthesisPrompt },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  // Strip markdown code fences if Claude adds them
  const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const doc = JSON.parse(cleaned);
    return new Response(JSON.stringify({ documento: doc }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "parse_failed", raw: cleaned }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `Eres un experto en outbound B2B y copywriting para LinkedIn.
Recibes un documento de campaña y generas secuencias de mensajes de prospección para LinkedIn.

REGLAS ESTRICTAS DE ESCRITURA:
- Máximo 5-6 líneas por mensaje
- Tono directo, conversacional, sin corporativismo
- NUNCA empieces con "Espero que estés bien", "Hola, me llamo..." ni frases de relleno
- Mensaje 1: NO vendas nada. Abre con una observación específica + pregunta
- Mensaje 2: Añade contexto, prueba social o dato concreto
- Mensaje 3: CTA directo de baja fricción (proponer llamada breve, no demo)
- Escribe en primera persona
- Los CTAs son preguntas, no afirmaciones

Devuelve ÚNICAMENTE un JSON con esta estructura exacta (sin markdown, sin texto extra):
{
  "secuencias": [
    {
      "estrategia": "nombre del trigger event",
      "champion": ["texto mensaje 1", "texto mensaje 2", "texto mensaje 3"],
      "economicBuyer": ["texto mensaje 1", "texto mensaje 2", "texto mensaje 3"]
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const { documento } = await req.json();

  if (!documento) {
    return new Response(JSON.stringify({ error: "documento is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Limit trigger events to 3 to keep output manageable
  const docParaPrompt = {
    ...documento,
    icp: {
      ...documento.icp,
      triggerEvents: (documento.icp?.triggerEvents ?? []).slice(0, 3),
    },
  };

  const prompt = `Genera las secuencias de mensajes LinkedIn.
Por cada trigger event (máximo 3), crea 3 mensajes para el Champion (${documento.personas?.champion?.cargos?.join(", ") ?? "Champion"}) y 3 mensajes para el Economic Buyer (${documento.personas?.economicBuyer?.cargos?.join(", ") ?? "Economic Buyer"}).

Cada mensaje es solo el texto listo para enviar por LinkedIn. Sin etiquetas, sin estructura visible.

DOCUMENTO:
${JSON.stringify(docParaPrompt, null, 2)}

Devuelve solo el JSON empezando con {`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON by finding the outermost { ... } block
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const extracted = start !== -1 && end > start ? raw.slice(start, end + 1) : raw.trim();

  // Check for truncation
  if (response.stop_reason === "max_tokens") {
    console.error("[generate-copy] Response truncated at max_tokens. Raw length:", raw.length);
    return new Response(
      JSON.stringify({ error: "response_truncated", detail: "La respuesta fue cortada. Intenta con menos trigger events." }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const data = JSON.parse(extracted);
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[generate-copy] parse_failed. stop_reason:", response.stop_reason, "raw length:", raw.length, "extracted:", extracted.slice(0, 300));
    return new Response(
      JSON.stringify({ error: "parse_failed", detail: String(e), stop_reason: response.stop_reason }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );
  }
}

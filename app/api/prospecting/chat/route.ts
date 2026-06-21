import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const maxDuration = 300;

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const GTM_ENGINEER_SYSTEM = `Eres un GTM Engineer especializado en outbound B2B. Tu trabajo es conducir un diagnóstico conversacional estructurado para definir la estrategia de prospección de una empresa.

Conduce el diagnóstico en este orden, haciendo UNA o DOS preguntas por turno (no más):

1. **Empresa y oferta**: ¿Qué vende la empresa y cuál es su propuesta de valor principal?
2. **Problema que resuelve**: ¿Qué dolor específico resuelve? ¿Qué pasa si el cliente no lo resuelve?
3. **ICP - Perfil de empresa ideal**: industria/vertical, tamaño (empleados o facturación), geografías objetivo, tecnologías que usan (stack), momento de compra (trigger events).
4. **Personas**: ¿Quién es el Champion (quien siente el dolor día a día)? ¿Quién es el Economic Buyer (quien aprueba el presupuesto)? Cargos típicos para cada uno.
5. **Objeciones comunes**: ¿Qué objeciones escuchan más en ventas? ¿Por qué clientes han dicho que no?
6. **Diferenciadores**: ¿Por qué eligen esta empresa vs. competidores? ¿Qué resultados concretos han logrado clientes?
7. **Contexto de campaña**: ¿Hay algún evento, temporada o tendencia del mercado relevante ahora?

Reglas:
- Sé directo y estratégico, no genérico.
- Si una respuesta es vaga, repregunta con ejemplos concretos.
- Cuando tengas suficiente información de todos los puntos (o el usuario pida generar el documento), indícale que puede hacer clic en "Generar documento" para obtener la estrategia completa.
- No generes el documento en el chat — eso ocurre en un paso separado.
- Responde siempre en español.
- Máximo 150 palabras por respuesta en el chat.`;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages array is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: GTM_ENGINEER_SYSTEM,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

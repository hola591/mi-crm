"use client";

import { useState } from "react";
import { generateText } from "@/app/lib/claude";

type LeadTemp = "caliente" | "tibio" | "frío" | null;

interface Informe {
  valoracion: LeadTemp;
  explicacionValoracion: string;
  resumenPersona: string;
  resumenEmpresa: string;
  objeciones: { objecion: string; respuesta: string }[];
  propuesta: string;
}

function parsearInforme(texto: string): Informe {
  const get = (tag: string) => {
    // Intenta con tag de cierre; si falta, toma todo lo que sigue al tag de apertura
    const withClose = texto.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
    if (withClose) return withClose[1].trim();
    const withoutClose = texto.match(new RegExp(`<${tag}>([\\s\\S]*)`));
    return withoutClose ? withoutClose[1].trim() : "";
  };

  const valoracionRaw = get("valoracion").toLowerCase();
  const valoracion: LeadTemp = valoracionRaw.includes("caliente")
    ? "caliente"
    : valoracionRaw.includes("frío") || valoracionRaw.includes("frio")
    ? "frío"
    : "tibio";

  const objecionesRaw = get("objeciones");
  const objeciones: { objecion: string; respuesta: string }[] = [];
  const bloques = objecionesRaw.split(/<item>/).slice(1);
  for (const bloque of bloques) {
    const obj = bloque.match(/<o>([\s\S]*?)<\/o>/)?.[1]?.trim() ?? "";
    const resp = bloque.match(/<r>([\s\S]*?)<\/r>/)?.[1]?.trim() ?? "";
    if (obj) objeciones.push({ objecion: obj, respuesta: resp });
  }

  return {
    valoracion,
    explicacionValoracion: get("explicacion"),
    resumenPersona: get("persona"),
    resumenEmpresa: get("empresa"),
    objeciones,
    propuesta: get("propuesta"),
  };
}

const TEMP_COLORS: Record<NonNullable<LeadTemp>, string> = {
  caliente: "bg-red-100 text-red-700 border-red-200",
  tibio: "bg-amber-100 text-amber-700 border-amber-200",
  frío: "bg-blue-100 text-blue-700 border-blue-200",
};

const TEMP_EMOJI: Record<NonNullable<LeadTemp>, string> = {
  caliente: "🔥",
  tibio: "🌤",
  frío: "❄️",
};

export default function PreparadorReuniones() {
  const [persona, setPersona] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [historial, setHistorial] = useState("");
  const [cargando, setCargando] = useState(false);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [error, setError] = useState("");

  async function generarInforme() {
    if (!persona.trim() && !empresa.trim() && !historial.trim()) {
      setError("Añade información en al menos uno de los campos.");
      return;
    }
    setError("");
    setCargando(true);
    setInforme(null);

    const prompt = `Analiza la siguiente información sobre un prospecto comercial y genera un informe estructurado.

INFORMACIÓN SOBRE LA PERSONA:
${persona || "(No proporcionada)"}

INFORMACIÓN SOBRE LA EMPRESA:
${empresa || "(No proporcionada)"}

HISTORIAL DE CONVERSACIONES:
${historial || "(No proporcionado)"}

Devuelve el informe EXACTAMENTE en este formato XML (sin texto fuera de las etiquetas):

<valoracion>caliente | tibio | frío</valoracion>
<explicacion>2-3 frases explicando por qué tiene esa temperatura como lead.</explicacion>
<persona>Resumen de quién es la persona: rol, experiencia relevante, perfil profesional, motivaciones aparentes.</persona>
<empresa>Resumen de la empresa: sector, tamaño aproximado, posicionamiento, situación actual.</empresa>
<objeciones>
<item><o>Primera objeción probable</o><r>Cómo responder a esta objeción</r></item>
<item><o>Segunda objeción probable</o><r>Cómo responder a esta objeción</r></item>
<item><o>Tercera objeción probable</o><r>Cómo responder a esta objeción</r></item>
</objeciones>
<propuesta>Qué proponer en la reunión: ángulo de entrada, qué ofrecer primero, cómo presentarlo para que encaje con su situación específica.</propuesta>`;

    const system = `Eres una consultora experta en ventas B2B con especial foco en servicios de marketing y contenido. Analizas prospectos con precisión y das consejos directos, accionables y realistas. Nunca inventas información — si falta contexto, lo indicas brevemente. Respondes siempre en español.`;

    try {
      const resultado = await generateText(prompt, system);
      const parsed = parsearInforme(resultado);
      setInforme(parsed);
    } catch {
      setError("Error al conectar con Claude. Revisa tu API key e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Formulario */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Información sobre la persona
          </label>
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Pega aquí su perfil de LinkedIn, lo que sabes de ella, su cargo, trayectoria..."
            rows={5}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Información sobre la empresa
          </label>
          <textarea
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="Pega aquí la descripción de la empresa, su web, sector, tamaño, productos o servicios..."
            rows={5}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Historial de conversaciones
          </label>
          <textarea
            value={historial}
            onChange={(e) => setHistorial(e.target.value)}
            placeholder="Pega aquí el hilo de emails, mensajes de LinkedIn, notas de llamadas anteriores..."
            rows={5}
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-y"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={generarInforme}
          disabled={cargando}
          className="w-full py-3 px-6 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {cargando ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analizando...
            </>
          ) : (
            "Generar informe"
          )}
        </button>
      </div>

      {/* Informe generado */}
      {informe && (
        <div className="space-y-5 pt-2">
          {/* Valoración */}
          <div className={`rounded-xl border p-5 ${TEMP_COLORS[informe.valoracion!]}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{TEMP_EMOJI[informe.valoracion!]}</span>
              <span className="text-base font-bold capitalize">Lead {informe.valoracion}</span>
            </div>
            <p className="text-sm leading-relaxed">{informe.explicacionValoracion}</p>
          </div>

          {/* Resumen persona + empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                La persona
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {informe.resumenPersona}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                La empresa
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                {informe.resumenEmpresa}
              </p>
            </div>
          </div>

          {/* Objeciones */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Objeciones probables y cómo responderlas
            </h3>
            <div className="space-y-4">
              {informe.objeciones.map((item, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-4">
                  <p className="text-sm font-medium text-gray-800 mb-1">"{item.objecion}"</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.respuesta}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Propuesta */}
          <div className="bg-gray-900 rounded-xl p-5 text-white">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Qué proponerle
            </h3>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-100">
              {informe.propuesta}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

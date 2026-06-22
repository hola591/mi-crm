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

const TEMP_CONFIG: Record<NonNullable<LeadTemp>, {
  emoji: string; label: string; bg: string; text: string; border: string;
}> = {
  caliente: { emoji: "🔥", label: "Lead caliente", bg: "#FFF0F0", text: "#C53030", border: "#111111" },
  tibio:    { emoji: "🌤", label: "Lead tibio",    bg: "#FFFBEB", text: "#92400E", border: "#111111" },
  frío:     { emoji: "❄️", label: "Lead frío",     bg: "#EFF6FF", text: "#1E40AF", border: "#111111" },
};

function InputBlock({
  icon, label, hint, value, onChange, rows = 4, placeholder,
}: {
  icon: React.ReactNode; label: string; hint?: string;
  value: string; onChange: (v: string) => void; rows?: number; placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-150"
      style={{
        border: focused ? "2px solid #2563FF" : "2px solid #111111",
        background: "#FFFFFF",
        boxShadow: focused ? "3px 3px 0 #2563FF" : "3px 3px 0 #111111",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3"
        style={{ borderBottom: "2px solid #111111", background: "#F8F7F4" }}
      >
        <span style={{ color: "#555555" }}>{icon}</span>
        <span className="text-sm font-bold" style={{ color: "#111111" }}>{label}</span>
        {hint && (
          <span className="text-[11px] ml-auto" style={{ color: "#AAAAAA" }}>{hint}</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-5 py-4 text-sm resize-none focus:outline-none bg-white leading-relaxed"
        style={{ color: "#333333" }}
      />
    </div>
  );
}

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
      setInforme(parsearInforme(resultado));
    } catch {
      setError("Error al conectar con Claude. Revisa tu API key e inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  const tempConf = informe?.valoracion ? TEMP_CONFIG[informe.valoracion] : null;

  return (
    <div className="max-w-2xl mx-auto space-y-4 relative">

      {/* Doodle — curved arrow, hand-drawn style */}
      <div className="absolute -right-20 top-4 pointer-events-none opacity-25 hidden xl:block">
        <svg width="90" height="90" viewBox="0 0 90 90" fill="none">
          <path
            d="M12 78 C14 50, 44 18, 76 12"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="5 4"
          />
          <path
            d="M70 6 L78 15 L66 17"
            stroke="#111111"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Input blocks */}
      <InputBlock
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 14a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7z" />
          </svg>
        }
        label="Información sobre la persona"
        hint="LinkedIn · cargo · trayectoria"
        value={persona}
        onChange={setPersona}
        rows={4}
        placeholder="Pega aquí su perfil de LinkedIn, lo que sabes de ella, su cargo, trayectoria..."
      />

      <InputBlock
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" />
          </svg>
        }
        label="Información sobre la empresa"
        hint="web · sector · tamaño"
        value={empresa}
        onChange={setEmpresa}
        rows={4}
        placeholder="Pega aquí la descripción de la empresa, su web, sector, tamaño, productos o servicios..."
      />

      <InputBlock
        icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        }
        label="Historial de conversaciones"
        hint="emails · LinkedIn · llamadas"
        value={historial}
        onChange={setHistorial}
        rows={4}
        placeholder="Pega aquí el hilo de emails, mensajes de LinkedIn, notas de llamadas anteriores..."
      />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: "#FFF5F5", border: "2px solid #EF4444", color: "#C53030" }}
        >
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generarInforme}
        disabled={cargando}
        className="w-full py-3.5 flex items-center justify-center gap-2.5 rounded-2xl text-sm font-black text-white transition-all duration-150 disabled:opacity-50"
        style={{
          background: "#2563FF",
          border: "2px solid #111111",
          boxShadow: cargando ? "none" : "3px 3px 0 #111111",
        }}
      >
        {cargando ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Analizando prospecto...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generar informe
          </>
        )}
      </button>

      {/* ── Informe ── */}
      {informe && tempConf && (
        <div className="space-y-3 animate-fade-in-up pt-2">

          {/* Temperature */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: `2px solid ${tempConf.border}`, boxShadow: "3px 3px 0 #111111" }}
          >
            <div className="px-5 py-4 flex items-center gap-3.5" style={{ background: tempConf.bg }}>
              <span className="text-2xl">{tempConf.emoji}</span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: tempConf.text }}>
                  Temperatura del lead
                </p>
                <p className="text-base font-black" style={{ color: tempConf.text }}>{tempConf.label}</p>
              </div>
            </div>
            <div className="px-5 py-4 bg-white" style={{ borderTop: "2px solid #111111" }}>
              <p className="text-sm leading-relaxed" style={{ color: "#555555" }}>
                {informe.explicacionValoracion}
              </p>
            </div>
          </div>

          {/* Persona + Empresa */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "La persona", content: informe.resumenPersona, accent: "#2563FF" },
              { label: "La empresa", content: informe.resumenEmpresa, accent: "#111111" },
            ].map(({ label, content, accent }) => (
              <div
                key={label}
                className="rounded-2xl p-5"
                style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-3"
                  style={{ color: accent }}
                >
                  {label}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#444444" }}>
                  {content}
                </p>
              </div>
            ))}
          </div>

          {/* Objeciones */}
          <div
            className="rounded-2xl p-5"
            style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
          >
            <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "#F59E0B" }}>
              Objeciones probables
            </p>
            <div className="space-y-2.5">
              {informe.objeciones.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl p-4"
                  style={{ background: "#F8F7F4", border: "1.5px solid #E0DED8" }}
                >
                  <p className="text-sm font-bold mb-1" style={{ color: "#111111" }}>
                    &ldquo;{item.objecion}&rdquo;
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: "#666666" }}>
                    → {item.respuesta}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Propuesta */}
          <div
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: "#111111", border: "2px solid #111111", boxShadow: "3px 3px 0 #FFD400" }}
          >
            {/* Yellow blob inside dark card */}
            <div
              className="blob-yellow absolute -top-10 -right-10 w-48 h-48 pointer-events-none opacity-20"
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4" fill="none" stroke="#2563FF" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#555555" }}>
                  Qué proponerle
                </p>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#E8E8E8" }}>
                {informe.propuesta}
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";
interface Message { role: Role; content: string; }

interface ICP {
  industrias: string[];
  tamanoEmpresa: string;
  geografias: string[];
  tecnologias: string[];
  triggerEvents: string[];
}

interface Persona {
  cargos: string[];
  doloresPrincipales: string[];
  motivaciones: string[];
  mensajeRelevante: string;
}

interface Objecion { objecion: string; respuesta: string; }

interface Documento {
  empresa: string;
  propuestaValor: string;
  problemaResuelve: string;
  icp: ICP;
  personas: { champion: Persona; economicBuyer: Persona };
  objeciones: Objecion[];
  diferenciadores: string[];
  contexto: string;
}

interface SecuenciaEstrategia {
  estrategia: string;
  champion: string[];
  economicBuyer: string[];
}

interface ApolloFilters {
  person_titles: string[];
  q_organization_keyword_tags: string[];
  person_locations: string[];
  organization_num_employees_ranges: string[];
  q_organization_job_titles?: string[];
}

interface ApolloLead {
  id: string;
  name: string;
  title: string;
  company: string;
  linkedin_url: string;
  email: string;
  email_status: string;
}

type SignalType = "job_openings" | "unavailable";
type HintTipo = "signal" | "technology" | "funding" | "job_posting" | "filter";

interface FilterHint {
  tipo: HintTipo;
  label: string;
  valores?: string[];
  donde?: string;
}

interface Segmento {
  id: string;
  titulo: string;
  personaLabel: string;
  persona: "champion" | "economicBuyer";
  estrategia: string;
  signalType: SignalType;
  filters: ApolloFilters;
  hints: FilterHint[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MENSAJE_BIENVENIDA: Message = {
  role: "assistant",
  content:
    "Hola! Soy tu GTM Engineer. Voy a hacerte algunas preguntas para entender tu negocio y diseñar una estrategia de prospección efectiva.\n\n¿Con qué empresa trabajamos y qué vende o qué servicio ofrece?",
};

const EMPLOYEE_RANGES = [
  { label: "1–10", value: "1,10" },
  { label: "11–50", value: "11,50" },
  { label: "51–200", value: "51,200" },
  { label: "201–500", value: "201,500" },
  { label: "501–1.000", value: "501,1000" },
  { label: "1.001–5.000", value: "1001,5000" },
  { label: "5.001+", value: "5001," },
];

const JOB_OPENING_KEYWORDS = [
  "empleo", "oferta", "hiring", "job open", "contrat", "vacan",
  "reclut", "trabajo activ", "búsqueda de empleo", "activa búsqueda",
];

// ── Main component ────────────────────────────────────────────────────────────

export default function Prospeccion() {
  const [messages, setMessages] = useState<Message[]>([MENSAJE_BIENVENIDA]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [documento, setDocumento] = useState<Documento | null>(null);
  const [secuencias, setSecuencias] = useState<SecuenciaEstrategia[] | null>(null);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [segmentos, setSegmentos] = useState<Segmento[] | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const apolloRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || isStreaming || isGeneratingDoc) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsStreaming(true);
    setErrorMsg(null);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/prospecting/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      if (!res.ok) throw new Error("Error en la respuesta del servidor");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated };
          return copy;
        });
      }
    } catch {
      setErrorMsg("Error al conectar con el asistente. Intenta de nuevo.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  async function generarDocumento() {
    if (isGeneratingDoc || isStreaming || messages.length < 5) return;
    setIsGeneratingDoc(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/prospecting/documento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error generando el documento");
      setDocumento(data.documento);
      setSecuencias(null);
      setSegmentos(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsGeneratingDoc(false);
    }
  }

  async function generarCopy() {
    if (!documento || isGeneratingCopy) return;
    setIsGeneratingCopy(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/prospecting/generate-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documento }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Error generando los mensajes");
      setSecuencias(data.secuencias);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsGeneratingCopy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function abrirApollo() {
    if (!documento) return;
    if (!segmentos) {
      const segs = secuencias
        ? generarSegmentosFromDoc(documento, secuencias)
        : generarSegmentosFallback(documento);
      setSegmentos(segs);
    }
    setTimeout(() => apolloRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function resetChat() {
    setMessages([MENSAJE_BIENVENIDA]);
    setDocumento(null);
    setSecuencias(null);
    setInput("");
    setErrorMsg(null);
    setSegmentos(null);
  }

  // ── Document view ──────────────────────────────────────────────────────────

  if (documento) {
    return (
      <div className="h-full overflow-y-auto">
        <DocumentoView
          doc={documento}
          secuencias={secuencias}
          segmentos={segmentos}
          isGeneratingCopy={isGeneratingCopy}
          onGenerarCopy={generarCopy}
          onReset={resetChat}
          errorMsg={errorMsg}
          onAbrirApollo={abrirApollo}
          apolloRef={apolloRef}
        />
      </div>
    );
  }

  // ── Chat view ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 px-1 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0 mt-0.5 mr-2.5"
                style={{ background: "#2563FF", border: "2px solid #111111" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user" ? "rounded-br-sm" : "rounded-bl-sm"
              }`}
              style={
                msg.role === "user"
                  ? { background: "#2563FF", color: "#FFFFFF", border: "2px solid #111111" }
                  : { background: "#FFFFFF", border: "2px solid #111111", color: "#222222", boxShadow: "2px 2px 0 #111111" }
              }
            >
              {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span
                  className="inline-block w-1.5 h-4 ml-0.5 rounded-sm align-middle animate-blink"
                  style={{ background: "#2563FF" }}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {errorMsg && (
        <p className="text-xs text-center mb-2 px-4" style={{ color: "#EF4444" }}>
          {errorMsg}
        </p>
      )}

      {/* Input area */}
      <div
        className="rounded-2xl mb-4 overflow-hidden"
        style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
      >
        <div className="flex gap-2 items-end px-4 py-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu respuesta… (Enter para enviar)"
            rows={2}
            disabled={isStreaming || isGeneratingDoc}
            className="flex-1 resize-none text-sm focus:outline-none bg-transparent disabled:opacity-50"
            style={{ color: "#222222" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isGeneratingDoc}
            className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40"
            style={{ background: "#2563FF", border: "2px solid #111111" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>

        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: "2px solid #111111", background: "#F8F7F4" }}
        >
          <p className="text-xs font-medium" style={{ color: "#AAAAAA" }}>
            {messages.length < 5
              ? "Responde al menos 2-3 preguntas antes de generar el documento"
              : "Cuando hayas terminado el diagnóstico, genera el documento"}
          </p>
          <button
            onClick={generarDocumento}
            disabled={isGeneratingDoc || isStreaming || messages.length < 5}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-white transition-all disabled:opacity-40"
            style={{ background: "#2563FF", border: "1.5px solid #111111" }}
          >
            {isGeneratingDoc ? (
              <><Spinner className="w-3 h-3" />Generando…</>
            ) : (
              <><IconDoc className="w-3 h-3" />Generar documento</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DocumentoView ─────────────────────────────────────────────────────────────

function DocumentoView({
  doc,
  secuencias,
  segmentos,
  isGeneratingCopy,
  onGenerarCopy,
  onReset,
  errorMsg,
  onAbrirApollo,
  apolloRef,
}: {
  doc: Documento;
  secuencias: SecuenciaEstrategia[] | null;
  segmentos: Segmento[] | null;
  isGeneratingCopy: boolean;
  onGenerarCopy: () => void;
  onReset: () => void;
  errorMsg: string | null;
  onAbrirApollo: () => void;
  apolloRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black" style={{ color: "#111111" }}>{doc.empresa}</h2>
          <p className="text-sm mt-1" style={{ color: "#777777" }}>{doc.propuestaValor}</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 ml-4 flex-wrap justify-end">
          <button
            onClick={onAbrirApollo}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black text-white transition-all"
            style={{ background: "#2563FF", border: "1.5px solid #111111", boxShadow: "2px 2px 0 #111111" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Buscar en Apollo
          </button>
          <button
            onClick={() => descargarPDF(doc)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ border: "1.5px solid #111111", color: "#111111", background: "#FFFFFF" }}
          >
            <IconDownload className="w-3.5 h-3.5" />
            PDF
          </button>
          <button onClick={onReset} className="text-xs font-bold hover:underline" style={{ color: "#AAAAAA" }}>
            Nuevo diagnóstico
          </button>
        </div>
      </div>

      {/* Problema */}
      <DocCard title="Problema que resuelve" accent="#EF4444">
        <p className="text-sm leading-relaxed" style={{ color: "#444444" }}>{doc.problemaResuelve}</p>
      </DocCard>

      {/* ICP */}
      <DocCard title="ICP — Perfil de cliente ideal" accent="#2563FF">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <DocField label="Industrias" value={doc.icp.industrias.join(", ")} />
          <DocField label="Tamaño empresa" value={doc.icp.tamanoEmpresa} />
          <DocField label="Geografías" value={doc.icp.geografias.join(", ")} />
          <DocField label="Tecnologías" value={doc.icp.tecnologias.join(", ")} />
          <div className="col-span-2">
            <DocField label="Trigger events" value={doc.icp.triggerEvents.join(" · ")} />
          </div>
        </div>
      </DocCard>

      {/* Personas */}
      <div className="grid grid-cols-2 gap-4">
        <PersonaCard title="Champion" persona={doc.personas.champion} color="#2563FF" colorBg="rgba(37,99,255,0.07)" />
        <PersonaCard title="Economic Buyer" persona={doc.personas.economicBuyer} color="#7C3AED" colorBg="rgba(124,58,237,0.07)" />
      </div>

      {/* Objeciones */}
      <DocCard title="Objeciones y respuestas" accent="#F59E0B">
        <div className="space-y-2.5">
          {doc.objeciones.map((o, i) => (
            <div
              key={i}
              className="rounded-xl p-3.5"
              style={{ background: "#F7F7F5", border: "1px solid #EDEDED" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "#222222" }}>&ldquo;{o.objecion}&rdquo;</p>
              <p className="text-sm" style={{ color: "#666666" }}>→ {o.respuesta}</p>
            </div>
          ))}
        </div>
      </DocCard>

      {/* Diferenciadores + Contexto */}
      <div className="grid grid-cols-2 gap-4">
        <DocCard title="Diferenciadores" accent="#22C55E">
          <ul className="space-y-1.5">
            {doc.diferenciadores.map((d, i) => (
              <li key={i} className="text-sm flex gap-2" style={{ color: "#444444" }}>
                <span style={{ color: "#22C55E", fontWeight: 600 }}>·</span>{d}
              </li>
            ))}
          </ul>
        </DocCard>
        <DocCard title="Contexto de campaña" accent="#8B5CF6">
          <p className="text-sm leading-relaxed" style={{ color: "#444444" }}>{doc.contexto}</p>
        </DocCard>
      </div>

      {/* ── Fase 2: Secuencias ── */}
      <div style={{ borderTop: "2px solid #111111", paddingTop: "24px" }}>
        {!secuencias ? (
          <div
            className="rounded-2xl p-6 flex flex-col items-center gap-3"
            style={{ border: "2px dashed #111111", background: "#F8F7F4" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#EFF4FF", border: "2px solid #111111" }}
            >
              <IconLinkedIn className="w-5 h-5" style={{ color: "#2563FF" }} />
            </div>
            <p className="text-sm font-black text-center" style={{ color: "#111111" }}>
              Fase 2 — Genera las secuencias de mensajes LinkedIn
            </p>
            {errorMsg && <p className="text-xs font-bold" style={{ color: "#EF4444" }}>{errorMsg}</p>}
            <button
              onClick={onGenerarCopy}
              disabled={isGeneratingCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all disabled:opacity-50"
              style={{ background: "#2563FF", border: "2px solid #111111", boxShadow: "2px 2px 0 #111111" }}
            >
              {isGeneratingCopy ? (
                <><Spinner className="w-4 h-4" />Generando mensajes…</>
              ) : (
                <><IconLinkedIn className="w-4 h-4" />Generar secuencias de mensajes</>
              )}
            </button>
          </div>
        ) : (
          <SecuenciasView secuencias={secuencias} />
        )}
      </div>

      {/* ── Fase 3: Apollo ── */}
      <div ref={apolloRef} style={{ borderTop: "2px solid #111111", paddingTop: "24px", paddingBottom: "40px" }}>
        {!segmentos ? (
          <div
            className="rounded-2xl p-6 flex flex-col items-center gap-3"
            style={{ border: "2px dashed #111111", background: "#F8F7F4" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "#EFF4FF", border: "2px solid #111111" }}
            >
              <svg className="w-5 h-5" fill="none" stroke="#2563FF" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
            </div>
            <p className="text-sm font-black text-center" style={{ color: "#111111" }}>
              Fase 3 — Busca leads en Apollo por segmento de campaña
            </p>
            {!secuencias && (
              <p className="text-xs text-center font-medium" style={{ color: "#AAAAAA" }}>
                Genera las secuencias primero para crear segmentos por estrategia, o lanza una búsqueda general.
              </p>
            )}
            <button
              onClick={onAbrirApollo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all"
              style={{ background: "#2563FF", border: "2px solid #111111", boxShadow: "2px 2px 0 #111111" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              Generar segmentos Apollo
            </button>
          </div>
        ) : (
          <SegmentosSection segmentos={segmentos} />
        )}
      </div>
    </div>
  );
}

// ── SegmentosSection ──────────────────────────────────────────────────────────

function SegmentosSection({ segmentos }: { segmentos: Segmento[] }) {
  const apiCount = segmentos.filter((s) => s.signalType === "job_openings").length;
  const manualCount = segmentos.length - apiCount;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "#111111" }}>Segmentos de búsqueda Apollo</h3>
          <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>
            {segmentos.length} segmentos
            {apiCount > 0 && ` · ${apiCount} con API disponible`}
            {manualCount > 0 && ` · ${manualCount} requieren aplicación manual`}
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {segmentos.map((seg) => (
          <SegmentoCard key={seg.id} segmento={seg} />
        ))}
      </div>
    </div>
  );
}

// ── SegmentoCard ──────────────────────────────────────────────────────────────

function SegmentoCard({ segmento }: { segmento: Segmento }) {
  const [open, setOpen] = useState(true);
  const [hintsOpen, setHintsOpen] = useState(false);
  const [filters, setFilters] = useState<ApolloFilters>(segmento.filters);
  const [leads, setLeads] = useState<ApolloLead[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const isJobOpenings = segmento.signalType === "job_openings";
  const totalPages = total ? Math.ceil(total / 25) : null;

  function updateFilter<K extends keyof ApolloFilters>(key: K, value: ApolloFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleRange(val: string) {
    const curr = filters.organization_num_employees_ranges;
    const next = curr.includes(val) ? curr.filter((v) => v !== val) : [...curr, val];
    updateFilter("organization_num_employees_ranges", next);
  }

  async function buscar(f: ApolloFilters, p = 1) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/prospecting/apollo-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, page: p, per_page: 25 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`Error ${data.status ?? res.status}: ${data.detail ?? data.error ?? "Apollo API error"}`);
        return;
      }
      setLeads(data.leads ?? []);
      setTotal(data.total ?? null);
      setPage(p);
      setSearched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  const apolloUrl = buildApolloUrl(filters);
  const personaColor = segmento.persona === "champion" ? "#2563FF" : "#7C3AED";
  const personaBg = segmento.persona === "champion" ? "rgba(37,99,255,0.08)" : "rgba(124,58,237,0.08)";

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #111111", background: "#FFFFFF", boxShadow: "3px 3px 0 #111111" }}>
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: personaBg, color: personaColor }}
          >
            {segmento.personaLabel}
          </span>
          <span className="text-sm font-medium" style={{ color: "#222222" }}>{segmento.estrategia}</span>
          {isJobOpenings ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#16A34A" }}>
              API disponible
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", color: "#B45309" }}>
              Signal manual
            </span>
          )}
          {searched && leads.length > 0 && (
            <span className="text-xs" style={{ color: "#AAAAAA" }}>{total?.toLocaleString()} leads</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="#AAAAAA" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #F0F0EE" }}>
          <div className="px-5 py-4 space-y-4">
            <FilterRow label="Cargos / títulos" hint="persona del ICP">
              <TagInput
                tags={filters.person_titles}
                onChange={(v) => updateFilter("person_titles", v)}
                placeholder="Añadir cargo…"
              />
            </FilterRow>
            <FilterRow label="Industrias / palabras clave" hint="sector del ICP">
              <TagInput
                tags={filters.q_organization_keyword_tags}
                onChange={(v) => updateFilter("q_organization_keyword_tags", v)}
                placeholder="Añadir industria…"
              />
            </FilterRow>
            <FilterRow label="Ubicaciones" hint="geografías del ICP">
              <TagInput
                tags={filters.person_locations}
                onChange={(v) => updateFilter("person_locations", v)}
                placeholder="Añadir ubicación…"
              />
            </FilterRow>
            <FilterRow label="Tamaño de empresa" hint="rangos Apollo">
              <div className="flex flex-wrap gap-2 mt-1">
                {EMPLOYEE_RANGES.map((r) => {
                  const active = filters.organization_num_employees_ranges.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      onClick={() => toggleRange(r.value)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                      style={
                        active
                          ? { background: "#2563FF", color: "#FFFFFF", border: "1px solid #2563FF" }
                          : { background: "#FFFFFF", color: "#666666", border: "1px solid #E0E0E0" }
                      }
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </FilterRow>

            {isJobOpenings && (
              <FilterRow label="Empresa contrata para (q_organization_job_titles)" hint="puesto en la oferta">
                <TagInput
                  tags={filters.q_organization_job_titles ?? []}
                  onChange={(v) => updateFilter("q_organization_job_titles", v)}
                  placeholder="Ej: Sales Representative, Comercial…"
                />
              </FilterRow>
            )}

            <FilterHintsSection
              hints={segmento.hints}
              open={hintsOpen}
              onToggle={() => setHintsOpen((v) => !v)}
            />

            <div className="space-y-2">
              {!isJobOpenings && (
                <div className="rounded-xl px-3 py-2.5" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p className="text-xs" style={{ color: "#92400E" }}>
                    <span className="font-semibold">Signal manual — </span>
                    aplícalo en Apollo UI → Signals después de abrir la búsqueda.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {isJobOpenings && (
                  <button
                    onClick={() => buscar(filters, 1)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-50"
                    style={{ background: "#2563FF" }}
                  >
                    {loading ? <><Spinner className="w-3.5 h-3.5" />Buscando…</> : "Buscar leads"}
                  </button>
                )}

                <a
                  href={apolloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ border: "1px solid #E0E0E0", color: "#555555", background: "#FFFFFF" }}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir en Apollo
                </a>

                {searched && leads.length > 0 && (
                  <button
                    onClick={() => exportarCSV(leads, segmento.titulo)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{ border: "1px solid #E0E0E0", color: "#555555", background: "#FFFFFF" }}
                  >
                    <IconDownload className="w-3 h-3" />
                    Exportar CSV
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl p-3" style={{ background: "#FFF5F5", border: "1px solid #FED7D7" }}>
                <p className="text-xs font-semibold mb-0.5" style={{ color: "#C53030" }}>Error de Apollo</p>
                <p className="text-xs font-mono break-all" style={{ color: "#E53E3E" }}>{error}</p>
              </div>
            )}
          </div>

          {/* Results */}
          {searched && isJobOpenings && (
            <div style={{ borderTop: "1px solid #F0F0EE" }} className="px-5 py-4">
              {leads.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs" style={{ color: "#AAAAAA" }}>
                      {total !== null ? `${total.toLocaleString()} leads encontrados` : `${leads.length} leads`}
                      {" · "}página {page}{totalPages ? ` de ${totalPages}` : ""}
                    </p>
                    <button
                      onClick={() => exportarCSV(leads, segmento.titulo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                      style={{ border: "1px solid #E0E0E0", color: "#555555", background: "#FFFFFF" }}
                    >
                      <IconDownload className="w-3 h-3" />
                      Exportar CSV
                    </button>
                  </div>
                  <LeadsTable leads={leads} />
                  {totalPages && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => buscar(filters, page - 1)}
                        disabled={page <= 1 || loading}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                        style={{ border: "1px solid #E0E0E0", color: "#555555", background: "#FFFFFF" }}
                      >
                        ← Anterior
                      </button>
                      <span className="text-xs" style={{ color: "#AAAAAA" }}>{page} / {totalPages}</span>
                      <button
                        onClick={() => buscar(filters, page + 1)}
                        disabled={!totalPages || page >= totalPages || loading}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                        style={{ border: "1px solid #E0E0E0", color: "#555555", background: "#FFFFFF" }}
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-sm py-6" style={{ color: "#BBBBBB" }}>Sin resultados para estos filtros.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SecuenciasView ────────────────────────────────────────────────────────────

function SecuenciasView({ secuencias }: { secuencias: SecuenciaEstrategia[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold" style={{ color: "#111111" }}>Secuencias LinkedIn</h3>
        <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>
          {secuencias.length} {secuencias.length === 1 ? "estrategia" : "estrategias"} · 3 mensajes por persona
        </p>
      </div>
      {secuencias.map((sec, i) => (
        <EstrategiaCard key={i} secuencia={sec} />
      ))}
    </div>
  );
}

// ── EstrategiaCard ────────────────────────────────────────────────────────────

function EstrategiaCard({ secuencia }: { secuencia: SecuenciaEstrategia }) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"champion" | "economicBuyer">("champion");

  const msgs = tab === "champion" ? secuencia.champion : secuencia.economicBuyer;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #111111", background: "#FFFFFF", boxShadow: "3px 3px 0 #111111" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#AAAAAA" }}>Estrategia</span>
          <span className="text-sm font-semibold" style={{ color: "#111111" }}>{secuencia.estrategia}</span>
        </div>
        <svg className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="#AAAAAA" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div style={{ borderTop: "1px solid #F0F0EE" }}>
          <div className="flex" style={{ borderBottom: "1px solid #F0F0EE" }}>
            {(["champion", "economicBuyer"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className="flex-1 py-2.5 text-xs font-semibold transition-colors"
                style={
                  tab === t
                    ? {
                        borderBottom: `2px solid ${t === "champion" ? "#2563FF" : "#7C3AED"}`,
                        color: t === "champion" ? "#2563FF" : "#7C3AED",
                        background: t === "champion" ? "rgba(37,99,255,0.04)" : "rgba(124,58,237,0.04)",
                      }
                    : { color: "#AAAAAA", borderBottom: "2px solid transparent" }
                }>
                {t === "champion" ? "Champion" : "Economic Buyer"}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-3">
            {msgs.map((texto, i) => (
              <MensajeCard key={i} numero={i + 1} texto={texto} persona={tab} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MensajeCard ───────────────────────────────────────────────────────────────

function MensajeCard({ numero, texto, persona }: { numero: number; texto: string; persona: "champion" | "economicBuyer" }) {
  const [copied, setCopied] = useState(false);
  const accentColor = persona === "champion" ? "#2563FF" : "#7C3AED";
  const accentBg = persona === "champion" ? "rgba(37,99,255,0.08)" : "rgba(124,58,237,0.08)";

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "2px solid #111111", boxShadow: "2px 2px 0 #111111" }}>
      <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "#F8F7F4", borderBottom: "2px solid #111111" }}>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: accentBg, color: accentColor }}
        >
          Mensaje {numero}
        </span>
        <button onClick={copiar}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "#FFFFFF", border: "1px solid #E8E8E4", color: "#555555" }}>
          {copied
            ? <><IconCheck className="w-3 h-3" style={{ color: "#22C55E" }} />Copiado</>
            : <><IconCopy className="w-3 h-3" />Copiar</>}
        </button>
      </div>
      <div className="px-4 py-3 bg-white">
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#333333" }}>{texto}</p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DocCard({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-4 rounded-full" style={{ background: accent }} />
        <h3 className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#AAAAAA" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DocField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#BBBBBB" }}>{label}</p>
      <p className="text-sm" style={{ color: "#333333" }}>{value || "—"}</p>
    </div>
  );
}

function PersonaCard({ title, persona, color, colorBg }: { title: string; persona: Persona; color: string; colorBg: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: colorBg, color }}
        >
          {title}
        </span>
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#BBBBBB" }}>Cargos</p>
      <p className="text-sm mb-3" style={{ color: "#333333" }}>{persona.cargos.join(", ")}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#BBBBBB" }}>Dolores</p>
      <ul className="space-y-0.5 mb-3">
        {persona.doloresPrincipales.map((d, i) => (
          <li key={i} className="text-sm flex gap-1.5" style={{ color: "#444444" }}>
            <span style={{ color: "#CCCCCC" }}>·</span>{d}
          </li>
        ))}
      </ul>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#BBBBBB" }}>Mensaje que resuena</p>
      <p className="text-xs rounded-xl p-2.5 leading-relaxed" style={{ background: colorBg, color }}>{persona.mensajeRelevante}</p>
    </div>
  );
}

function FilterRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <p className="text-xs font-semibold" style={{ color: "#444444" }}>{label}</p>
        <p className="text-xs" style={{ color: "#AAAAAA" }}>{hint}</p>
      </div>
      {children}
    </div>
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  function addTag() {
    const v = input.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setInput("");
  }

  function removeTag(i: number) {
    onChange(tags.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 rounded-xl min-h-[40px]"
      style={{ border: "1px solid #E8E8E4", background: "#F7F7F5" }}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
          style={{ background: "#FFFFFF", border: "1px solid #E0E0E0", color: "#444444" }}
        >
          {tag}
          <button onClick={() => removeTag(i)} className="hover:text-red-500 leading-none" style={{ color: "#AAAAAA" }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-xs focus:outline-none"
        style={{ color: "#444444" }}
      />
    </div>
  );
}

function LeadsTable({ leads }: { leads: ApolloLead[] }) {
  return (
    <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #E8E8E4" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "#F7F7F5", borderBottom: "1px solid #E8E8E4" }}>
            {["Nombre", "Cargo", "Empresa", "Email", "LinkedIn"].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px]" style={{ color: "#AAAAAA" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={lead.id || i} className="border-b" style={{ borderColor: "#F5F5F5", background: i % 2 === 0 ? "#FFFFFF" : "#FAFAF8" }}>
              <td className="px-3 py-2 font-semibold whitespace-nowrap" style={{ color: "#222222" }}>{lead.name || "—"}</td>
              <td className="px-3 py-2 max-w-[140px] truncate" style={{ color: "#666666" }}>{lead.title || "—"}</td>
              <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#666666" }}>{lead.company || "—"}</td>
              <td className="px-3 py-2">
                {lead.email ? (
                  <span style={{ color: "#333333" }}>{lead.email}</span>
                ) : (
                  <span className="italic" style={{ color: "#CCCCCC" }}>{lead.email_status || "no disponible"}</span>
                )}
              </td>
              <td className="px-3 py-2">
                {lead.linkedin_url ? (
                  <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="hover:underline" style={{ color: "#2563FF" }}>Ver →</a>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function IconDoc({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function IconLinkedIn({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function IconCheck({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// ── Apollo hints ──────────────────────────────────────────────────────────────

const SIGNAL_PATTERNS: Array<{ keywords: string[]; apolloSignal: string }> = [
  { keywords: ["promoted", "promoci", "ascend", "ascent"], apolloSignal: "Recently promoted" },
  { keywords: ["champion changed", "changed job", "cambio de trabajo", "ex-champion", "ex champion"], apolloSignal: "Former champion changed jobs" },
  { keywords: ["award", "premio", "reconocimiento", "recognition"], apolloSignal: "Award or recognition" },
  { keywords: ["new client", "nuevo cliente", "new account", "signed"], apolloSignal: "New client signed" },
  { keywords: ["partnership", "alianza", "asociaci", "collaborat"], apolloSignal: "New partnership" },
  { keywords: ["office expansion", "expansión de oficina", "new office", "nueva oficina", "open office"], apolloSignal: "Office expansion" },
  { keywords: ["cutting cost", "reducción de coste", "reducción de gasto", "cost reduc", "recorte"], apolloSignal: "Cutting costs" },
  { keywords: ["new product", "nuevo producto", "new service", "nuevo servicio", "product launch", "lanzamiento"], apolloSignal: "New product or service" },
  { keywords: ["merger", "acquisition", "fusión", "adquisición", "m&a", "compra de empresa"], apolloSignal: "Merger or acquisition" },
  { keywords: ["buying intent", "intención de compra", "purchase intent", "high intent"], apolloSignal: "High buying intent" },
  { keywords: ["funding", "financiaci", "ronda", "serie a", "serie b", "serie c", "investment round", "raised"], apolloSignal: "Recent funding" },
  { keywords: ["rapid growth", "crecimiento rápido", "hypergrowth", "scaling", "escalando", "fast growth"], apolloSignal: "Rapid growth" },
  { keywords: ["new role", "nuevo rol", "nuevo puesto", "new position", "started as", "recently hired"], apolloSignal: "New role" },
  { keywords: ["empleo", "oferta", "hiring", "job open", "contrat", "vacan", "reclut"], apolloSignal: "Job postings active" },
];

function getHintsForEstrategia(estrategia: string, doc: Documento): FilterHint[] {
  const lower = estrategia.toLowerCase();
  const hints: FilterHint[] = [];

  for (const { keywords, apolloSignal } of SIGNAL_PATTERNS) {
    if (keywords.some((k) => lower.includes(k))) {
      const tipo: HintTipo = apolloSignal === "Job postings active" ? "job_posting" : "signal";
      hints.push({ tipo, label: apolloSignal, donde: "Apollo UI → Signals panel (columna izquierda)" });
    }
  }

  const hasFundingKeyword = ["funding", "financiaci", "ronda", "serie", "investment", "raised"].some((k) => lower.includes(k));
  if (hasFundingKeyword) {
    hints.push({ tipo: "funding", label: "Funding — Last funding round", donde: "Apollo UI → Company attributes → Funding", valores: ["Series A", "Series B", "Series C", "Seed"] });
  }

  const techs = doc.icp.tecnologias ?? [];
  if (techs.length > 0) {
    hints.push({ tipo: "technology", label: "Technologies used", donde: "Apollo UI → Technologies filter", valores: techs });
  }

  const hasJobKeyword = ["empleo", "oferta", "hiring", "job", "contrat", "vacan"].some((k) => lower.includes(k));
  if (hasJobKeyword && !hints.some((h) => h.tipo === "job_posting")) {
    hints.push({ tipo: "job_posting", label: "Job postings — puesto detectado en la estrategia", donde: "Apollo UI → Job postings filter" });
  }

  return hints;
}

// ── FilterHintsSection ────────────────────────────────────────────────────────

const HINT_STYLES: Record<HintTipo, { badge: string; color: string }> = {
  signal:      { badge: "rgba(139,92,246,0.1)", color: "#7C3AED" },
  technology:  { badge: "rgba(20,184,166,0.1)", color: "#0F766E" },
  funding:     { badge: "rgba(34,197,94,0.1)",  color: "#16A34A" },
  job_posting: { badge: "rgba(37,99,255,0.1)",  color: "#2563FF" },
  filter:      { badge: "rgba(0,0,0,0.05)",     color: "#666666" },
};

function FilterHintsSection({ hints, open, onToggle }: {
  hints: FilterHint[];
  open: boolean;
  onToggle: () => void;
}) {
  if (hints.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(139,92,246,0.03)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 transition-colors hover:bg-violet-50/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold" style={{ color: "#5B21B6" }}>
            Filtros adicionales recomendados en Apollo UI
          </span>
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ background: "rgba(139,92,246,0.15)", color: "#7C3AED" }}
          >
            {hints.length}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="#A78BFA" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-3 py-3 space-y-2.5" style={{ borderTop: "1px solid rgba(139,92,246,0.12)" }}>
          {hints.map((hint, i) => {
            const style = HINT_STYLES[hint.tipo];
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                  style={{ background: style.badge, color: style.color }}
                >
                  {hint.tipo === "signal" ? "SIGNAL"
                    : hint.tipo === "technology" ? "TECH"
                    : hint.tipo === "funding" ? "FUNDING"
                    : hint.tipo === "job_posting" ? "JOB POST"
                    : "FILTRO"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: "#333333" }}>&ldquo;{hint.label}&rdquo;</p>
                  {hint.donde && <p className="text-[11px] mt-0.5" style={{ color: "#7C3AED" }}>{hint.donde}</p>}
                  {hint.valores && hint.valores.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {hint.valores.map((v, j) => (
                        <span
                          key={j}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                          style={{ background: "#FFFFFF", border: "1px solid rgba(139,92,246,0.3)", color: "#7C3AED" }}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] pt-1" style={{ color: "#C4B5FD", borderTop: "1px solid rgba(139,92,246,0.1)" }}>
            Aplica estos filtros manualmente en Apollo UI después de abrir la búsqueda base.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Apollo helpers ────────────────────────────────────────────────────────────

function detectSignalType(estrategia: string): SignalType {
  const lower = estrategia.toLowerCase();
  if (JOB_OPENING_KEYWORDS.some((k) => lower.includes(k))) return "job_openings";
  return "unavailable";
}

function buildApolloUrl(filters: ApolloFilters): string {
  const parts: string[] = [];
  filters.person_titles.forEach((t) => parts.push(`personTitles[]=${encodeURIComponent(t)}`));
  filters.person_locations.forEach((l) => parts.push(`personLocations[]=${encodeURIComponent(l)}`));
  filters.q_organization_keyword_tags.forEach((t) => parts.push(`qOrganizationKeywordTags[]=${encodeURIComponent(t)}`));
  filters.organization_num_employees_ranges.forEach((r) =>
    parts.push(`organizationNumEmployeesRanges[]=${encodeURIComponent(r)}`)
  );
  return `https://app.apollo.io/#/people${parts.length > 0 ? "?" + parts.join("&") : ""}`;
}

function extractFiltersFromDoc(doc: Documento): ApolloFilters {
  const championTitles = doc.personas.champion.cargos ?? [];
  const buyerTitles = doc.personas.economicBuyer.cargos ?? [];
  const person_titles = Array.from(new Set([...championTitles, ...buyerTitles]));
  const q_organization_keyword_tags = doc.icp.industrias ?? [];
  const person_locations = doc.icp.geografias ?? [];

  const text = (doc.icp.tamanoEmpresa ?? "").toLowerCase();
  const nums = Array.from(text.matchAll(/\d+/g)).map((m) => parseInt(m[0], 10));
  const min = nums.length > 0 ? Math.min(...nums) : 0;
  const max = nums.length > 1 ? Math.max(...nums) : min;

  let organization_num_employees_ranges: string[] = [];
  if (min > 0 || max > 0) {
    organization_num_employees_ranges = EMPLOYEE_RANGES.filter((r) => {
      const [lo, hi] = r.value.split(",").map((v) => (v === "" ? Infinity : parseInt(v, 10)));
      return lo <= (max || min) && hi >= min;
    }).map((r) => r.value);
  }
  if (organization_num_employees_ranges.length === 0) {
    if (/pyme|pequeña|startup/i.test(text)) organization_num_employees_ranges = ["1,10", "11,50"];
    else if (/mediana/i.test(text)) organization_num_employees_ranges = ["51,200", "201,500"];
    else if (/grande|enterprise/i.test(text)) organization_num_employees_ranges = ["501,1000", "1001,5000"];
  }

  return { person_titles, q_organization_keyword_tags, person_locations, organization_num_employees_ranges };
}

function generarSegmentosFromDoc(doc: Documento, secuencias: SecuenciaEstrategia[]): Segmento[] {
  const baseFilters = extractFiltersFromDoc(doc);
  const result: Segmento[] = [];
  const personaEntries: Array<["champion" | "economicBuyer", string]> = [
    ["champion", "Champion"],
    ["economicBuyer", "Economic Buyer"],
  ];

  for (const sec of secuencias) {
    const signalType = detectSignalType(sec.estrategia);
    for (const [pKey, pLabel] of personaEntries) {
      const personaTitles = doc.personas[pKey].cargos ?? [];
      const filters: ApolloFilters = {
        ...baseFilters,
        person_titles: personaTitles.length > 0 ? personaTitles : baseFilters.person_titles,
      };
      if (signalType === "job_openings") filters.q_organization_job_titles = [];
      result.push({
        id: `${pKey}-${sec.estrategia}`,
        titulo: `${pLabel} — ${sec.estrategia}`,
        personaLabel: pLabel,
        persona: pKey,
        estrategia: sec.estrategia,
        signalType,
        filters,
        hints: getHintsForEstrategia(sec.estrategia, doc),
      });
    }
  }

  return result;
}

function generarSegmentosFallback(doc: Documento): Segmento[] {
  const baseFilters = extractFiltersFromDoc(doc);
  const personaEntries: Array<["champion" | "economicBuyer", string]> = [
    ["champion", "Champion"],
    ["economicBuyer", "Economic Buyer"],
  ];

  return personaEntries.map(([pKey, pLabel]) => {
    const personaTitles = doc.personas[pKey].cargos ?? [];
    return {
      id: `${pKey}-icp`,
      titulo: `${pLabel} — Búsqueda ICP general`,
      personaLabel: pLabel,
      persona: pKey,
      estrategia: "Búsqueda ICP general",
      signalType: "job_openings" as SignalType,
      filters: {
        ...baseFilters,
        person_titles: personaTitles.length > 0 ? personaTitles : baseFilters.person_titles,
        q_organization_job_titles: [],
      },
      hints: getHintsForEstrategia("", doc),
    };
  });
}

// ── CSV export ────────────────────────────────────────────────────────────────

function exportarCSV(leads: ApolloLead[], segmentoTitulo = "leads-apollo") {
  const headers = ["Nombre", "Cargo", "Empresa", "Email", "Email status", "LinkedIn"];
  const rows = leads.map((l) =>
    [l.name, l.title, l.company, l.email, l.email_status, l.linkedin_url].map(
      (v) => `"${(v ?? "").replace(/"/g, '""')}"`
    )
  );
  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${segmentoTitulo.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export ────────────────────────────────────────────────────────────────

function descargarPDF(doc: Documento) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Documento de Campaña — ${doc.empresa}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; padding: 40px; max-width: 820px; margin: 0 auto; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #666; font-size: 13px; margin-bottom: 30px; }
    .section { margin-bottom: 26px; }
    .section-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #aaa; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .field-label { font-size: 10px; color: #999; font-weight: 600; margin-bottom: 2px; margin-top: 8px; }
    .field-value { font-size: 13px; color: #222; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .objecion { background: #f9f9f9; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
    .objecion-q { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .objecion-a { font-size: 13px; color: #555; }
    .persona-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }
    .persona-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
    .champion .persona-title { color: #1d4ed8; }
    .buyer .persona-title { color: #7c3aed; }
    ul { list-style: none; padding: 0; }
    ul li { font-size: 13px; color: #333; margin-bottom: 3px; }
    ul li::before { content: "· "; color: #bbb; }
    .highlight { border-radius: 5px; padding: 7px 10px; font-size: 12px; margin-top: 8px; }
    .highlight-blue { background: #eff6ff; color: #1e40af; }
    .highlight-purple { background: #faf5ff; color: #6d28d9; }
    @page { margin: 1.8cm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${doc.empresa}</h1>
  <p class="subtitle">${doc.propuestaValor}</p>
  <div class="section">
    <div class="section-title">Problema que resuelve</div>
    <p style="font-size:13px;color:#333">${doc.problemaResuelve}</p>
  </div>
  <div class="section">
    <div class="section-title">ICP — Perfil de cliente ideal</div>
    <div class="grid-2">
      <div>
        <div class="field-label">Industrias</div><div class="field-value">${doc.icp.industrias.join(", ")}</div>
        <div class="field-label">Tamaño empresa</div><div class="field-value">${doc.icp.tamanoEmpresa}</div>
      </div>
      <div>
        <div class="field-label">Geografías</div><div class="field-value">${doc.icp.geografias.join(", ")}</div>
        <div class="field-label">Tecnologías</div><div class="field-value">${doc.icp.tecnologias.join(", ")}</div>
      </div>
    </div>
    <div class="field-label">Trigger events</div><div class="field-value">${doc.icp.triggerEvents.join(" · ")}</div>
  </div>
  <div class="section">
    <div class="section-title">Personas</div>
    <div class="grid-2">
      <div class="persona-box champion">
        <div class="persona-title">Champion</div>
        <div class="field-label">Cargos</div><div class="field-value">${doc.personas.champion.cargos.join(", ")}</div>
        <div class="field-label">Dolores</div>
        <ul>${doc.personas.champion.doloresPrincipales.map((d) => `<li>${d}</li>`).join("")}</ul>
        <div class="highlight highlight-blue">${doc.personas.champion.mensajeRelevante}</div>
      </div>
      <div class="persona-box buyer">
        <div class="persona-title">Economic Buyer</div>
        <div class="field-label">Cargos</div><div class="field-value">${doc.personas.economicBuyer.cargos.join(", ")}</div>
        <div class="field-label">Dolores</div>
        <ul>${doc.personas.economicBuyer.doloresPrincipales.map((d) => `<li>${d}</li>`).join("")}</ul>
        <div class="highlight highlight-purple">${doc.personas.economicBuyer.mensajeRelevante}</div>
      </div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Objeciones y respuestas</div>
    ${doc.objeciones.map((o) => `<div class="objecion"><div class="objecion-q">"${o.objecion}"</div><div class="objecion-a">→ ${o.respuesta}</div></div>`).join("")}
  </div>
  <div class="section">
    <div class="section-title">Diferenciadores</div>
    <ul>${doc.diferenciadores.map((d) => `<li>${d}</li>`).join("")}</ul>
  </div>
  <div class="section">
    <div class="section-title">Contexto de campaña</div>
    <p style="font-size:13px;color:#333">${doc.contexto}</p>
  </div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

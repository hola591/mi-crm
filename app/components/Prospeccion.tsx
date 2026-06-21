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
      <div className="flex-1 overflow-y-auto py-6 px-1 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 mr-2">
                G
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gray-900 text-white rounded-br-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm"
              }`}
            >
              {msg.content}
              {isStreaming && i === messages.length - 1 && msg.role === "assistant" && (
                <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {errorMsg && <p className="text-red-500 text-xs px-4 mb-2 text-center">{errorMsg}</p>}

      <div className="border-t border-gray-200 bg-white px-4 py-4">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu respuesta… (Enter para enviar)"
            rows={2}
            disabled={isStreaming || isGeneratingDoc}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming || isGeneratingDoc}
            className="shrink-0 w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex justify-between items-center">
          <p className="text-xs text-gray-400">
            {messages.length < 5
              ? "Responde al menos 2-3 preguntas antes de generar el documento"
              : "Cuando hayas terminado el diagnóstico, genera el documento"}
          </p>
          <button
            onClick={generarDocumento}
            disabled={isGeneratingDoc || isStreaming || messages.length < 5}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
          >
            {isGeneratingDoc ? (
              <><Spinner className="w-3.5 h-3.5" />Generando…</>
            ) : (
              <><IconDoc className="w-3.5 h-3.5" />Generar documento</>
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
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{doc.empresa}</h2>
          <p className="text-gray-500 text-sm mt-1">{doc.propuestaValor}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4 flex-wrap justify-end">
          <button
            onClick={onAbrirApollo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            Buscar leads en Apollo
          </button>
          <button
            onClick={() => descargarPDF(doc)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <IconDownload className="w-3.5 h-3.5" />
            Descargar PDF
          </button>
          <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-700 underline">
            Nuevo diagnóstico
          </button>
        </div>
      </div>

      {/* Problema */}
      <Card title="Problema que resuelve">
        <p className="text-gray-700 text-sm">{doc.problemaResuelve}</p>
      </Card>

      {/* ICP */}
      <Card title="ICP — Perfil de cliente ideal">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Industrias" value={doc.icp.industrias.join(", ")} />
          <Field label="Tamaño empresa" value={doc.icp.tamanoEmpresa} />
          <Field label="Geografías" value={doc.icp.geografias.join(", ")} />
          <Field label="Tecnologías" value={doc.icp.tecnologias.join(", ")} />
          <div className="col-span-2">
            <Field label="Trigger events" value={doc.icp.triggerEvents.join(" · ")} />
          </div>
        </div>
      </Card>

      {/* Personas */}
      <div className="grid grid-cols-2 gap-4">
        <PersonaCard title="Champion" persona={doc.personas.champion} color="blue" />
        <PersonaCard title="Economic Buyer" persona={doc.personas.economicBuyer} color="purple" />
      </div>

      {/* Objeciones */}
      <Card title="Objeciones y respuestas">
        <div className="space-y-3">
          {doc.objeciones.map((o, i) => (
            <div key={i} className="rounded-lg bg-gray-50 p-3">
              <p className="text-sm font-medium text-gray-800">&ldquo;{o.objecion}&rdquo;</p>
              <p className="text-sm text-gray-600 mt-1">→ {o.respuesta}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Diferenciadores + Contexto */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Diferenciadores">
          <ul className="space-y-1">
            {doc.diferenciadores.map((d, i) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-gray-400">·</span>{d}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Contexto de campaña">
          <p className="text-sm text-gray-700">{doc.contexto}</p>
        </Card>
      </div>

      {/* ── Fase 2: Secuencias ── */}
      <div className="border-t border-gray-200 pt-6">
        {!secuencias ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 font-medium text-center">
              Fase 2 — Genera las secuencias de mensajes LinkedIn para cada estrategia
            </p>
            {errorMsg && <p className="text-red-500 text-xs">{errorMsg}</p>}
            <button
              onClick={onGenerarCopy}
              disabled={isGeneratingCopy}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
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

      {/* ── Fase 3: Apollo por segmento ── */}
      <div ref={apolloRef} className="border-t border-gray-200 pt-6 pb-10">
        {!segmentos ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 flex flex-col items-center gap-3">
            <p className="text-sm text-gray-500 font-medium text-center">
              Fase 3 — Busca leads en Apollo por segmento de campaña
            </p>
            {!secuencias && (
              <p className="text-xs text-gray-400 text-center">
                Genera las secuencias primero para crear segmentos por estrategia, o lanza una búsqueda general.
              </p>
            )}
            <button
              onClick={onAbrirApollo}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
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
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Segmentos de búsqueda Apollo</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {segmentos.length} segmentos
            {apiCount > 0 && ` · ${apiCount} con API disponible`}
            {manualCount > 0 && ` · ${manualCount} requieren aplicación manual`}
          </p>
        </div>
      </div>
      <div className="space-y-4">
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
  const personaColor = segmento.persona === "champion" ? "blue" : "purple";
  const personaBadge =
    personaColor === "blue"
      ? "bg-blue-100 text-blue-700"
      : "bg-purple-100 text-purple-700";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${personaBadge}`}>
            {segmento.personaLabel}
          </span>
          <span className="text-sm font-medium text-gray-900">{segmento.estrategia}</span>
          {isJobOpenings ? (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              API disponible
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              Signal manual
            </span>
          )}
          {searched && leads.length > 0 && (
            <span className="text-xs text-gray-400">{total?.toLocaleString()} leads</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ml-2 ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="px-5 py-4 space-y-4">
            {/* Filters */}
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
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        active
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </FilterRow>

            {/* Extra field for job openings signal */}
            {isJobOpenings && (
              <FilterRow
                label="Empresa contrata para (q_organization_job_titles)"
                hint="puesto en la oferta de empleo"
              >
                <TagInput
                  tags={filters.q_organization_job_titles ?? []}
                  onChange={(v) => updateFilter("q_organization_job_titles", v)}
                  placeholder="Ej: Sales Representative, Comercial…"
                />
              </FilterRow>
            )}

            {/* Hints */}
            <FilterHintsSection
              hints={segmento.hints}
              open={hintsOpen}
              onToggle={() => setHintsOpen((v) => !v)}
            />

            {/* CTA */}
            <div className="space-y-2">
              {/* Signal unavailable notice */}
              {!isJobOpenings && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-xs text-amber-700">
                    <span className="font-semibold">Signal manual — </span>
                    aplícalo en Apollo UI → Signals después de abrir la búsqueda.
                  </p>
                </div>
              )}

              {/* Action row */}
              <div className="flex items-center gap-2 flex-wrap">
                {isJobOpenings && (
                  <button
                    onClick={() => buscar(filters, 1)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <><Spinner className="w-3.5 h-3.5" />Buscando…</> : "Buscar leads"}
                  </button>
                )}

                <a
                  href={apolloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir en Apollo
                </a>

                {searched && leads.length > 0 && (
                  <button
                    onClick={() => exportarCSV(leads, segmento.titulo)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <IconDownload className="w-3 h-3" />
                    Exportar CSV
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-xs font-semibold text-red-700 mb-0.5">Error de Apollo</p>
                <p className="text-xs text-red-600 font-mono break-all">{error}</p>
              </div>
            )}
          </div>

          {/* Results */}
          {searched && isJobOpenings && (
            <div className="border-t border-gray-100 px-5 py-4">
              {leads.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      {total !== null ? `${total.toLocaleString()} leads encontrados` : `${leads.length} leads`}
                      {" · "}página {page}{totalPages ? ` de ${totalPages}` : ""}
                    </p>
                    <button
                      onClick={() => exportarCSV(leads, segmento.titulo)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
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
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        ← Anterior
                      </button>
                      <span className="text-xs text-gray-500">{page} / {totalPages}</span>
                      <button
                        onClick={() => buscar(filters, page + 1)}
                        disabled={!totalPages || page >= totalPages || loading}
                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                      >
                        Siguiente →
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-sm text-gray-400 py-6">Sin resultados para estos filtros.</p>
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
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-gray-900">Secuencias LinkedIn</h3>
        <p className="text-xs text-gray-400 mt-0.5">
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Estrategia</span>
          <span className="text-sm font-medium text-gray-900">{secuencia.estrategia}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100">
          <div className="flex border-b border-gray-100">
            {(["champion", "economicBuyer"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                  tab === t
                    ? t === "champion"
                      ? "bg-blue-50 text-blue-700 border-b-2 border-blue-500"
                      : "bg-purple-50 text-purple-700 border-b-2 border-purple-500"
                    : "text-gray-400 hover:text-gray-600"
                }`}>
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
  const numBg = persona === "champion" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700";

  async function copiar() {
    await navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${numBg}`}>Mensaje {numero}</span>
        <button onClick={copiar}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          {copied
            ? <><IconCheck className="w-3 h-3 text-green-500" />Copiado</>
            : <><IconCopy className="w-3 h-3" />Copiar</>}
        </button>
      </div>
      <div className="px-4 py-3">
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{texto}</p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-gray-800 mt-0.5 text-sm">{value || "—"}</p>
    </div>
  );
}

function PersonaCard({ title, persona, color }: { title: string; persona: Persona; color: "blue" | "purple" }) {
  const accent = color === "blue" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700";
  const badge = color === "blue" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>{title}</span>
      </div>
      <p className="text-xs text-gray-400 font-medium mb-1">Cargos</p>
      <p className="text-sm text-gray-800 mb-3">{persona.cargos.join(", ")}</p>
      <p className="text-xs text-gray-400 font-medium mb-1">Dolores</p>
      <ul className="space-y-0.5 mb-3">
        {persona.doloresPrincipales.map((d, i) => (
          <li key={i} className="text-sm text-gray-700 flex gap-1.5">
            <span className="text-gray-400">·</span>{d}
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 font-medium mb-1">Mensaje que resuena</p>
      <p className={`text-xs rounded-lg p-2 ${accent}`}>{persona.mensajeRelevante}</p>
    </div>
  );
}

function FilterRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{hint}</p>
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
    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-gray-200 bg-gray-50 min-h-[40px]">
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-1 bg-white border border-gray-300 text-gray-700 text-xs px-2 py-0.5 rounded-full">
          {tag}
          <button onClick={() => removeTag(i)} className="text-gray-400 hover:text-gray-700 leading-none">×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none"
      />
    </div>
  );
}

function LeadsTable({ leads }: { leads: ApolloLead[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Nombre", "Cargo", "Empresa", "Email", "LinkedIn"].map((h) => (
              <th key={h} className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {leads.map((lead, i) => (
            <tr key={lead.id || i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
              <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{lead.name || "—"}</td>
              <td className="px-3 py-2 text-gray-600 max-w-[140px] truncate">{lead.title || "—"}</td>
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{lead.company || "—"}</td>
              <td className="px-3 py-2">
                {lead.email ? (
                  <span className="text-gray-700">{lead.email}</span>
                ) : (
                  <span className="text-gray-300 italic">
                    {lead.email_status || "no disponible"}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                {lead.linkedin_url ? (
                  <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline">Ver →</a>
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

function IconLinkedIn({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
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

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  // Match Apollo signals
  for (const { keywords, apolloSignal } of SIGNAL_PATTERNS) {
    if (keywords.some((k) => lower.includes(k))) {
      const tipo: HintTipo = apolloSignal === "Job postings active" ? "job_posting" : "signal";
      hints.push({
        tipo,
        label: apolloSignal,
        donde: "Apollo UI → Signals panel (columna izquierda)",
      });
    }
  }

  // Funding filter (if funding signal or related keywords)
  const hasFundingKeyword = ["funding", "financiaci", "ronda", "serie", "investment", "raised"].some((k) => lower.includes(k));
  if (hasFundingKeyword) {
    hints.push({
      tipo: "funding",
      label: "Funding — Last funding round",
      donde: "Apollo UI → Company attributes → Funding",
      valores: ["Series A", "Series B", "Series C", "Seed"],
    });
  }

  // Technologies from doc ICP
  const techs = doc.icp.tecnologias ?? [];
  if (techs.length > 0) {
    hints.push({
      tipo: "technology",
      label: "Technologies used",
      donde: "Apollo UI → Technologies filter",
      valores: techs,
    });
  }

  // Job postings — suggest what role they're hiring for if relevant
  const hasJobKeyword = ["empleo", "oferta", "hiring", "job", "contrat", "vacan"].some((k) => lower.includes(k));
  if (hasJobKeyword && !hints.some((h) => h.tipo === "job_posting")) {
    hints.push({
      tipo: "job_posting",
      label: "Job postings — puesto detectado en la estrategia",
      donde: "Apollo UI → Job postings filter",
    });
  }

  return hints;
}

// ── FilterHintsSection ────────────────────────────────────────────────────────

const HINT_STYLES: Record<HintTipo, { badge: string; icon: string }> = {
  signal:      { badge: "bg-violet-100 text-violet-700", icon: "⚡" },
  technology:  { badge: "bg-teal-100 text-teal-700",    icon: "🔧" },
  funding:     { badge: "bg-emerald-100 text-emerald-700", icon: "💰" },
  job_posting: { badge: "bg-blue-100 text-blue-700",    icon: "📋" },
  filter:      { badge: "bg-gray-100 text-gray-600",    icon: "🔍" },
};

function FilterHintsSection({ hints, open, onToggle }: {
  hints: FilterHint[];
  open: boolean;
  onToggle: () => void;
}) {
  if (hints.length === 0) return null;

  return (
    <div className="rounded-lg border border-violet-100 bg-violet-50 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-violet-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-800">
            Filtros adicionales recomendados en Apollo UI
          </span>
          <span className="text-[10px] font-bold bg-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full">
            {hints.length}
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-violet-500 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-violet-100 px-3 py-3 space-y-2.5">
          {hints.map((hint, i) => {
            const style = HINT_STYLES[hint.tipo];
            return (
              <div key={i} className="flex items-start gap-2.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${style.badge}`}>
                  {hint.tipo === "signal" ? "SIGNAL"
                    : hint.tipo === "technology" ? "TECH"
                    : hint.tipo === "funding" ? "FUNDING"
                    : hint.tipo === "job_posting" ? "JOB POST"
                    : "FILTRO"}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800">&ldquo;{hint.label}&rdquo;</p>
                  {hint.donde && (
                    <p className="text-[11px] text-violet-600 mt-0.5">{hint.donde}</p>
                  )}
                  {hint.valores && hint.valores.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {hint.valores.map((v, j) => (
                        <span key={j} className="text-[10px] bg-white border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-full font-medium">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-violet-400 pt-1 border-t border-violet-100">
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
      if (signalType === "job_openings") {
        filters.q_organization_job_titles = [];
      }
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

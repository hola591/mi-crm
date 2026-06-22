"use client";

import { useEffect, useState } from "react";

interface Question { question: string; answer: string; }
interface Booking {
  id: number | string;
  starts_at: string;
  booking_type_title: string;
  contact_name: string;
  contact_email: string;
  web_url: string;
  questions: Question[];
}
interface Objecion { objecion: string; como_responder: string; }
interface Informe {
  scoring: "warm" | "mild" | "cold";
  razon_scoring: string;
  resumen_empresa: string;
  perfil_lead: string;
  objeciones: Objecion[];
  que_proponer: string;
  preguntas_clave: string[];
}

type Scoring = "warm" | "mild" | "cold";

const SCORING_CONFIG: Record<Scoring, { label: string; bg: string; text: string; emoji: string; badgeStyle: React.CSSProperties }> = {
  warm: {
    label: "Warm — Lead caliente", bg: "#FFF0F0", text: "#C53030", emoji: "🔥",
    badgeStyle: { background: "#FFE4E4", color: "#C53030", border: "1.5px solid #111111" },
  },
  mild: {
    label: "Mild — Lead tibio", bg: "#FFFBEB", text: "#92400E", emoji: "🌤",
    badgeStyle: { background: "#FEF9C3", color: "#854D0E", border: "1.5px solid #111111" },
  },
  cold: {
    label: "Cold — Lead frío", bg: "#EFF6FF", text: "#1E40AF", emoji: "❄️",
    badgeStyle: { background: "#DBEAFE", color: "#1E40AF", border: "1.5px solid #111111" },
  },
};

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

function getAvatarBg(scoring: Scoring | null): string {
  if (scoring === "warm") return "#FECACA";
  if (scoring === "cold") return "#BFDBFE";
  if (scoring === "mild") return "#FDE68A";
  return "#E0DED8";
}

function getAvatarText(scoring: Scoring | null): string {
  if (scoring === "warm") return "#C53030";
  if (scoring === "cold") return "#1E40AF";
  if (scoring === "mild") return "#92400E";
  return "#666666";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString("es-ES", { day: "numeric" }),
    month: d.toLocaleDateString("es-ES", { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
  };
}

function storageKey(id: number | string) { return `informe_${id}`; }
function loadInforme(id: number | string): Informe | null {
  try { const r = localStorage.getItem(storageKey(id)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveInforme(id: number | string, inf: Informe) {
  localStorage.setItem(storageKey(id), JSON.stringify(inf));
}

export default function VerReuniones() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    fetch("/api/reuniones")
      .then((r) => r.json())
      .then((data) => {
        const list: Booking[] = data.bookings ?? [];
        setBookings(list);
        setSavedIds(new Set(list.filter((b) => loadInforme(b.id) !== null).map((b) => b.id)));
      })
      .catch(() => setErrorList("No se pudo cargar la lista de reuniones."))
      .finally(() => setLoadingList(false));
  }, []);

  function selectBooking(b: Booking) {
    setSelected(b);
    setErrorGen(null);
    setInforme(loadInforme(b.id));
  }

  async function generarInforme(force = false) {
    if (!selected || (!force && informe)) return;
    setGenerating(true);
    setErrorGen(null);
    setInforme(null);
    try {
      const res = await fetch("/api/reuniones/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking: selected }),
      });
      const data = await res.json();
      if (data.error) { setErrorGen(data.error); return; }
      saveInforme(selected.id, data);
      setInforme(data);
      setSavedIds((prev) => new Set(Array.from(prev).concat(selected.id)));
    } catch { setErrorGen("Error de red al generar el informe."); }
    finally { setGenerating(false); }
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ background: "#F8F7F4" }}>

      {/* ── Left: list ── */}
      <aside
        className="w-[280px] shrink-0 flex flex-col overflow-hidden"
        style={{ background: "#FFFFFF", borderRight: "2px solid #111111" }}
      >
        {/* Header */}
        <div className="px-5 py-4" style={{ borderBottom: "2px solid #111111" }}>
          <h2 className="text-sm font-black" style={{ color: "#111111" }}>Reuniones</h2>
          {!loadingList && !errorList && (
            <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>
              {bookings.length} reservas activas
            </p>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
          {loadingList && (
            [1, 2, 3].map((i) => <div key={i} className="h-[72px] rounded-2xl shimmer" />)
          )}
          {errorList && <p className="px-2 py-4 text-sm" style={{ color: "#EF4444" }}>{errorList}</p>}
          {!loadingList && !errorList && bookings.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-bold" style={{ color: "#CCCCCC" }}>Sin reuniones activas</p>
            </div>
          )}

          {bookings.map((b) => {
            const isActive = selected?.id === b.id;
            const saved = savedIds.has(b.id) ? loadInforme(b.id) : null;
            const { day, month, time } = formatDateShort(b.starts_at);
            const scoringConf = saved ? SCORING_CONFIG[saved.scoring] : null;

            return (
              <button
                key={b.id}
                onClick={() => selectBooking(b)}
                className="w-full text-left rounded-2xl p-3.5 transition-all duration-150 flex items-start gap-3"
                style={{
                  background: isActive ? "#F0F5FF" : "#FFFFFF",
                  border: isActive ? "2px solid #2563FF" : "2px solid #E0DED8",
                  boxShadow: isActive ? "2px 2px 0 #111111" : "none",
                }}
              >
                {/* Date block */}
                <div
                  className="w-10 shrink-0 flex flex-col items-center justify-center rounded-xl py-1.5"
                  style={{
                    background: isActive ? "#2563FF" : "#F8F7F4",
                    border: "1.5px solid #111111",
                  }}
                >
                  <span className="text-[10px] font-black leading-none" style={{ color: isActive ? "rgba(255,255,255,0.75)" : "#AAAAAA" }}>
                    {month}
                  </span>
                  <span className="text-base font-black leading-tight" style={{ color: isActive ? "#FFFFFF" : "#111111" }}>
                    {day}
                  </span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1.5 mb-0.5">
                    <span className="text-sm font-bold truncate" style={{ color: isActive ? "#2563FF" : "#111111" }}>
                      {b.contact_name || "Sin nombre"}
                    </span>
                    {scoringConf && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
                        style={scoringConf.badgeStyle}
                      >
                        {saved!.scoring.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "#888888" }}>{b.booking_type_title}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: "#BBBBBB" }}>{time}</p>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right: detail ── */}
      <main className="flex-1 overflow-y-auto">
        {!selected && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              {/* Blob + icon */}
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div
                  className="blob-yellow absolute w-28 h-28 animate-float pointer-events-none"
                  style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%) scale(1.3)", opacity: 0.6 }}
                />
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center relative z-10"
                  style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
                >
                  <svg className="w-8 h-8" fill="none" stroke="#111111" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-bold" style={{ color: "#AAAAAA" }}>Selecciona una reunión</p>
            </div>
          </div>
        )}

        {selected && (
          <div className="max-w-2xl mx-auto p-8 space-y-4">

            {/* Header card */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-black shrink-0"
                    style={{
                      background: getAvatarBg(informe?.scoring ?? null),
                      color: getAvatarText(informe?.scoring ?? null),
                      border: "2px solid #111111",
                    }}
                  >
                    {getInitials(selected.contact_name || "?")}
                  </div>
                  <div>
                    <h2 className="text-base font-black" style={{ color: "#111111" }}>{selected.contact_name}</h2>
                    <p className="text-xs mt-0.5" style={{ color: "#888888" }}>{selected.contact_email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded"
                        style={{ background: "#EFF4FF", color: "#2563FF", border: "1.5px solid #111111" }}
                      >
                        {selected.booking_type_title}
                      </span>
                      <span className="text-[11px]" style={{ color: "#AAAAAA" }}>{formatDate(selected.starts_at)}</span>
                    </div>
                    {selected.web_url && (
                      <a
                        href={selected.web_url.startsWith("http") ? selected.web_url : `https://${selected.web_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-1.5 inline-flex items-center gap-1 hover:underline"
                        style={{ color: "#2563FF" }}
                      >
                        {selected.web_url}
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
                {informe && (
                  <button
                    onClick={() => generarInforme(true)}
                    disabled={generating}
                    className="text-xs px-3 py-1.5 rounded-xl transition-all font-bold disabled:opacity-40"
                    style={{ border: "1.5px solid #111111", color: "#555555", background: "#F8F7F4" }}
                  >
                    Regenerar
                  </button>
                )}
              </div>
            </div>

            {/* Form answers */}
            {selected.questions.length > 0 && (
              <div
                className="rounded-2xl p-5"
                style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest mb-3.5" style={{ color: "#AAAAAA" }}>
                  Respuestas del formulario
                </p>
                <dl className="space-y-3.5">
                  {selected.questions.map((q, i) => (
                    <div key={i}>
                      <dt className="text-xs mb-0.5" style={{ color: "#BBBBBB" }}>{q.question}</dt>
                      <dd className="text-sm font-semibold" style={{ color: "#222222" }}>{q.answer || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Generate */}
            {!informe && !generating && (
              <button
                onClick={() => generarInforme()}
                className="w-full py-3.5 flex items-center justify-center gap-2.5 rounded-2xl text-sm font-black text-white transition-all"
                style={{ background: "#2563FF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generar informe con IA
              </button>
            )}

            {generating && (
              <div
                className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl"
                style={{ background: "#FFFFFF", border: "2px solid #111111" }}
              >
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" style={{ color: "#2563FF" }}>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm font-bold" style={{ color: "#888888" }}>Analizando perfil…</span>
              </div>
            )}

            {errorGen && (
              <p className="text-sm rounded-2xl px-4 py-3.5 font-medium" style={{ background: "#FFF5F5", color: "#EF4444", border: "2px solid #EF4444" }}>
                {errorGen}
              </p>
            )}

            {/* Informe */}
            {informe && (() => {
              const conf = SCORING_CONFIG[informe.scoring];
              return (
                <div className="space-y-3 animate-fade-in-up">
                  {/* Scoring */}
                  <div className="rounded-2xl overflow-hidden" style={{ border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
                    <div className="px-5 py-4 flex items-center gap-3" style={{ background: conf.bg }}>
                      <span className="text-2xl">{conf.emoji}</span>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: conf.text }}>Scoring</p>
                        <p className="text-base font-black" style={{ color: conf.text }}>{conf.label}</p>
                      </div>
                    </div>
                    <div className="px-5 py-4 bg-white" style={{ borderTop: "2px solid #111111" }}>
                      <p className="text-sm leading-relaxed" style={{ color: "#555555" }}>{informe.razon_scoring}</p>
                    </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { label: "Resumen empresa", content: informe.resumen_empresa, accent: "#2563FF" },
                      { label: "Perfil del lead", content: informe.perfil_lead, accent: "#111111" },
                    ].map(({ label, content, accent }) => (
                      <div
                        key={label}
                        className="rounded-2xl p-5"
                        style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
                      >
                        <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: accent }}>
                          {label}
                        </p>
                        <p className="text-sm leading-relaxed" style={{ color: "#444444" }}>{content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Objeciones */}
                  {informe.objeciones?.length > 0 && (
                    <div
                      className="rounded-2xl p-5"
                      style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "#F59E0B" }}>
                        Objeciones probables
                      </p>
                      <div className="space-y-2.5">
                        {informe.objeciones.map((o, i) => (
                          <div
                            key={i}
                            className="rounded-xl p-4"
                            style={{ background: "#F8F7F4", border: "1.5px solid #E0DED8" }}
                          >
                            <p className="text-sm font-bold mb-1" style={{ color: "#111111" }}>{o.objecion}</p>
                            <p className="text-sm" style={{ color: "#666666" }}>{o.como_responder}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Qué proponer */}
                  <div
                    className="rounded-2xl p-5 relative overflow-hidden"
                    style={{ background: "#111111", border: "2px solid #111111", boxShadow: "3px 3px 0 #FFD400" }}
                  >
                    <div className="blob-yellow absolute -top-10 -right-10 w-48 h-48 pointer-events-none opacity-20" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="#2563FF" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#555555" }}>Qué proponer</p>
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: "#E8E8E8" }}>{informe.que_proponer}</p>
                    </div>
                  </div>

                  {/* Preguntas clave */}
                  {informe.preguntas_clave?.length > 0 && (
                    <div
                      className="rounded-2xl p-5"
                      style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
                    >
                      <p className="text-[10px] font-black uppercase tracking-widest mb-4" style={{ color: "#22C55E" }}>
                        Preguntas clave
                      </p>
                      <ul className="space-y-2">
                        {informe.preguntas_clave.map((p, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "#444444" }}>
                            <span
                              className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
                              style={{ background: "#F0FDF4", color: "#16A34A", border: "1.5px solid #111111" }}
                            >
                              {i + 1}
                            </span>
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}

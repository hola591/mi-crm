"use client";

import { useEffect, useState } from "react";

interface Question {
  question: string;
  answer: string;
}

interface Booking {
  id: number | string;
  starts_at: string;
  booking_type_title: string;
  contact_name: string;
  contact_email: string;
  web_url: string;
  questions: Question[];
}

interface Objecion {
  objecion: string;
  como_responder: string;
}

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

function scoringBadge(scoring: Scoring | null) {
  if (!scoring) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
        Pendiente
      </span>
    );
  }
  const map: Record<Scoring, { label: string; className: string }> = {
    warm: { label: "Warm", className: "bg-green-100 text-green-700" },
    mild: { label: "Mild", className: "bg-yellow-100 text-yellow-700" },
    cold: { label: "Cold", className: "bg-red-100 text-red-600" },
  };
  const { label, className } = map[scoring];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function scoringBadgeLarge(scoring: Scoring) {
  const map: Record<Scoring, { label: string; className: string; dot: string }> = {
    warm: { label: "Warm — Lead caliente", className: "bg-green-50 border-green-200 text-green-800", dot: "bg-green-500" },
    mild: { label: "Mild — Lead tibio", className: "bg-yellow-50 border-yellow-200 text-yellow-800", dot: "bg-yellow-500" },
    cold: { label: "Cold — Lead frío", className: "bg-red-50 border-red-200 text-red-800", dot: "bg-red-500" },
  };
  const { label, className, dot } = map[scoring];
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${className} text-sm font-semibold`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
      {label}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function storageKey(id: number | string) {
  return `informe_${id}`;
}

function loadInforme(id: number | string): Informe | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveInforme(id: number | string, informe: Informe) {
  localStorage.setItem(storageKey(id), JSON.stringify(informe));
}

export default function VerReuniones() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [errorList, setErrorList] = useState<string | null>(null);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [informe, setInforme] = useState<Informe | null>(null);
  const [generating, setGenerating] = useState(false);
  const [errorGen, setErrorGen] = useState<string | null>(null);
  // Track which bookings have saved informes for badge updates
  const [savedIds, setSavedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    fetch("/api/reuniones")
      .then((r) => r.json())
      .then((data) => {
        const list: Booking[] = data.bookings ?? [];
        setBookings(list);
        // Find which bookings already have a saved informe
        const ids = list
          .filter((b) => loadInforme(b.id) !== null)
          .map((b) => b.id);
        setSavedIds(new Set(ids));
      })
      .catch(() => setErrorList("No se pudo cargar la lista de reuniones."))
      .finally(() => setLoadingList(false));
  }, []);

  function selectBooking(b: Booking) {
    setSelected(b);
    setErrorGen(null);
    const saved = loadInforme(b.id);
    setInforme(saved);
  }

  async function generarInforme(force = false) {
    if (!selected) return;
    if (!force && informe) return;

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

      if (data.error) {
        setErrorGen(data.error);
        return;
      }

      saveInforme(selected.id, data);
      setInforme(data);
      setSavedIds((prev) => new Set(Array.from(prev).concat(selected.id)));
    } catch {
      setErrorGen("Error de red al generar el informe.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden">
      {/* Left column — booking list */}
      <aside className="w-1/3 min-w-[260px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Reuniones</h2>
          {!loadingList && !errorList && (
            <p className="text-xs text-gray-400 mt-0.5">{bookings.length} reservas activas</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingList && (
            <div className="flex items-center justify-center h-32">
              <span className="text-sm text-gray-400 animate-pulse">Cargando reuniones…</span>
            </div>
          )}

          {errorList && (
            <div className="p-4 text-sm text-red-500">{errorList}</div>
          )}

          {!loadingList && !errorList && bookings.length === 0 && (
            <div className="p-4 text-sm text-gray-400">No hay reuniones activas.</div>
          )}

          {bookings.map((b) => {
            const isActive = selected?.id === b.id;
            const saved = savedIds.has(b.id) ? loadInforme(b.id) : null;

            return (
              <button
                key={b.id}
                onClick={() => selectBooking(b)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "hover:bg-gray-50 text-gray-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-gray-900"}`}>
                    {b.contact_name || "Sin nombre"}
                  </span>
                  {isActive ? (
                    // Replicate badge with white/transparent style on dark bg
                    saved ? (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/20 text-white">
                        {saved.scoring === "warm" ? "Warm" : saved.scoring === "mild" ? "Mild" : "Cold"}
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-white/60">
                        Pendiente
                      </span>
                    )
                  ) : (
                    scoringBadge(saved?.scoring ?? null)
                  )}
                </div>
                <p className={`text-xs mt-0.5 truncate ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                  {b.booking_type_title}
                </p>
                <p className={`text-xs mt-1 ${isActive ? "text-gray-400" : "text-gray-400"}`}>
                  {formatDate(b.starts_at)}
                </p>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right column — detail */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {!selected && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
              </svg>
              <p className="text-gray-400 text-sm">Selecciona una reunión</p>
            </div>
          </div>
        )}

        {selected && (
          <div className="max-w-2xl mx-auto p-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.contact_name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selected.contact_email}</p>
                <p className="text-xs text-gray-400 mt-1">{selected.booking_type_title} · {formatDate(selected.starts_at)}</p>
                {selected.web_url && (
                  <a
                    href={selected.web_url.startsWith("http") ? selected.web_url : `https://${selected.web_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 inline-block"
                  >
                    {selected.web_url}
                  </a>
                )}
              </div>

              {informe && (
                <button
                  onClick={() => generarInforme(true)}
                  disabled={generating}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-2 py-1 transition-colors disabled:opacity-40"
                >
                  Regenerar
                </button>
              )}
            </div>

            {/* Form answers */}
            {selected.questions.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                  Respuestas del formulario
                </h3>
                <dl className="space-y-3">
                  {selected.questions.map((q, i) => (
                    <div key={i}>
                      <dt className="text-xs text-gray-400">{q.question}</dt>
                      <dd className="text-sm text-gray-800 font-medium mt-0.5">{q.answer || "—"}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Generate button / loading */}
            {!informe && !generating && (
              <button
                onClick={() => generarInforme()}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                ✨ Generar informe
              </button>
            )}

            {generating && (
              <div className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl py-5">
                <svg className="animate-spin w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span className="text-sm text-gray-500">Analizando perfil…</span>
              </div>
            )}

            {errorGen && (
              <p className="text-sm text-red-500 mt-3">{errorGen}</p>
            )}

            {/* Informe */}
            {informe && (
              <div className="space-y-5">
                {/* Scoring */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    {scoringBadgeLarge(informe.scoring)}
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{informe.razon_scoring}</p>
                </div>

                {/* Resumen empresa */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Resumen empresa
                  </h3>
                  <p className="text-sm text-gray-700">{informe.resumen_empresa}</p>
                </div>

                {/* Perfil del lead */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Perfil del lead
                  </h3>
                  <p className="text-sm text-gray-700">{informe.perfil_lead}</p>
                </div>

                {/* Objeciones */}
                {informe.objeciones?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Objeciones probables
                    </h3>
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left text-xs text-gray-400 font-medium pb-2 w-1/2">Objeción</th>
                          <th className="text-left text-xs text-gray-400 font-medium pb-2 w-1/2">Cómo responder</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {informe.objeciones.map((o, i) => (
                          <tr key={i}>
                            <td className="py-2 pr-4 text-gray-700 align-top">{o.objecion}</td>
                            <td className="py-2 text-gray-600 align-top">{o.como_responder}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Qué proponer */}
                <div className="bg-gray-900 rounded-xl p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Qué proponer
                  </h3>
                  <p className="text-sm text-white">{informe.que_proponer}</p>
                </div>

                {/* Preguntas clave */}
                {informe.preguntas_clave?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      Preguntas clave
                    </h3>
                    <ul className="space-y-2">
                      {informe.preguntas_clave.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="text-gray-300 font-mono text-xs mt-0.5">{String(i + 1).padStart(2, "0")}</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

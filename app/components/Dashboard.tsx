"use client";

import { useState } from "react";
import PreparadorReuniones from "./PreparadorReuniones";
import GeneradorPresupuestos from "./GeneradorPresupuestos";
import VerReuniones from "./VerReuniones";
import Prospeccion from "./Prospeccion";

const modules = [
  {
    id: "prospeccion",
    label: "Prospección",
    aiPowered: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    id: "ver-reuniones",
    label: "Ver Reuniones",
    aiPowered: false,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    id: "preparador-reuniones",
    label: "Preparador",
    aiPowered: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 0 1 2.828 0l.172.172a2 2 0 0 1 0 2.828L12 14H9v-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18" />
      </svg>
    ),
  },
  {
    id: "generador-presupuestos",
    label: "Presupuestos",
    aiPowered: true,
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState("prospeccion");
  const current = modules.find((m) => m.id === activeModule);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#F8F7F4" }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-[220px] flex flex-col shrink-0"
        style={{
          background: "#FFFFFF",
          borderRight: "2px solid #111111",
        }}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-5" style={{ borderBottom: "2px solid #111111" }}>
          <div className="flex items-center gap-2">
            {/* Logo mark — simple ink square with lightning */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "#2563FF", border: "2px solid #111111" }}
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-[14px] font-black tracking-tight" style={{ color: "#111111" }}>
              mi crm
            </span>
          </div>
        </div>

        {/* Section label */}
        <p
          className="px-5 pt-5 pb-2 text-[9px] font-black uppercase"
          style={{ letterSpacing: "0.16em", color: "#AAAAAA" }}
        >
          Módulos
        </p>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {modules.map((mod) => {
            const isActive = mod.id === activeModule;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 text-left"
                style={
                  isActive
                    ? {
                        background: "#2563FF",
                        color: "#FFFFFF",
                        border: "1.5px solid #111111",
                        boxShadow: "2px 2px 0 #111111",
                      }
                    : {
                        background: "transparent",
                        color: "#555555",
                        border: "1.5px solid transparent",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "#F8F7F4";
                    (e.currentTarget as HTMLButtonElement).style.color = "#111111";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "#555555";
                  }
                }}
              >
                <span style={{ opacity: isActive ? 1 : 0.7 }}>{mod.icon}</span>
                <span className="flex-1 min-w-0 truncate">{mod.label}</span>
                {mod.aiPowered && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded"
                    style={
                      isActive
                        ? { background: "rgba(255,255,255,0.25)", color: "#FFFFFF" }
                        : { background: "#F0EDE8", color: "#AAAAAA" }
                    }
                  >
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dot pattern decoration — bottom of sidebar */}
        <div className="mx-3 my-3">
          <div
            className="dot-pattern rounded-xl h-16 w-full"
            style={{ opacity: 0.35 }}
          />
        </div>

        {/* Footer */}
        <div className="px-4 py-4" style={{ borderTop: "2px solid #111111" }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0"
              style={{ background: "#2563FF", border: "1.5px solid #111111" }}
            >
              M
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: "#111111" }}>Mila Coco</p>
              <p className="text-[10px] truncate" style={{ color: "#AAAAAA" }}>
                cocoperezmila@gmail.com
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        {/* Yellow blob — top right, decorative */}
        <div
          className="blob-yellow absolute top-0 right-0 w-72 h-72 pointer-events-none animate-float"
          style={{ transform: "translate(30%, -35%)", opacity: 0.55, zIndex: 0 }}
        />

        {/* Top bar */}
        <header
          className="h-14 flex items-center justify-between px-8 shrink-0 relative"
          style={{
            background: "rgba(248,247,244,0.92)",
            backdropFilter: "blur(8px)",
            borderBottom: "2px solid #111111",
            zIndex: 10,
          }}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-black tracking-tight" style={{ color: "#111111" }}>
              {current?.label}
            </h1>
            {current?.aiPowered && (
              <span
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-black"
                style={{
                  background: "#2563FF",
                  color: "#FFFFFF",
                  border: "1.5px solid #111111",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                IA
              </span>
            )}
          </div>
        </header>

        {/* Module content */}
        <div
          className={`flex-1 overflow-hidden relative ${
            activeModule === "ver-reuniones" || activeModule === "prospeccion"
              ? ""
              : "overflow-y-auto p-8"
          }`}
          style={{ zIndex: 1 }}
        >
          {activeModule === "ver-reuniones" ? (
            <VerReuniones />
          ) : activeModule === "prospeccion" ? (
            <div className="flex flex-col h-full overflow-hidden px-8">
              <Prospeccion />
            </div>
          ) : activeModule === "preparador-reuniones" ? (
            <PreparadorReuniones />
          ) : activeModule === "generador-presupuestos" ? (
            <GeneradorPresupuestos />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <div
                  className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center card-ink"
                >
                  <span style={{ color: "#2563FF" }} className="[&>svg]:w-7 [&>svg]:h-7">
                    {current?.icon}
                  </span>
                </div>
                <h2 className="text-base font-black" style={{ color: "#111111" }}>
                  {current?.label}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#AAAAAA" }}>
                  En construcción
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";

const modules = [
  {
    id: "prospeccion",
    label: "Prospección",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
      </svg>
    ),
  },
  {
    id: "form-personalizado",
    label: "Form Personalizado",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "ver-reuniones",
    label: "Ver Reuniones",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
  {
    id: "preparador-reuniones",
    label: "Preparador de Reuniones",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 0 1 2.828 0l.172.172a2 2 0 0 1 0 2.828L12 14H9v-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 21h18" />
      </svg>
    ),
  },
  {
    id: "generador-presupuestos",
    label: "Generador de Presupuestos",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
      </svg>
    ),
  },
];

export default function Dashboard() {
  const [activeModule, setActiveModule] = useState("prospeccion");

  const current = modules.find((m) => m.id === activeModule);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo / Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <span className="text-sm font-semibold tracking-widest text-gray-400 uppercase">
            Dashboard
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {modules.map((mod) => {
            const isActive = mod.id === activeModule;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveModule(mod.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 text-left ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className={isActive ? "text-white" : "text-gray-400"}>
                  {mod.icon}
                </span>
                {mod.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-500">
              U
            </div>
            <div className="text-xs text-gray-500">
              <p className="font-medium text-gray-700">Usuario</p>
              <p>cuenta@email.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <h1 className="text-lg font-semibold text-gray-900">{current?.label}</h1>
        </header>

        {/* Module area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <span className="text-gray-300 mb-4 flex justify-center">{current?.icon && (
                <span className="w-12 h-12 [&>svg]:w-12 [&>svg]:h-12">{current.icon}</span>
              )}</span>
              <h2 className="text-2xl font-semibold text-gray-800 mt-2">{current?.label}</h2>
              <p className="text-gray-400 text-sm mt-2">Este módulo está en construcción.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

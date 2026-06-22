"use client";

import { useState } from "react";
import { generateText } from "@/app/lib/claude";

type Paso = "idle" | "generando-contenido" | "generando-html" | "listo" | "error";

const SYSTEM_CONTENIDO = `Eres la asistente comercial de ZasZas Agency / Mila Coco. Generas propuestas comerciales con el tono exacto de la agencia: directo, con personalidad, humor sutil y honesto, sin anglicismos ni marketing inflado. Primera persona, cercano pero profesional. Frases cortas. Párrafos cortos. Sin relleno. Siempre en español.`;

const SYSTEM_HTML = `Eres una experta maquetadora web. Recibes el texto completo de una propuesta comercial de ZasZas Agency y lo conviertes en un archivo HTML completo, autocontenido (CSS y JS inline), con el branding exacto de Mila Coco. Devuelves SOLO el HTML completo, sin ningún texto antes ni después, sin bloques de código markdown. El HTML debe empezar con <!DOCTYPE html> y ser una página completa y funcional.`;

function buildContenidoPrompt(data: {
  transcripcion: string; nombreCliente: string; servicios: string; precio: string; notas: string;
}): string {
  return `Genera el texto completo de una propuesta comercial de ZasZas Agency para el cliente "${data.nombreCliente}".

INFORMACIÓN DE LA REUNIÓN:
${data.transcripcion || "(No proporcionada)"}

SERVICIOS A OFRECER:
${data.servicios || "(No especificados)"}

PRECIO / INVERSIÓN:
${data.precio || "(No especificado)"}

NOTAS ADICIONALES:
${data.notas || "(Ninguna)"}

Genera las 9 secciones siguientes con el tono y estructura exactos de ZasZas Agency:

---

SECCIÓN 1 — PORTADA
Texto:
ZasZas Agency
×
${data.nombreCliente}

PLAN DE
LANZA–
MIENTO

---

SECCIÓN 2 — ASÍ EMPEZÓ TODO 👤
Historia corta en primera persona basada en la transcripción. Formato: diálogo de la primera llamada (2-4 líneas), contexto de lo que contó el cliente, frase de cierre que conecta con la propuesta.

---

SECCIÓN 3 — SEAMOS CLAROS 👀
Formato: "Hola [nombre de la persona de contacto si se menciona, o nombre del cliente],"
Luego una frase directa sobre el precio (tono: "antes de que sigas leyendo, el precio es este").
🚀 INVERSIÓN TOTAL: [precio concreto del campo PRECIO]
Frase sobre por qué es justo. Cierre invitando a seguir leyendo.

---

SECCIÓN 4 — DIAGNÓSTICO DEL CLIENTE 🥲
Título UPPERCASE personalizado que resume el problema central del cliente (ej: "TENÉIS UN PRODUCTO GENIAL, PERO SIN UN SISTEMA QUE LO VENDA").
Introducción + 2-3 pain points con este formato:
**Título del problema en negrita.**
Desarrollo en 2-3 frases.

---

SECCIÓN 5 — PLAN DE ACCIÓN 📝
Introducción de 1 frase. Luego las acciones numeradas extraídas de los servicios:
**N. Título de la acción**
- Sub-acción concreta
- Sub-acción concreta
Si hay algo que no incluye: ❗ No incluye: [lista]

---

SECCIÓN 6 — INVERSIÓN 🍫
1. Título descriptivo del proyecto
2. Lista de lo que incluye (con guiones)
3. **Precio destacado** (usar el precio del campo PRECIO)
4. Disponibilidad limitada

---

SECCIÓN 7 — BUROCRACIA 💼
Usar este texto EXACTO:

**Formalización del proyecto**
Una vez aceptado el presupuesto, firmaremos un contrato de prestación de servicios que protege a ambas partes.

**Formas de pago**
- Proyectos hasta 1.500€: Pago único al aceptar el presupuesto.
- Proyectos desde 1.501€: Pago fraccionado en 2 plazos. 50% al aceptar el presupuesto, y 50% a los 15 días del primer pago.
- Proyectos con inicio diferido: Si aceptas ahora pero empezamos en otro mes, pago del 25% como reserva de plaza al aceptar el presupuesto.

**Inicio del proyecto**
El trabajo arranca cuando tenemos:
- Formulario de investigación completado (te lo envío tras la firma).
- Accesos a las herramientas necesarias.

---

SECCIÓN 8 — POR QUÉ CONFIAR EN NOSOTROS 🤔
Usar este texto EXACTO:

Por una parte tienes a Javier Martínez, el cerebro técnico.
Lleva desde 2017 trabajando como programador y ha trabajado incluso para el Ministerio de Defensa en temas de Ciberespacio. Con su experiencia, es capaz de montarte cualquier automatización.

Y por otra parte estoy yo (Mila Coco). He trabajado con muchos de los referentes del marketing online (Javi Pastor, Alejandro Novás, Dean Romero, Roberto Gamboa, Miguel Florido) y con todo tipo de empresas (Yurest, Raiola, Somos Estupendas, Inmobiliaria Remax).
Doy clases en másters y sitios como la Cámara de Comercio de Valencia. También he sido ponente en distintos congresos.
En 2025 he publicado un libro con Anaya sobre copywriting.
Y actualmente tengo +700 alumnos que han comprado formaciones mías.

Es decir, estamos curtidos. Llevamos desde 2017 moviéndonos por el barro como lombrices inquietas. Los retos no nos dan miedo.

---

SECCIÓN 9 — ¿Y AHORA QUÉ? 👩‍🎤
Usar este texto (adaptando si hay bonus/fecha):

➡️ Próximos pasos:

**1. Confirma tu interés**
Responde a este email (o escríbeme a hola@milacoco.com).

**2. Formalización**
Mi compañera te pedirá y mandará:
- Datos de facturación.
- Formulario con preguntas sobre tu negocio y cliente tipo.
- Contrato de prestación de servicios.

**3. Pago y arranque**
Te enviamos la factura. Tras el abono y la recepción del formulario completo, empezamos a trabajar.

**4. Kick-off**
Te mandaré un email con instrucciones, fechas y accesos necesarios. Tendremos una pequeña reunión express para ponernos manos a la obra, crear cuentas en herramientas y demás.

---

Devuelve el texto completo sección a sección, con los separadores "---" entre cada sección.`;
}

function buildHtmlPrompt(contenido: string, clientName: string): string {
  return `Convierte el siguiente texto de propuesta comercial de ZasZas Agency en una landing page HTML completa para el cliente "${clientName}".

TEXTO DE LA PROPUESTA:
${contenido}

REQUISITOS TÉCNICOS:
- Un solo archivo HTML, CSS y JS inline (sin dependencias externas excepto Google Fonts)
- Google Fonts: <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
- Responsive, mobile first

BRANDING (valores fijos, no cambiar):
--color-gold: #CD961B
--color-pink: #E4A29D
--color-coral: #DF5134
--color-olive: #927C23
--color-bg: #F4F2ED
--color-dark: #1A1A1A
--color-white: #FFFFFF
--font-heading: 'Playfair Display', serif
--font-bold: 'Barlow Condensed', sans-serif
--font-body: 'Inter', sans-serif

REGLAS DE DISEÑO:
- Fondo general: #F4F2ED
- Secciones alternas: fondo blanco / fondo crema
- Títulos grandes UPPERCASE: Barlow Condensed 800, letter-spacing negativo
- Cuerpo: Inter 400, 17px, line-height 1.7
- Precio: Barlow Condensed 800, tamaño grande, color #DF5134
- Máximo ancho contenido: 720px centrado
- Bordes suaves: #E8E4DC

ESTRUCTURA HTML:

1. NAV sticky: logo "Mila <strong>coco</strong>" a la izquierda, botón "Ver inversión" (href="#inversion") a la derecha. Fondo #F4F2ED, borde inferior suave.

2. HERO (Sección 1 — Portada): fondo #1A1A1A, título "PLAN DE LANZAMIENTO" en Barlow Condensed blanco enorme, subtítulo "ZasZas Agency × ${clientName}" en dorado #CD961B.

3. SECCIÓN "ASÍ EMPEZÓ TODO" (Sección 2): fondo blanco, max-width 600px, texto narrativo con diálogo.

4. SECCIÓN "SEAMOS CLAROS" (Sección 3): fondo crema, precio en bloque destacado con borde izquierdo #DF5134, precio en Barlow Condensed grande color #DF5134.

5. SECCIÓN "DIAGNÓSTICO" (Sección 4): fondo blanco, título UPPERCASE grande personalizado, pain points como tarjetas con sombra suave.

6. SECCIÓN "PLAN DE ACCIÓN" (Sección 5): fondo crema, acordeón JS puro sin librería, primer item expandido por defecto, animación suave. Cada acción numerada como cabecera clickable.

7. SECCIÓN "INVERSIÓN" (Sección 6, id="inversion"): fondo #1A1A1A, precio en blanco Barlow Condensed grande, lista de incluidos en blanco, caja bonus 🎁 con borde dorado.

8. SECCIÓN "BUROCRACIA" (Sección 7): fondo blanco, dos columnas (o una en móvil).

9. SECCIÓN "POR QUÉ CONFIAR" (Sección 8): fondo crema, texto en prosa.

10. SECCIÓN "¿Y AHORA QUÉ?" (Sección 9): fondo blanco, timeline visual numerado (1-4), CTA final botón negro "Responder y confirmar" con mailto:hola@milacoco.com.

11. FOOTER: fondo #1A1A1A, texto "© 2025 Mila Coco / ZasZas Agency" y "hola@milacoco.com" en gris claro.

Devuelve SOLO el HTML completo comenzando con <!DOCTYPE html>. Sin texto adicional, sin bloques markdown.`;
}

const STEPS = [
  { number: "01", title: "¿Para quién?",   description: "Cliente y presupuesto",      color: "#2563FF" },
  { number: "02", title: "¿Qué ofrecemos?", description: "Servicios incluidos",        color: "#111111" },
  { number: "03", title: "Contexto",        description: "Transcripción de la reunión", color: "#059669" },
];

export default function GeneradorPresupuestos() {
  const [transcripcion, setTranscripcion] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [servicios, setServicios] = useState("");
  const [precio, setPrecio] = useState("");
  const [notas, setNotas] = useState("");
  const [paso, setPaso] = useState<Paso>("idle");
  const [htmlGenerado, setHtmlGenerado] = useState("");
  const [error, setError] = useState("");

  async function generarPresupuesto() {
    if (!nombreCliente.trim()) { setError("El nombre del cliente es obligatorio."); return; }
    if (!transcripcion.trim() && !servicios.trim()) { setError("Añade al menos la transcripción o los servicios a ofrecer."); return; }
    setError("");
    setHtmlGenerado("");
    setPaso("generando-contenido");
    try {
      const contenido = await generateText(
        buildContenidoPrompt({ transcripcion, nombreCliente, servicios, precio, notas }),
        SYSTEM_CONTENIDO, 4000
      );
      setPaso("generando-html");
      const html = await generateText(buildHtmlPrompt(contenido, nombreCliente), SYSTEM_HTML, 6000);
      const htmlLimpio = html.replace(/^```(?:html)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      setHtmlGenerado(htmlLimpio);
      setPaso("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setPaso("error");
    }
  }

  function resetear() { setPaso("idle"); setHtmlGenerado(""); setError(""); }

  function descargarHtml() {
    const blob = new Blob([htmlGenerado], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `propuesta-${nombreCliente.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function abrirEnPestana() {
    const blob = new Blob([htmlGenerado], { type: "text/html;charset=utf-8" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  const cargando = ["generando-contenido", "generando-html"].includes(paso);
  const PASO_LABELS: Record<string, string> = {
    "generando-contenido": "Redactando las 9 secciones de la propuesta...",
    "generando-html": "Maquetando la landing page con el branding de Mila Coco...",
  };
  const progresoPorcentaje = paso === "generando-contenido" ? 40 : paso === "generando-html" ? 80 : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-4 relative">

      {/* Yellow blob decoration — top right */}
      <div
        className="blob-yellow absolute -top-12 -right-20 w-64 h-64 pointer-events-none animate-float"
        style={{ opacity: 0.5, zIndex: 0 }}
      />

      {/* Doodle — small star/asterisk */}
      <div className="absolute -left-16 top-12 pointer-events-none opacity-20 hidden xl:block">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <line x1="24" y1="4"  x2="24" y2="44" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="4"  y1="24" x2="44" y2="24" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="10" y1="10" x2="38" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="38" y1="10" x2="10" y2="38" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="relative z-10 space-y-4">

        {/* Step indicators */}
        <div className="grid grid-cols-3 gap-3">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl p-4"
              style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
            >
              <span className="text-[10px] font-black tracking-widest" style={{ color: step.color }}>
                {step.number}
              </span>
              <p className="text-sm font-black mt-1" style={{ color: "#111111" }}>{step.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#AAAAAA" }}>{step.description}</p>
            </div>
          ))}
        </div>

        {/* Step 01: Cliente + precio */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#F8F7F4", borderBottom: "2px solid #111111" }}>
            <span
              className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
              style={{ background: "#2563FF", border: "1.5px solid #111111" }}
            >
              1
            </span>
            <span className="text-sm font-black" style={{ color: "#111111" }}>Cliente y presupuesto</span>
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#555555" }}>
                Nombre del cliente / empresa <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ej: Smarttek, Ana García, Inmobiliaria López..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ border: "2px solid #111111", color: "#222222", background: "#FFFFFF" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563FF")}
                onBlur={(e) => (e.target.style.borderColor = "#111111")}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#555555" }}>Precio / inversión</label>
              <input
                type="text"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej: 1.200€/mes, 3.500€..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ border: "2px solid #111111", color: "#222222", background: "#FFFFFF" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563FF")}
                onBlur={(e) => (e.target.style.borderColor = "#111111")}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5" style={{ color: "#555555" }}>Notas adicionales</label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Bonus, fecha límite, condiciones..."
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                style={{ border: "2px solid #111111", color: "#222222", background: "#FFFFFF" }}
                onFocus={(e) => (e.target.style.borderColor = "#2563FF")}
                onBlur={(e) => (e.target.style.borderColor = "#111111")}
              />
            </div>
          </div>
        </div>

        {/* Step 02: Servicios */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#F8F7F4", borderBottom: "2px solid #111111" }}>
            <span
              className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
              style={{ background: "#111111", border: "1.5px solid #111111" }}
            >
              2
            </span>
            <span className="text-sm font-black" style={{ color: "#111111" }}>Servicios a ofrecer</span>
          </div>
          <div className="p-5">
            <textarea
              value={servicios}
              onChange={(e) => setServicios(e.target.value)}
              placeholder="Lista los servicios, fases o acciones. Ej: Estrategia de contenido, gestión de redes, newsletter mensual..."
              rows={4}
              className="w-full text-sm resize-none focus:outline-none bg-white leading-relaxed"
              style={{ color: "#333333" }}
            />
          </div>
        </div>

        {/* Step 03: Transcripción */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
          <div className="flex items-center gap-2 px-5 py-3" style={{ background: "#F8F7F4", borderBottom: "2px solid #111111" }}>
            <span
              className="text-[10px] font-black w-5 h-5 rounded flex items-center justify-center text-white shrink-0"
              style={{ background: "#059669", border: "1.5px solid #111111" }}
            >
              3
            </span>
            <span className="text-sm font-black" style={{ color: "#111111" }}>Transcripción de la reunión</span>
            <span className="text-[11px] ml-auto" style={{ color: "#AAAAAA" }}>Cuanto más detalle, mejor propuesta</span>
          </div>
          <div className="p-5">
            <textarea
              value={transcripcion}
              onChange={(e) => setTranscripcion(e.target.value)}
              placeholder="Pega aquí la transcripción, el resumen de la llamada o los puntos clave que tratasteis..."
              rows={7}
              className="w-full text-sm resize-none focus:outline-none bg-white leading-relaxed"
              style={{ color: "#333333" }}
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "#FFF5F5", border: "2px solid #EF4444", color: "#C53030" }}>
            {error}
          </div>
        )}

        {/* Progress bar */}
        {cargando && (
          <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}>
            <div className="flex items-center gap-3 mb-3">
              <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" style={{ color: "#2563FF" }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-sm font-bold" style={{ color: "#333333" }}>{PASO_LABELS[paso] ?? "Procesando..."}</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "#F0EDE8", border: "1.5px solid #111111" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progresoPorcentaje}%`, background: "#2563FF" }}
              />
            </div>
          </div>
        )}

        {/* Generate button */}
        {!cargando && paso !== "listo" && (
          <button
            onClick={generarPresupuesto}
            disabled={cargando}
            className="w-full py-3.5 flex items-center justify-center gap-2.5 rounded-2xl text-sm font-black text-white transition-all"
            style={{ background: "#2563FF", border: "2px solid #111111", boxShadow: "3px 3px 0 #111111" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generar propuesta
          </button>
        )}

        {/* Result */}
        {paso === "listo" && htmlGenerado && (
          <div
            className="rounded-2xl overflow-hidden animate-fade-in-up"
            style={{ border: "2px solid #111111", boxShadow: "3px 3px 0 #FFD400" }}
          >
            <div className="px-5 py-4 flex items-center gap-3" style={{ background: "#F0FDF4", borderBottom: "2px solid #111111" }}>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "#22C55E", border: "1.5px solid #111111" }}
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: "#15803D" }}>Propuesta generada</p>
                <p className="text-xs" style={{ color: "#4ADE80" }}>Cmd+P → Guardar como PDF para enviar al cliente</p>
              </div>
            </div>
            <div className="px-5 py-4 flex gap-3" style={{ background: "#FFFFFF" }}>
              <button
                onClick={abrirEnPestana}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-black text-white transition-all"
                style={{ background: "#2563FF", border: "2px solid #111111", boxShadow: "2px 2px 0 #111111" }}
              >
                Abrir propuesta
              </button>
              <button
                onClick={descargarHtml}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-black transition-all"
                style={{ background: "#F8F7F4", color: "#111111", border: "2px solid #111111" }}
              >
                Descargar HTML
              </button>
            </div>
            <div className="px-5 pb-4" style={{ background: "#FFFFFF" }}>
              <button onClick={resetear} className="text-sm font-bold hover:underline" style={{ color: "#AAAAAA" }}>
                Generar otra propuesta
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

# mi-crm — Dashboard con IA

CRM interno con Next.js 14 + Tailwind CSS + Claude AI. Panel lateral con 5 módulos, cada uno pensado para el flujo de ventas de Mila Coco.

GitHub: https://github.com/hola591/mi-crm

## Stack

- **Next.js 14** App Router, TypeScript
- **Tailwind CSS** — light mode, colores blancos y grises
- **@anthropic-ai/sdk** — integración con Claude AI
- **Puerto local**: 3001 (para no chocar con la landing de Mila Coco en 3000)

## Archivos clave

| Archivo | Descripción |
|---------|-------------|
| `app/components/Dashboard.tsx` | Componente principal: sidebar + área de contenido. `"use client"` |
| `app/page.tsx` | Renderiza `<Dashboard />` |
| `app/layout.tsx` | Layout raíz, `lang="es"`, sin dark mode |
| `app/globals.css` | Light mode, fuente Inter |
| `app/api/generate/route.ts` | API route POST → llama a Claude server-side |
| `app/lib/claude.ts` | Helper cliente: `generateText(prompt, system?)` |
| `.env.local` | `ANTHROPIC_API_KEY=...` — nunca subir a git |
| `.claude/launch.json` | Configurado para `npm run dev` en puerto 3001 |

## Correr en local

```bash
cd "/Users/milacoco/Desktop/Claude Code/dashboard-app"
npm run dev   # arranca en http://localhost:3001
```

## Los 5 módulos del sidebar

| ID | Label | Estado |
|----|-------|--------|
| `prospeccion` | Prospección | En construcción |
| `form-personalizado` | Form Personalizado | En construcción |
| `ver-reuniones` | Ver Reuniones | En construcción |
| `preparador-reuniones` | Preparador de Reuniones | En construcción |
| `generador-presupuestos` | Generador de Presupuestos | En construcción |

Todos muestran placeholder por ahora. El área central cambia al hacer clic en el sidebar. El ítem activo tiene `bg-gray-900 text-white`.

## Integración Claude AI

### API route (server-side)
`POST /api/generate` — acepta `{ prompt, system? }`, devuelve `{ text }`.
Modelo: `claude-sonnet-4-6`. La API key se lee de `process.env.ANTHROPIC_API_KEY`.

### Helper cliente
```ts
import { generateText } from "@/app/lib/claude";
const result = await generateText("tu prompt aquí", "system prompt opcional");
```

Llamar desde cualquier componente. Maneja errores con `throw`.

## Diseño

- Fondo general: `bg-gray-50`
- Sidebar: `bg-white`, borde `border-gray-200`, ancho `w-64`
- Header top bar: `bg-white`, `h-16`
- Ítem activo: `bg-gray-900 text-white`
- Ítem hover: `hover:bg-gray-100 hover:text-gray-900`
- Tipografía: Inter (sans-serif), tamaños Tailwind estándar

## Reglas importantes

- **No modificar el copy** sin que la usuaria lo dicte explícitamente.
- **No exponer `ANTHROPIC_API_KEY`** en el cliente — siempre llamar a `/api/generate`.
- **No cambiar el puerto** — debe ser 3001.
- El modelo de Claude es siempre `claude-sonnet-4-6` salvo que la usuaria indique otro.
- El `.env.local` está en `.gitignore` — no añadirlo al repo nunca.

## npm con permisos

Si `npm install` falla por permisos de caché, usar:
```bash
npm_config_cache=/tmp/npm-cache npm install <paquete>
```

## Deploy

```bash
# Opción 1: arrastrar la carpeta a vercel.com/new
# Opción 2: CLI
npx vercel --prod
```

Añadir `ANTHROPIC_API_KEY` como variable de entorno en Vercel antes del deploy.

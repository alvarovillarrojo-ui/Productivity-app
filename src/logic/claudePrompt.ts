// The prompt for "Plan your 12 weeks with Claude". You copy it into Claude
// (claude.ai), Claude answers with a plan in the app's import format
// (docs/import_schema.md), and you paste that answer into Data → Import.
// The app itself never talks to Claude: copy and paste is the only link.
import type { ISODate } from '../data/types'

export interface PlanAnswers {
  start: ISODate
  goals: string
  hours: number | null
  commitments: string
}

/** A small, valid example plan shown to Claude so it copies the shape. */
const EXAMPLE = {
  schema_version: '1.0',
  cycle: { name: 'Cycle 1', start_date: '2026-11-30', length_weeks: 12 },
  goals: [
    {
      name: 'Grades',
      description: 'Average of 8+ in this term’s exams',
      weekly_hours_target: 15,
      weekly_hours_minimum: 10,
      tactics: [
        { name: 'Deep study block', description: 'Phone away, one subject', days: [1, 3, 5], time: '16:00', hours: 2, minimum: 'One 1-hour block' },
        { name: 'Past exam practice', description: '', days: [6], time: '10:00', hours: 3 },
        { name: 'Review notes', description: '', weekly_frequency: 2, minimum: '15 min' },
      ],
    },
  ],
}

const TEXTS = {
  en: {
    intro: 'I use a 12-week planning app based on “The 12 Week Year”. Help me create my 12-week plan and give it to me as a JSON file the app can import.',
    about: 'About me:',
    start: (d: string) => `- The cycle starts on ${d} (a Monday) and lasts 12 weeks.`,
    goals: (g: string) => `- What I want to achieve: ${g || '(not decided yet: help me choose)'}`,
    hours: (h: number | null) => `- Hours I can dedicate per week: ${h ?? '(not sure)'}`,
    fixed: (c: string) => `- Fixed commitments (classes, work…): ${c || '(none given)'}`,
    how: [
      'How to plan:',
      '1. If something important is missing, first ask me up to 3 short questions. Otherwise go straight to the plan.',
      '2. 1–3 goals, specific and measurable within these 12 weeks.',
      '3. For each goal, a weekly hours target and a minimum, realistic for the hours I have.',
      '4. For each goal, 2–4 tactics: concrete, repeatable actions fully in my control. Give each tactic its days ("days": 1 = Monday … 7 = Sunday), a start time ("time", "HH:MM") and a duration in hours ("hours"), avoiding my fixed commitments. Use "weekly_frequency" (1–14) instead only for tactics without a fixed day.',
      '5. Give each tactic a minimum version ("minimum"): the smallest version that still counts on a bad day (it scores ½).',
      '6. Explain the plan in 3–5 short lines, then give the JSON.',
    ],
    rules: [
      'JSON rules (the app checks them):',
      '- One ```json block, exactly this structure, no comments inside.',
      '- "schema_version": "1.0"',
      (d: string) => `- "cycle": { "name", "start_date": "${d}", "length_weeks": 12 }`,
      '- "goals": list of { "name", "description", "weekly_hours_target", "weekly_hours_minimum" (not above the target, or null), "tactics": [...] }',
      '- Each tactic: { "name", "description", "days", "time", "hours", "minimum" } or { "name", "description", "weekly_frequency", "minimum" }',
      '- Names must be unique. Don’t include "tasks": the app creates the weekly tasks from the tactics.',
      '- Write names and descriptions in English.',
    ],
    example: 'Example of the shape:',
  },
  es: {
    intro: 'Uso una app de planificación de 12 semanas basada en “The 12 Week Year”. Ayúdame a crear mi plan de 12 semanas y dámelo como un archivo JSON que la app pueda importar.',
    about: 'Sobre mí:',
    start: (d: string) => `- El ciclo empieza el ${d} (un lunes) y dura 12 semanas.`,
    goals: (g: string) => `- Lo que quiero conseguir: ${g || '(aún no lo tengo claro: ayúdame a elegir)'}`,
    hours: (h: number | null) => `- Horas que puedo dedicar por semana: ${h ?? '(no lo sé)'}`,
    fixed: (c: string) => `- Compromisos fijos (clases, trabajo…): ${c || '(ninguno indicado)'}`,
    how: [
      'Cómo planificar:',
      '1. Si falta algo importante, hazme primero hasta 3 preguntas cortas. Si no, ve directo al plan.',
      '2. 1–3 objetivos, concretos y medibles en estas 12 semanas.',
      '3. Para cada objetivo, horas semanales objetivo y un mínimo, realistas para las horas que tengo.',
      '4. Para cada objetivo, 2–4 tácticas: acciones concretas y repetibles que dependan solo de mí. Dale a cada táctica sus días ("days": 1 = lunes … 7 = domingo), una hora de inicio ("time", "HH:MM") y una duración en horas ("hours"), evitando mis compromisos fijos. Usa "weekly_frequency" (1–14) solo para tácticas sin día fijo.',
      '5. Dale a cada táctica una versión mínima ("minimum"): lo mínimo que sigue contando un mal día (puntúa ½).',
      '6. Explica el plan en 3–5 líneas cortas y después da el JSON.',
    ],
    rules: [
      'Reglas del JSON (la app las comprueba):',
      '- Un solo bloque ```json, exactamente con esta estructura, sin comentarios dentro.',
      '- "schema_version": "1.0"',
      (d: string) => `- "cycle": { "name", "start_date": "${d}", "length_weeks": 12 }`,
      '- "goals": lista de { "name", "description", "weekly_hours_target", "weekly_hours_minimum" (no mayor que el objetivo, o null), "tactics": [...] }',
      '- Cada táctica: { "name", "description", "days", "time", "hours", "minimum" } o { "name", "description", "weekly_frequency", "minimum" }',
      '- Los nombres no se repiten. No incluyas "tasks": la app crea las tareas semanales a partir de las tácticas.',
      '- Escribe los nombres y descripciones en español.',
    ],
    example: 'Ejemplo de la estructura:',
  },
}

export function buildClaudePrompt(a: PlanAnswers, lang: 'en' | 'es'): string {
  const t = TEXTS[lang]
  return [
    t.intro,
    '',
    t.about,
    t.start(a.start),
    t.goals(a.goals.trim()),
    t.hours(a.hours),
    t.fixed(a.commitments.trim()),
    '',
    ...t.how,
    '',
    ...t.rules.map((r) => (typeof r === 'function' ? r(a.start) : r)),
    '',
    t.example,
    '```json',
    JSON.stringify(EXAMPLE, null, 2),
    '```',
  ].join('\n')
}

/** The example is itself a valid import file (checked by a test). */
export const PROMPT_EXAMPLE = EXAMPLE

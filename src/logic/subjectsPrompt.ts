// The instructions for "Import subjects with Claude". You copy them into a
// new Claude chat together with your course guides (syllabi); Claude answers
// with a subjects file (logic/subjectsImport.ts) that you import in Data.
// The app itself never talks to Claude: copy and paste is the only link.
import type { ISODate } from '../data/types'
import { SUBJECTS_FORMAT, SUBJECTS_VERSION } from './subjectsImport'

/** A small, valid example file shown to Claude so it copies the shape. */
const EXAMPLE = {
  format: SUBJECTS_FORMAT,
  version: SUBJECTS_VERSION,
  subjects: [
    {
      name: 'Corporate Finance',
      info: 'Prof. Ana López (alopez@uni.edu) · Mon & Wed 9:00–10:30, room 2.04 · 6 ECTS\nGrading: midterm 30%, group project 30%, final 40% (min. 4/10 in the final)\nPending dates: participation 10% (no date)',
      weekly_hours_target: null,
      topics: [{ name: '1. Time value of money', notes: 'NPV, IRR, annuities' }, '2. Cost of capital (WACC)', '3. Capital structure'],
      exams: [
        { kind: 'midterm', title: 'Midterm', date: '2027-03-10', time: '09:00', weight: 30, notes: 'Topics 1–2, calculator allowed' },
        {
          kind: 'group',
          title: 'Valuation project',
          date: '2027-04-28',
          time: null,
          weight: 30,
          notes: 'Groups of 4. Final report due on this date',
          deliverables: [
            { title: 'Company choice', date: '2027-02-20', time: null },
            { title: 'Presentation', date: '2027-05-05', time: '09:00' },
          ],
        },
        { kind: 'final', title: 'Final exam', date: '2027-06-02', time: '16:00', weight: 40, notes: 'All topics' },
      ],
    },
  ],
}

const TEXTS = {
  en: {
    intro:
      'I use a study app that can import my subjects from a JSON file. I will give you my course guides (syllabi) and any other information about my subjects. Turn them into ONE JSON file the app can import.',
    today: (d: string) => `Today is ${d}. Dates without a year belong to the current academic year (ask me if it is not clear).`,
    what: [
      'For each subject, take from the guides:',
      '- "name": the subject’s name, short (no course codes).',
      '- "info": a short practical summary: professor(s) and email, class days/times and room, credits (ECTS), how it is graded, minimum grades and resit rules, attendance rules, main book. End with a line "Pending dates:" listing any graded item whose date is not known yet, with its weight.',
      '- "weekly_hours_target": null, unless I tell you how many hours a week I want to study it.',
      '- "topics": the units of the syllabus, in order, with short names (e.g. "3. Capital structure"). Optional "notes": the key sub-topics in one line.',
      '- "exams": every graded item that has a date:',
      '  - "kind": "quiz" (short tests), "midterm", "final", "assignment" (individual work to hand in), "project" (individual project), "group" (group work) or "other".',
      '  - "title": short (e.g. "Midterm", "Case 2"), "date": "YYYY-MM-DD", "time": "HH:MM" (24 h) or null, "weight": % of the final grade as a number (e.g. 30) or null, "notes": what it covers, format, materials allowed, minimum grade.',
      '  - A project or group work with several due dates is ONE item: its "date" is the final delivery, and the other dates go in "deliverables": [{ "title", "date", "time" }] (e.g. draft, presentation).',
    ],
    rules: [
      'Rules (the app checks them):',
      '- Never invent anything: no dates, weights, times or topics that are not in what I give you. If a graded item has no date, leave it out of "exams" and list it under "Pending dates" in "info" (I will add the date later).',
      '- Before the JSON, give me for each subject one line: topics found, graded items found, and whether the weights add up to 100%. Then list what is missing or unclear. If something important is unclear (e.g. the year of the dates), ask me first (up to 3 short questions).',
      `- Then give the JSON in a single \`\`\`json block, exactly this structure, no comments inside: "format": "${SUBJECTS_FORMAT}", "version": "${SUBJECTS_VERSION}", "subjects": [...]. All my subjects go in the same file.`,
      '- Each subject name only once. Write the texts in English.',
      '- At the end, remind me: save the JSON as a file (or copy it) and in the app go to Data → Import subjects.',
    ],
    example: 'Example of the shape (made-up data, only to show the structure):',
    attach: 'Here are my course guides / information:',
  },
  es: {
    intro:
      'Uso una app de estudio que puede importar mis asignaturas desde un archivo JSON. Te voy a dar mis guías docentes y cualquier otra información de mis asignaturas. Conviértelas en UN archivo JSON que la app pueda importar.',
    today: (d: string) => `Hoy es ${d}. Las fechas sin año son del curso académico actual (pregúntame si no está claro).`,
    what: [
      'Para cada asignatura, saca de las guías:',
      '- "name": el nombre de la asignatura, corto (sin códigos).',
      '- "info": un resumen práctico y corto: profesor(es) y email, días/horas de clase y aula, créditos (ECTS), cómo se evalúa, notas mínimas y reglas de la extraordinaria, reglas de asistencia, libro principal. Termina con una línea "Fechas pendientes:" con cada evaluación cuya fecha aún no se sepa, con su peso.',
      '- "weekly_hours_target": null, salvo que te diga cuántas horas a la semana quiero estudiarla.',
      '- "topics": los temas del programa, en orden, con nombres cortos (p. ej. "3. Estructura de capital"). "notes" opcional: los subtemas clave en una línea.',
      '- "exams": cada evaluación que tenga fecha:',
      '  - "kind": "quiz" (pruebas cortas), "midterm" (parcial), "final", "assignment" (entrega individual), "project" (proyecto individual), "group" (trabajo en grupo) u "other".',
      '  - "title": corto (p. ej. "Parcial", "Caso 2"), "date": "AAAA-MM-DD", "time": "HH:MM" (24 h) o null, "weight": % de la nota final como número (p. ej. 30) o null, "notes": qué entra, formato, material permitido, nota mínima.',
      '  - Un proyecto o trabajo en grupo con varias fechas es UNA sola evaluación: su "date" es la entrega final, y las otras fechas van en "deliverables": [{ "title", "date", "time" }] (p. ej. borrador, presentación).',
    ],
    rules: [
      'Reglas (la app las comprueba):',
      '- No te inventes nada: ni fechas, ni pesos, ni horas, ni temas que no estén en lo que te doy. Si una evaluación no tiene fecha, déjala fuera de "exams" y ponla en "Fechas pendientes" dentro de "info" (yo añadiré la fecha después).',
      '- Antes del JSON, dame para cada asignatura una línea: temas encontrados, evaluaciones encontradas y si los pesos suman 100 %. Después, lista lo que falta o no está claro. Si algo importante no está claro (p. ej. el año de las fechas), pregúntame primero (máximo 3 preguntas cortas).',
      `- Después da el JSON en un solo bloque \`\`\`json, exactamente con esta estructura, sin comentarios dentro: "format": "${SUBJECTS_FORMAT}", "version": "${SUBJECTS_VERSION}", "subjects": [...]. Todas mis asignaturas van en el mismo archivo.`,
      '- Cada nombre de asignatura una sola vez. Escribe los textos en español.',
      '- Al final, recuérdame: guarda el JSON como archivo (o cópialo) y en la app ve a Datos → Importar asignaturas.',
    ],
    example: 'Ejemplo de la estructura (datos inventados, solo para ver la forma):',
    attach: 'Aquí tienes mis guías docentes / información:',
  },
}

export function buildSubjectsPrompt(lang: 'en' | 'es', today: ISODate): string {
  const t = TEXTS[lang]
  return [
    t.intro,
    t.today(today),
    '',
    ...t.what,
    '',
    ...t.rules,
    '',
    t.example,
    '```json',
    JSON.stringify(EXAMPLE, null, 2),
    '```',
    '',
    t.attach,
  ].join('\n')
}

/** The example is itself a valid subjects file (checked by a test). */
export const SUBJECTS_EXAMPLE = EXAMPLE

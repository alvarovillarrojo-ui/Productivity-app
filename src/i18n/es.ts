// Textos en español. Debe tener exactamente las mismas claves que `en.ts`.
import type { Dict } from './en'

export const es: Dict = {
  appName: '12 Week Tracker',
  language: 'Idioma',

  nav: {
    home: 'Inicio',
    tasks: 'Tareas',
    goals: 'Objetivos',
    tracking: 'Seguimiento',
    data: 'Datos',
    about: 'Ayuda',
  },

  common: {
    back: 'Atrás',
    next: 'Siguiente',
    save: 'Guardar',
    cancel: 'Cancelar',
    edit: 'Editar',
    delete: 'Borrar',
    remove: 'Quitar',
    add: 'Añadir',
    loading: 'Cargando…',
    other: 'Otras',
    inactive: '(inactiva)',
    perWeek: '× / semana',
    timesPerWeek: 'Veces por semana',
    targetHours: 'Objetivo h/semana',
    minimumHours: 'Mínimo h/semana',
    minimumHoursOptional: 'Mínimo h/semana (opcional)',
    startNewCycle: 'Empezar nuevo ciclo',
    noActiveCycle: 'No hay ningún ciclo activo.',
    placeholder: (step: string) => `Esta pantalla se construye en ${step}.`,
  },

  storage: {
    local: 'Tus datos se quedan en este dispositivo. No se envía nada a ningún sitio.',
    granted: 'Almacenamiento: persistente ✓',
    notGranted:
      'Almacenamiento: no persistente. El navegador podría borrar datos si falta espacio; haz copias de seguridad.',
    unsupported:
      'Almacenamiento: este navegador no garantiza la persistencia; haz copias de seguridad con frecuencia.',
  },

  setup: {
    startOver: 'Empezar de nuevo',
    confirmStartOver: '¿Descartar todo lo introducido en el asistente y empezar de nuevo?',
    startCycle: 'Empezar ciclo',
    starting: 'Empezando…',
    defaultCycleName: (n: number) => `Ciclo ${n}`,
    steps: {
      welcome: { title: 'Bienvenida', hint: 'Configura tu primer ciclo de 12 semanas en unos minutos.' },
      review: {
        title: 'Revisar el último ciclo',
        hint: 'Mira cómo fue el último ciclo y elige qué conservar para el siguiente.',
      },
      vision: {
        title: 'Visión',
        hint: 'Opcional: la vida que quieres a largo plazo. Tus objetivos deberían acercarte a ella.',
      },
      cycle: {
        title: 'Ciclo',
        hint: 'Un ciclo es un "año" de 12 semanas: lo bastante corto para crear urgencia y lo bastante largo para lograr algo.',
      },
      goals: {
        title: 'Objetivos',
        hint: '¿Qué quieres conseguir en estas 12 semanas? Menos objetivos = más foco.',
      },
      tactics: {
        title: 'Tácticas',
        hint: 'Las acciones repetibles que hacen realidad cada objetivo. Tus tareas semanales saldrán de aquí.',
      },
      summary: { title: 'Resumen', hint: 'Revísalo todo y empieza el ciclo.' },
    },
    welcome: {
      line1: 'Planifica un ciclo de 12 semanas: pocos objetivos y las tácticas que los hacen realidad.',
      line2: 'Cada semana, apunta tus tareas y márcalas cada noche.',
      line3: 'Mira tu % de ejecución y tus horas, y apunta al 85 % o más.',
      privacy: '🔒 Tus datos se quedan en este dispositivo. Sin cuenta; no se envía nada.',
      start: 'Configurar mi primer ciclo',
      alreadyHaveData: '¿Ya tienes datos?',
      importFile: 'Importa un ciclo desde un archivo',
      or: 'o',
      restoreBackup: 'restaura una copia de seguridad',
    },
    review: {
      overall: 'de ejecución total',
      bestWorst: (best: number, bestPct: string, worst: number, worstPct: string) =>
        `Mejor semana: ${best} (${bestPct}) · Peor semana: ${worst} (${worstPct})`,
      noTasks: 'No hay tareas registradas en este ciclo.',
      willClose: 'Este ciclo se cerrará cuando pulses «Empezar ciclo» al final.',
      carryTitle: 'Pasar al nuevo ciclo',
      carryHint: 'Los objetivos y tácticas marcados se copian. Podrás editarlos en los pasos siguientes.',
      noGoals: 'El último ciclo no tenía objetivos.',
    },
    vision: {
      placeholder: 'Dentro de 3–5 años quiero… (puedes dejarlo vacío)',
      privacy: '🔒 Tu visión se queda en este dispositivo. Nunca se exporta salvo que tú lo elijas.',
    },
    cycle: {
      name: 'Nombre',
      startDate: 'Fecha de inicio (un lunes)',
      mustBeMonday: 'Los ciclos empiezan en lunes.',
      useDate: (date: string) => `Usar ${date}`,
      length: 'Duración en semanas',
      runs: (from: string, to: string) => `Del ${from} al ${to}.`,
      not12: ' (El método usa 12 semanas.)',
    },
    goals: {
      recommend: 'Recomendamos 1–3 objetivos.',
      goalN: (n: number) => `Objetivo ${n}`,
      placeholder: 'p. ej. Salud',
      removeGoalN: (n: number) => `Quitar objetivo ${n}`,
      addGoal: '+ Añadir objetivo',
    },
    tactics: {
      hint: 'Lo ideal son 2–4 tácticas por objetivo. «Veces por semana» es opcional: si lo pones, la pantalla de Tareas puede crear esas tareas cada semana por ti.',
      placeholder: 'p. ej. Correr 5 km',
      name: 'Nombre de la táctica',
      remove: 'Quitar táctica',
      addTactic: '+ Añadir táctica',
    },
    summary: {
      cycle: 'Ciclo',
      weeks: (n: number) => `${n} semanas`,
      vision: 'Visión',
      noVision: 'Sin visión escrita.',
      goalsAndTactics: 'Objetivos y tácticas',
      editTactics: 'Editar tácticas',
      target: (h: string) => `objetivo ${h} h/semana`,
      minimum: (h: string) => `mínimo ${h} h`,
      noTactics: 'Sin tácticas',
    },
    issue: (i): string => {
      const label = i.goal || (i.index !== undefined ? `Objetivo ${i.index + 1}` : '')
      switch (i.code) {
        case 'cycleName': return 'Ponle un nombre al ciclo.'
        case 'startDate': return 'Elige una fecha de inicio.'
        case 'notMonday': return 'La fecha de inicio debe ser un lunes.'
        case 'length': return 'La duración debe estar entre 1 y 52 semanas.'
        case 'noGoals': return 'Añade al menos un objetivo.'
        case 'goalName': return `${label}: ponle un nombre.`
        case 'goalTarget': return `${label}: indica un objetivo de horas semanales (0 vale).`
        case 'minAboveTarget': return `${label}: el mínimo no puede ser mayor que el objetivo.`
        case 'frequency': return `${label} → ${i.tactic}: la frecuencia debe ser un número entero de 1 a 14.`
        case 'tooManyGoals': return `Tienes ${i.count} objetivos. Menos objetivos suele significar mejor ejecución. Plantéate quedarte con 1–3.`
        case 'noTactics': return `«${label}» aún no tiene tácticas. Sus tareas no contarán para el % de ejecución hasta que tenga una.`
      }
    },
  },

  goalsScreen: {
    title: 'Objetivos',
    cycleName: 'Nombre del ciclo',
    start: 'Inicio (lunes)',
    weeks: 'Semanas',
    notes: 'Notas',
    showVision: 'Mostrar visión',
    hideVision: 'Ocultar visión',
    visionPlaceholder: 'Tu visión a largo plazo (privada, se queda en este dispositivo)',
    confirmStartChange:
      'Las tareas conservan su número de semana, así que cambiarán de fecha. ¿Cambiar la fecha de inicio igualmente?',
    newGoal: 'Nuevo objetivo',
    deleteGoal: 'Borrar objetivo',
    confirmDeleteGoal: (name: string) =>
      `¿Borrar el objetivo «${name}» y sus tácticas? Sus tareas se conservan como «Otras».`,
    goalName: 'Nombre del objetivo',
    description: 'Descripción del objetivo',
    descriptionPlaceholder: 'Descripción (opcional): ¿cómo es el éxito?',
    minAboveTarget: 'El mínimo es mayor que el objetivo.',
    tactics: 'Tácticas',
    name: 'Nombre',
    active: 'Activa',
    noTactics: 'Aún no hay tácticas.',
    newTactic: 'Nueva táctica',
    deleteTactic: (name: string) => `Borrar táctica ${name}`,
    confirmDeleteTactic: (name: string) =>
      `¿Borrar la táctica «${name}»? Sus tareas se conservan como «Otras». (Consejo: desmarca «Activa» para solo ocultarla.)`,
  },

  home: {
    weekOf: (w: number, n: number) => `Semana ${w} de ${n}`,
    daysLeft: (d: number) => (d === 1 ? 'último día de la semana' : `quedan ${d} días esta semana`),
    startsIn: (d: number) => `Empieza en ${d} día${d === 1 ? '' : 's'}`,
    cycleOver: 'Este ciclo ha terminado. Revísalo y empieza el siguiente.',
    today: 'Hoy',
    nothingToday: 'Nada planificado para hoy.',
    openThisWeek: 'Pendientes esta semana',
    allDone: 'No quedan tareas pendientes esta semana. 🎉',
    manage: 'Editar tareas →',
    execution: 'Ejecución esta semana',
    overall: 'Total',
    target: 'Objetivo 85 %',
    noGoals: 'Aún no hay objetivos.',
    hours: 'Horas esta semana',
    hoursOf: (actual: string, target: string) => `${actual} de ${target}`,
    minimum: (h: string) => `mín. ${h}`,
    other: (h: string) => `Otras: ${h}`,
    lastBackup: (when: string) => `Última copia: ${when}`,
    daysAgo: (d: number) => (d === 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`),
    neverBackedUp: 'Aún no hay copia de seguridad',
    backupNow: 'Hacer copia',
  },

  tracking: {
    title: 'Seguimiento',
    notStarted: (date: string) => `El ciclo empieza el ${date}. Tus números aparecerán aquí cuando empiece la semana 1.`,
    cycleSoFar: 'El ciclo hasta ahora',
    weeksSoFar: (n: number, total: number) => `semana ${n} de ${total}`,
    counts: (done: number, missed: number, open: number) =>
      `${done} hechas · ${missed} no hechas · ${open} pendientes`,
    countsHint: 'Los recuentos incluyen las tareas "Otras"; el % de ejecución no.',
    bestWorst: (best: number, bestPct: string, worst: number, worstPct: string) =>
      `Mejor semana: ${best} (${bestPct}) · Peor semana: ${worst} (${worstPct})`,
    chartTitle: '% de ejecución por semana',
    chartHint: 'Línea discontinua = objetivo del 85 %. Las semanas sin nada que contar aún no tienen punto.',
    overall: 'Total',
    target: 'Objetivo',
    weekShort: (n: number) => `S${n}`,
    weekLong: (n: number) => `Semana ${n}`,
    tableTitle: 'Semana a semana',
    week: 'Semana',
    done: 'Hechas',
    missed: 'No hechas',
    open: 'Pendientes',
    inProgress: 'en curso',
    hoursTitle: 'Horas por semana',
    hoursHint: 'Horas reales sobre el objetivo. Verde = objetivo cumplido, naranja = solo el mínimo, rojo = por debajo del mínimo.',
    totalFinished: (n: number) => `Total (${n} semana${n === 1 ? '' : 's'} terminada${n === 1 ? '' : 's'})`,
    other: 'Otras',
  },

  tasks: {
    title: 'Tareas',
    prevWeek: 'Semana anterior',
    nextWeek: 'Semana siguiente',
    week: 'Semana',
    weekOption: (n: number, date: string) => `Semana ${n} · ${date}`,
    current: ' (actual)',
    summary: (done: number, missed: number, open: number) =>
      `${done} hechas · ${missed} no hechas · ${open} pendientes · ejecución`,
    empty: 'Aún no hay tareas esta semana. Añade una arriba o genéralas a partir de tus tácticas.',
    generate: 'Generar tareas recurrentes',
    copyTo: (week: string) => `Copiar pendientes a la semana ${week}`,
    nothingToGenerate: 'Nada que añadir: ya existen todas las tareas recurrentes de esta semana.',
    generated: (n: number) => `${n} tarea${n === 1 ? '' : 's'} recurrente${n === 1 ? '' : 's'} añadida${n === 1 ? '' : 's'}.`,
    nothingToCopy: 'Nada que copiar: no hay tareas pendientes que no estén ya en la semana siguiente.',
    confirmCopy: (n: number, week: number) =>
      `¿Copiar ${n} tarea(s) pendiente(s) a la semana ${week}? Las originales se quedan aquí como no hechas.`,
    copied: (n: number, week: number) => `${n} tarea${n === 1 ? '' : 's'} copiada${n === 1 ? '' : 's'} a la semana ${week}.`,
    confirmDelete: (title: string) => `¿Borrar «${title}»?`,
    newPlaceholder: 'Nueva tarea… (Intro para añadir)',
    newTitle: 'Título de la nueva tarea',
    dateOptional: 'Fecha (opcional)',
    hoursOptional: 'Horas previstas (opcional)',
    dateInWeek: 'La fecha debe estar en esta semana.',
    otherNotCounted: 'Otras (no cuentan)',
    planned: 'previstas',
    markDone: (title: string) => `Marcar «${title}» como hecha`,
    markMissed: (title: string) => `Marcar «${title}» como no hecha`,
    doneUndo: 'Hecha (clic para deshacer)',
    missedUndo: 'No hecha (clic para deshacer)',
    deleteTask: (title: string) => `Borrar «${title}»`,
    edit: {
      title: 'Título',
      date: 'Fecha',
      plannedH: 'h previstas',
      actualH: 'h reales',
      notes: 'Notas',
      dateInWeek: 'La fecha debe estar dentro de esta semana.',
    },
  },
}

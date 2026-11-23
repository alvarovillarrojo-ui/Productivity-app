// Textos en español. Debe tener exactamente las mismas claves que `en.ts`.
import type { Dict } from './en'
import type { DataIssue } from '../logic/exchange'

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
      hint: 'Lo ideal son 2–4 tácticas por objetivo. «Veces por semana» es opcional: si lo pones, esas tareas se crean solas cada semana.',
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

  data: {
    title: 'Datos',
    intro: 'Todo se queda en este dispositivo. Haz copias de seguridad a menudo; exporta una semana para revisarla o compartirla.',
    backup: {
      title: 'Copia de seguridad',
      hint: 'Un archivo con todos tus ciclos, objetivos, tácticas y tareas. Guárdalo en un sitio seguro, p. ej. una carpeta sincronizada con la nube.',
      last: (when: string) => `Última copia: ${when}.`,
      never: 'Aún no hay copia de seguridad.',
      now: 'Hacer copia ahora',
      chooseFolder: 'Elegir carpeta de copias',
      changeFolder: 'Cambiar carpeta',
      folder: (name: string) => `Carpeta: ${name}`,
      download: 'Descargar copia',
      downloadInstead: 'Descargar una copia en su lugar',
      noFolderSupport: 'Este navegador no puede guardar en una carpeta elegida, así que la copia se descarga (normalmente en Descargas).',
      savedFolder: (file: string, folder: string) => `${file} guardado en «${folder}».`,
      downloaded: (file: string) => `${file} descargado.`,
      failed: (msg: string) => `La copia ha fallado: ${msg}`,
    },
    restore: {
      title: 'Restaurar una copia',
      hint: 'Sustituye TODOS los datos de la app por los de la copia. Si puedes necesitar lo que hay ahora, haz una copia antes.',
      choose: 'Elegir archivo de copia',
      contains: (c: number, g: number, t: number, k: number) =>
        `Esta copia tiene ${c} ciclo(s), ${g} objetivo(s), ${t} táctica(s) y ${k} tarea(s).`,
      madeOn: (date: string) => `Hecha el ${date}.`,
      button: 'Sustituir todos mis datos por esta copia',
      confirm: 'Esto borra todo lo que hay ahora en la app y lo sustituye por la copia. ¿Continuar?',
      done: 'Copia restaurada.',
      problems: 'Este archivo no se puede restaurar:',
    },
    export: {
      title: 'Exportar una semana',
      hint: 'Un informe de una semana: JSON (se puede volver a importar) y Markdown (fácil de leer o compartir). Tu visión no se incluye salvo que marques la casilla.',
      week: 'Semana',
      lastCompleted: ' (última terminada)',
      includeVision: 'Incluir mi visión (privada)',
      json: 'Descargar JSON',
      md: 'Descargar Markdown',
      downloaded: (file: string) => `${file} descargado.`,
    },
    import: {
      title: 'Importar',
      hint: 'Añade objetivos, tácticas y tareas desde un archivo JSON (esquema 1.0, ver docs/import_schema.md). Nunca se cambia ni se borra nada de lo que ya hay.',
      chooseFile: 'Elegir archivo JSON',
      paste: '…o pega el JSON aquí',
      check: 'Comprobar',
      clear: 'Borrar',
      into: (name: string) => `Se añade al ciclo activo «${name}».`,
      newCycle: (name: string, date: string, weeks: number) =>
        `Crea un ciclo nuevo «${name}»: ${weeks} semanas desde el ${date}.`,
      cycleIgnored: 'El archivo también describe un ciclo. Esa parte se ignora porque ya hay un ciclo activo.',
      newGoals: (names: string) => `Objetivos nuevos: ${names}`,
      newTactics: (names: string) => `Tácticas nuevas: ${names}`,
      tasks: (n: number) => `${n} tarea(s) para añadir.`,
      duplicates: (n: number) => `${n} tarea(s) ya existen y se saltarán.`,
      nothingNew: 'Nada nuevo: todo lo de este archivo ya está en la app.',
      button: 'Importar',
      done: 'Importado.',
      goHome: 'Ir a Inicio →',
      problems: 'Corrige estos problemas en el archivo y vuelve a comprobar:',
    },
    issue: (i: DataIssue): string => {
      const at = i.path ? `${i.path}: ` : ''
      switch (i.code) {
        case 'invalidJson': return `Esto no es JSON válido (${i.detail}).`
        case 'notObject': return `${at || 'El archivo '}debe ser un objeto { … }.`
        case 'version': return `schema_version «${i.detail}» desconocida. Esta app lee la versión «1.0».`
        case 'nothing': return 'El archivo no tiene ciclo, objetivos ni tareas.'
        case 'missingCycle': return 'No hay ningún ciclo activo, así que el archivo debe incluir un «cycle» (name, start_date, length_weeks).'
        case 'list': return `${at}debe ser una lista [ … ].`
        case 'required': return `${at}es obligatorio.`
        case 'text': return `${at}debe ser texto.`
        case 'number': return `${at}debe ser un número de horas (0 o más).`
        case 'boolean': return `${at}debe ser true o false.`
        case 'frequency': return `${at}debe ser un número entero del 1 al 14.`
        case 'length': return `${at}debe ser un número entero de semanas del 1 al 52.`
        case 'date': return `${at}«${i.detail}» no es una fecha válida (usa AAAA-MM-DD).`
        case 'monday': return `${at}${i.detail} no es lunes. Los ciclos empiezan en lunes.`
        case 'week': return `${at}debe ser un número de semana dentro del ciclo.`
        case 'dateOutsideWeek': return `${at}${i.detail} no está dentro de esa semana.`
        case 'status': return `${at}«${i.detail}» debe ser todo, done o missed.`
        case 'minAboveTarget': return `${at}el mínimo es mayor que el objetivo.`
        case 'duplicateName': return `${at}«${i.detail}» aparece dos veces.`
        case 'tacticNeedsGoal': return `${at}indica la táctica «${i.detail}» pero no su objetivo.`
        case 'unknownTactic': return `${at}«${i.detail}» no existe ni en el archivo ni en la app.`
        case 'notBackup': return 'Esto no es un archivo de copia. (Para añadir datos desde un archivo, usa Importar.)'
        case 'record': return `${at}falta o no es válido.`
        case 'link': return `${at}apunta a algo que no está en la copia.`
        case 'duplicateId': return `${at}usa un id que aparece dos veces.`
        case 'manyActive': return 'La copia tiene más de un ciclo activo.'
      }
    },
  },

  about: {
    title: 'Ayuda: cómo usarla',
    intro:
      'Un seguimiento personal para el método “12 Week Year”: en vez de objetivos anuales, planificas 12 semanas cada vez y compruebas cada semana si hiciste lo que habías planeado.',
    sections: [
      {
        title: 'La idea',
        items: [
          'Tus 12 semanas son tu “año”: lo bastante cortas para sentir urgencia y lo bastante largas para lograr algo de verdad.',
          'Elige 1–3 objetivos. Para cada uno, elige tácticas: acciones repetibles que dependen solo de ti (p. ej. “Bloque de estudio de 2 h”).',
          'Cada semana, convierte las tácticas en tareas y hazlas. Mide la ejecución (¿hice lo que planeé?), no solo los resultados. Los resultados llegan con la ejecución.',
          'Apunta a un 85 % de ejecución o más. No hace falta el 100 %, y suele significar que planificaste poco.',
        ],
      },
      {
        title: 'Cada día (2 minutos)',
        items: [
          'Mañana: abre Inicio y mira Hoy y lo que sigue pendiente esta semana.',
          'Noche: marca cada tarea ✓ hecha o ✗ no hecha. Las horas reales se copian de las previstas; cámbialas en Tareas si fueron distintas.',
        ],
      },
      {
        title: 'Cada semana (15 minutos, p. ej. el domingo)',
        items: [
          'Seguimiento: mira el % de ejecución y las horas de la semana. ¿Qué se interpuso?',
          'Tareas → semana siguiente: las tareas de tus tácticas ya están ahí (se crean solas según las “veces por semana” de cada táctica, desde el sábado). Añade las tareas puntuales.',
          '“Copiar pendientes” lleva a la semana siguiente las tareas que aún quieras hacer.',
          'Datos: haz una copia de seguridad. Si quieres, exporta la semana como informe.',
        ],
      },
      {
        title: 'Tras las 12 semanas',
        items: [
          'Objetivos → “Empezar nuevo ciclo”. El asistente muestra cómo fue el ciclo y te deja mantener objetivos y tácticas.',
        ],
      },
      {
        title: 'Cómo se calculan los números',
        items: [
          '% de ejecución = hechas ÷ (hechas + no hechas + pendientes cuya fecha ya pasó). Las tareas de hoy o posteriores aún no cuentan en tu contra. Al acabar la semana, toda tarea pendiente cuenta como no hecha.',
          'Las tareas sin táctica (“Otras”) se muestran pero no cuentan.',
          'El % del ciclo suma todas las tareas contadas; no es una media de los porcentajes semanales.',
          'Horas: horas reales por objetivo y semana frente a su objetivo. Verde = objetivo cumplido, naranja = solo el mínimo, rojo = por debajo.',
        ],
      },
      {
        title: 'Tus datos',
        items: [
          '🔒 Todo se queda en este navegador y en este dispositivo. Sin cuenta, no se envía nada a ningún sitio.',
          'Cada navegador y cada dispositivo tiene sus propios datos. Borrar los datos del sitio en el navegador los elimina.',
          'Haz una copia cada semana (Datos), mejor en una carpeta sincronizada con la nube. Para pasar a otro dispositivo, restaura allí esa copia.',
          'Consejo: instala la app (icono de instalar en la barra de direcciones) para abrirla en su propia ventana. Además hace más probable que el navegador conserve tus datos de forma permanente.',
        ],
      },
    ],
    version: (v: string) => `Versión ${v}`,
    license: 'Software libre (licencia MIT).',
    source: 'Código fuente',
  },

  report: {
    weekOf: (w: number, n: number) => `Semana ${w} de ${n}`,
    exported: (date: string) => `exportado el ${date}`,
    execution: 'Ejecución',
    goal: 'Objetivo',
    done: 'Hechas',
    counted: 'Contadas',
    overall: 'Total',
    targetNote: 'Ejecución = hechas ÷ (hechas + no hechas + vencidas). Objetivo: 85 %.',
    hours: 'Horas',
    actual: 'Reales',
    target: 'Objetivo',
    minimum: 'Mínimo',
    level: { target: '✓ objetivo', minimum: '~ solo mínimo', below: '✗ por debajo' },
    other: 'Otras',
    tasks: 'Tareas',
    planned: 'previstas',
    noTasks: 'No hay tareas esta semana.',
    vision: 'Visión',
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
    empty: 'Aún no hay tareas esta semana. Añade una arriba. Las tareas de tus tácticas aparecen solas cuando empieza la semana.',
    autoRecurring:
      'Las tareas de tus tácticas se crean solas cada semana (desde el sábado para la semana siguiente). Las que borres no vuelven; subir las “veces por semana” de una táctica añade las tareas que faltan.',
    copyTo: (week: string) => `Copiar pendientes a la semana ${week}`,
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

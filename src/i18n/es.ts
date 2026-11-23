// Textos en español. Debe tener exactamente las mismas claves que `en.ts`.
import type { Dict } from './en'
import type { DataIssue } from '../logic/exchange'

export const es: Dict = {
  appName: '12 Week Tracker',
  language: 'Idioma',

  nav: {
    home: 'Inicio',
    tasks: 'Tareas',
    calendar: 'Calendario',
    focus: 'Enfoque',
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
      withClaude: '¿Prefieres planificarlo con Claude?',
      withClaudeLink: 'Crea tu plan con Claude e impórtalo',
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
    schedule: {
      add: '🗓 Añadir horario (días y hora)',
      summary: (days: string, time: string, hours: number | null) =>
        `🗓 ${days}${time ? ` · ${time}` : ''}${hours ? ` · ${hours} h` : ''} (editar)`,
      hint: 'Sus tareas semanales van en estos días, a esta hora, y aparecen solas en el calendario. Veces por semana = número de días. Las tareas de esta semana sin colocar se colocan ahora; las ya colocadas no se mueven.',
      time: 'Hora',
      hours: 'Horas',
      remove: 'Quitar horario',
      needDay: 'Elige al menos un día.',
    },
    minimum: 'Versión mínima',
    color: 'Color',
    autoColor: 'Color automático',
    cycles: {
      title: 'Ciclos',
      hint: 'Todos tus ciclos: el activo y los anteriores, ya cerrados. Borrar un ciclo elimina para siempre sus objetivos, tácticas y tareas. Los hábitos y los eventos del calendario se mantienen.',
      status: { active: 'activo', closed: 'cerrado', planning: 'en preparación' },
      counts: (goals: number, tasks: number) => `${goals} objetivo(s) · ${tasks} tarea(s)`,
      delete: 'Borrar',
      confirmDelete: (name: string, goals: number, tasks: number, active: boolean) =>
        `¿Borrar el ciclo «${name}» con sus ${goals} objetivo(s) y ${tasks} tarea(s)?${active ? ' Es tu ciclo ACTIVO.' : ''}\n\nNo se puede deshacer (solo restaurando una copia de seguridad).`,
      backupFirst: 'Haz antes una copia de seguridad →',
    },
    minimumPlaceholder: '½ Versión mínima (opcional), p. ej. 20 min suave',
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
    counts: (done: number, partial: number, missed: number, open: number) =>
      `${done} hechas · ${partial} solo mínimo · ${missed} no hechas · ${open} pendientes`,
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
    partial: '½',
    missed: 'No hechas',
    open: 'Pendientes',
    inProgress: 'en curso',
    hoursTitle: 'Horas por semana',
    hoursHint: 'Horas reales sobre el objetivo. Verde = objetivo cumplido, naranja = solo el mínimo, rojo = por debajo del mínimo.',
    habitsFocusTitle: 'Hábitos y enfoque por semana',
    habitsFocusHint: 'Hábitos: días marcados ÷ días que tocaba (aparte del % de ejecución). Enfoque: tiempo del temporizador de Enfoque; pomodoros = rondas completas.',
    habitsCol: 'Hábitos',
    focusCol: 'Enfoque',
    pomodorosCol: 'Pomodoros',
    total: 'Total',
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
    claude: {
      title: 'Planifica tus 12 semanas con Claude',
      step1: 'Responde unas preguntas aquí (todas opcionales) y pulsa «Copiar prompt».',
      step2: 'Abre Claude (claude.ai), pégalo y coméntalo. Claude termina con el plan en un bloque JSON.',
      step3: 'Copia la respuesta entera de Claude y pégala en Importar, justo debajo. Verás una vista previa antes de guardar nada.',
      start: 'El ciclo empieza (un lunes)',
      hours: 'Horas por semana que puedes dedicar',
      goals: '¿Qué quieres conseguir en estas 12 semanas?',
      goalsPlaceholder: 'p. ej. buenas notas este cuatrimestre, conseguir unas prácticas de verano, leer más…',
      commitments: 'Compromisos fijos a tener en cuenta',
      commitmentsPlaceholder: 'p. ej. clases L–J 9:00–14:00, gimnasio martes y jueves por la tarde',
      copy: 'Copiar prompt',
      copied: '¡Copiado! Ahora pégalo en Claude.',
      open: 'Abrir Claude',
      show: 'Ver el prompt',
      copyByHand: 'Tu navegador ha bloqueado la copia: selecciona el texto de abajo y cópialo a mano.',
      privacy: 'La app nunca contacta con Claude ni con nadie: solo llega allí lo que tú copias y pegas.',
    },
    ics: {
      title: 'Importar un calendario (.ics)',
      hint: 'Añade tus clases, exámenes o reuniones desde Google Calendar, Outlook o el horario de tu universidad: exporta el calendario como archivo .ics y elígelo aquí. Las repeticiones semanales se mantienen. Importar el mismo archivo otra vez actualiza en vez de duplicar. Nada sale de este dispositivo.',
      choose: 'Elegir archivo .ics',
      from: 'Solo eventos desde',
      notIcs: 'Esto no parece un archivo de calendario (.ics).',
      found: (n: number, weekly: number) => `${n} evento(s) para importar${weekly ? `, ${weekly} se repiten cada semana` : ''}.`,
      allDay: 'todo el día',
      andMore: (n: number) => `…y ${n} más`,
      skippedBefore: (n: number) => `${n} evento(s) antiguos no se incluyen (anteriores a la fecha «desde»).`,
      repeatsSimplified: (n: number) => `${n} evento(s) se repiten de una forma que la app no admite (diaria, mensual, cada 2 semanas…): solo se importa su primera fecha.`,
      multiDay: (n: number) => `${n} evento(s) duran varios días: se muestran en su primer día.`,
      skippedOther: (n: number) => `${n} fecha(s) sueltas canceladas o movidas se ignoran.`,
      button: (n: number) => `Importar ${n} evento(s)`,
      done: (added: number, updated: number) => `Importado: ${added} nuevos, ${updated} actualizados.`,
      openCalendar: 'Abrir el calendario →',
    },
    import: {
      title: 'Importar',
      hint: 'Añade objetivos, tácticas y tareas desde un archivo JSON (esquema 1.0, ver docs/import_schema.md). Nunca se cambia ni se borra nada de lo que ya hay.',
      chooseFile: 'Elegir archivo JSON',
      paste: '…o pega el JSON aquí (también la respuesta entera de Claude)',
      check: 'Comprobar',
      clear: 'Borrar',
      into: (name: string) => `Se añade al ciclo activo «${name}».`,
      newCycle: (name: string, date: string, weeks: number) =>
        `Crea un ciclo nuevo «${name}»: ${weeks} semanas desde el ${date}.`,
      cycleIgnored: 'El archivo también describe un ciclo. Esa parte se ignora porque ya hay un ciclo activo.',
      startAsNew: 'Empezarlo como un ciclo nuevo',
      startAsNewHint: 'El ciclo actual se cerrará (queda en tu historial) y este plan pasa a ser el ciclo activo.',
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
        case 'days': return `${at}debe ser una lista de días, 1 = lunes … 7 = domingo (p. ej. [1, 3, 5]).`
        case 'length': return `${at}debe ser un número entero de semanas del 1 al 52.`
        case 'date': return `${at}«${i.detail}» no es una fecha válida (usa AAAA-MM-DD).`
        case 'time': return `${at}«${i.detail}» no es una hora válida (usa HH:MM, p. ej. 16:00).`
        case 'monday': return `${at}${i.detail} no es lunes. Los ciclos empiezan en lunes.`
        case 'week': return `${at}debe ser un número de semana dentro del ciclo.`
        case 'dateOutsideWeek': return `${at}${i.detail} no está dentro de esa semana.`
        case 'status': return `${at}«${i.detail}» debe ser todo, done, partial o missed.`
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
          'Mañana: abre Inicio y mira Hoy y lo que sigue pendiente esta semana. Marca los hábitos de hoy según los hagas.',
          'Durante el día: pulsa ▶ Enfoque en una tarea para trabajarla en pomodoros; cada ronda terminada suma su tiempo a la tarea.',
          'Noche: marca cada tarea ✓ hecha o ✗ no hecha. Las horas reales se copian de las previstas; cámbialas en Tareas si fueron distintas.',
        ],
      },
      {
        title: 'Cada semana (15 minutos, p. ej. el domingo)',
        items: [
          'Seguimiento: mira el % de ejecución y las horas de la semana. ¿Qué se interpuso?',
          'Tareas → semana siguiente: las tareas de tus tácticas ya están ahí (se crean solas según las “veces por semana” de cada táctica, desde el sábado). Añade las tareas puntuales.',
          'Calendario: añade tus clases y exámenes y coloca tus tareas en un día y una hora, para que cada una tenga su bloque.',
          '“Copiar pendientes” lleva a la semana siguiente las tareas que aún quieras hacer.',
          'Datos: haz una copia de seguridad. Si quieres, exporta la semana como informe.',
        ],
      },
      {
        title: 'Calendario, enfoque y hábitos',
        items: [
          'Calendario: vista semanal con horas y vista mensual. Pulsa un hueco libre para añadir un evento (puede repetirse cada semana) o colocar una tarea; pulsa un bloque para moverlo o marcarlo.',
          'Enfoque: 25 minutos de concentración y 5 de descanso (15 cada 4 rondas). El temporizador sigue en otras pantallas. Si paras antes, se guardan los minutos hechos.',
          'Hábitos (Tareas → Hábitos): pequeñas acciones diarias al estilo de Hábitos Atómicos (identidad, un plan claro, una versión de 2 minutos, una recompensa) agrupadas según los 7 hábitos de la gente altamente efectiva. Nunca falles dos veces.',
          'Horario de tácticas (Objetivos → una táctica → 🗓): ponle días, hora y duración, y sus tareas semanales aparecen solas en el calendario.',
          'Tus clases y exámenes: expórtalos desde Google Calendar, Outlook o tu universidad como archivo .ics e impórtalo en Datos.',
          'Planifica con Claude (Datos): responde unas preguntas, copia el prompt en Claude y pega su respuesta en Importar.',
          'Los hábitos y el enfoque tienen sus propios números en Seguimiento; no cambian tu % de ejecución de las 12 semanas.',
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
          '% de ejecución = (hechas + ½ × versión mínima) ÷ (hechas + versión mínima + no hechas + pendientes cuya fecha ya pasó). Usa ½ cuando solo hiciste la versión mínima de una táctica (se define en Objetivos). Las tareas de hoy o posteriores aún no cuentan en tu contra. Al acabar la semana, toda tarea pendiente cuenta como no hecha.',
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
    targetNote: 'Ejecución = (hechas + ½ × solo mínimo) ÷ (hechas + solo mínimo + no hechas + vencidas). Objetivo: 85 %. Columna Hechas: puntos (un ½ cuenta la mitad).',
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

  calendar: {
    title: 'Calendario',
    week: 'Semana',
    month: 'Mes',
    today: 'Hoy',
    prev: 'Anterior',
    next: 'Siguiente',
    allDay: 'Todo el día',
    unscheduled: (n: number) => `Aún sin poner en el calendario (${n})`,
    unscheduledHint: 'Pulsa una tarea para darle día y hora, o pulsa un hueco libre del calendario.',
    allPlaced: 'Todas las tareas de esta semana están en el calendario.',
    outsideCycle: 'Esta semana está fuera de tu ciclo actual: solo se ven los eventos.',
    clickSlot: 'Pulsa un hueco libre para añadir un evento o colocar una tarea.',
    eventsLegend: 'Eventos (color a tu elección)',
    changeColors: 'Cambiar colores de objetivos →',
    color: 'Color',
    autoColor: 'Automático (gris)',
    importIcs: 'Importar un calendario (.ics) →',
    more: (n: number) => `+${n} más`,
    newAt: (when: string) => `Nuevo · ${when}`,
    newEvent: 'Nuevo evento',
    placeTask: 'Colocar una tarea',
    chooseTask: '¿Qué tarea?',
    noTasksToPlace: 'No quedan tareas por colocar esta semana.',
    editEvent: 'Evento',
    titleField: 'Título',
    eventPlaceholder: 'p. ej. clase de Finanzas Corporativas, examen, reunión',
    date: 'Fecha',
    start: 'Inicio',
    end: 'Fin',
    duration: 'Duración (h)',
    allDayCheck: 'Todo el día',
    repeatWeekly: 'Repetir cada semana',
    until: 'Hasta (opcional)',
    notes: 'Notas',
    repeatsNote: 'Se repite cada semana: los cambios se aplican a todas las semanas.',
    confirmDeleteEvent: (title: string) => `¿Borrar el evento «${title}»?`,
    unschedule: 'Quitar del calendario',
    openInTasks: 'Abrir en Tareas',
    endBeforeStart: 'El fin debe ser posterior al inicio.',
    needTitle: 'Ponle un título.',
  },

  focus: {
    title: 'Enfoque',
    intro:
      'Elige una tarea y trabájala en pomodoros: 25 minutos de concentración y un descanso corto. Cada ronda terminada suma sus minutos a las horas reales de la tarea.',
    task: 'Tarea',
    freeFocus: 'Sin tarea (enfoque libre)',
    phase: { focus: 'Enfoque', short: 'Descanso corto', long: 'Descanso largo', ready: 'Listo' },
    start: '▶ Empezar',
    startNext: '▶ Siguiente pomodoro',
    pause: 'Pausar',
    resume: 'Continuar',
    stopSave: (m: number) => `Parar y guardar ${m} min`,
    discard: 'Descartar',
    skipBreak: 'Saltar descanso',
    endBreak: 'Parar',
    round: (n: number) => `Pomodoro ${n}`,
    finished: (m: number, title: string) =>
      title ? `¡Pomodoro terminado! +${m} min sumados a «${title}».` : `¡Pomodoro terminado! ${m} min de enfoque.`,
    markDone: '¿Marcar la tarea como hecha?',
    yesDone: 'Sí, está hecha',
    notYet: 'Todavía no',
    breakTip: 'Descanso: levántate, bebe agua, aparta la vista de la pantalla.',
    saved: (m: number) => (m > 0 ? `${m} min guardados.` : 'No se guardó nada (menos de un minuto).'),
    discarded: 'Descartado: no se guardó nada.',
    today: 'Enfoque de hoy',
    noSessions: 'Aún no hay sesiones de enfoque hoy.',
    totals: (today: string, week: string) => `Hoy ${today} · esta semana ${week}`,
    early: 'parado antes',
    free: 'Enfoque libre',
    settings: 'Duraciones (minutos)',
    focusLen: 'Enfoque',
    shortLen: 'Descanso corto',
    longLen: 'Descanso largo',
    longEvery: 'Descanso largo cada … rondas',
    open: (title: string) => `Enfocarse en «${title}»`,
    badge: (clock: string, phase: string) => `⏱ ${clock} · ${phase}`,
  },

  habits: {
    tabWeek: 'Tareas de la semana',
    tabHabits: 'Hábitos',
    intro:
      'Pequeñas acciones diarias que quieres volver automáticas (Hábitos Atómicos). Tienen su propia puntuación y no cambian tu % de ejecución de las 12 semanas.',
    empty: 'Aún no hay hábitos. Elige una idea de abajo o crea el tuyo.',
    newHabit: '+ Nuevo hábito',
    editHabit: 'Editar hábito',
    pause: 'Pausar',
    resume: 'Reanudar',
    paused: 'En pausa',
    confirmDelete: (name: string) => `¿Borrar el hábito «${name}» y todas sus marcas?`,
    streak: (n: number) => `🔥 ${n} día${n === 1 ? '' : 's'}`,
    weekPct: (pct: string) => `${pct} esta semana`,
    neverMissTwice: 'La última vez fallaste: ¡nunca falles dos veces!',
    notPlanned: 'No toca este día',
    markDay: (name: string, day: string) => `Marcar «${name}» el ${day}`,
    today: 'Hábitos de hoy',
    noneToday: 'Hoy no toca ningún hábito.',
    manage: 'Hábitos →',
    form: {
      name: 'Hábito',
      namePlaceholder: 'p. ej. Leer 10 páginas',
      category: 'Categoría de los 7 hábitos',
      days: 'Días',
      everyDay: 'Todos los días',
      weekdays: 'Lun–Vie',
      identity: 'Identidad: ¿quién quieres llegar a ser?',
      identityPlaceholder: 'Soy alguien que… (p. ej. lee cada día)',
      law1: '1 · Hazlo obvio',
      intention: 'Plan: haré [hábito] a las [hora] en [lugar]',
      intentionPlaceholder: 'Leeré 10 páginas a las 22:30 en la cama',
      stack: 'Encadenar hábitos: Después de [hábito actual], haré [hábito nuevo]',
      stackPlaceholder: 'Después de lavarme los dientes por la noche, leeré',
      law2: '2 · Hazlo atractivo',
      attractive: 'Combínalo con algo que te guste',
      attractivePlaceholder: 'Solo con una taza de té',
      law3: '3 · Hazlo fácil',
      twoMinute: 'La versión de 2 minutos',
      twoMinutePlaceholder: 'Leer 1 página',
      law4: '4 · Hazlo satisfactorio',
      reward: 'Recompensa',
      rewardPlaceholder: 'Marcarlo y ver crecer la racha',
      required: 'Ponle nombre al hábito y elige al menos un día.',
    },
    suggestionsTitle: 'Ideas por categoría (Los 7 hábitos de la gente altamente efectiva)',
    suggestionsHint: 'Pulsa una idea para crear un hábito a partir de ella; puedes cambiarlo todo.',
    categories: {
      proactive: { name: 'Sé proactivo', hint: 'Hazte responsable; céntrate en lo que puedes controlar.' },
      end_in_mind: { name: 'Empieza con un fin en mente', hint: 'Sabe adónde vas: visión, objetivos, valores.' },
      first_things: { name: 'Primero lo primero', hint: 'Lo importante antes que lo urgente; protege tus prioridades.' },
      win_win: { name: 'Piensa en ganar-ganar', hint: 'Busca el beneficio de todos en tus relaciones.' },
      understand: { name: 'Busca primero entender', hint: 'Escucha para entender antes de querer ser entendido.' },
      synergize: { name: 'Sinergiza', hint: 'Trabaja con otros; suma fortalezas.' },
      saw: { name: 'Afila la sierra', hint: 'Renuévate: cuerpo, mente, corazón y espíritu.' },
    },
    suggestions: {
      proactive: [
        { name: 'Planificar mañana esta noche', two_minute: 'Escribir las 3 prioridades de mañana', intention: 'Planificaré mañana a las 21:30 en mi escritorio' },
        { name: 'Escribir qué controlo hoy', two_minute: 'Escribir una cosa que controlo', intention: 'Lo escribiré en el desayuno' },
      ],
      end_in_mind: [
        { name: 'Leer mi visión y objetivos', two_minute: 'Leer mis objetivos una vez', intention: 'Los leeré a las 8:00 con el café' },
        { name: 'Revisión semanal', two_minute: 'Abrir Seguimiento y mirar la semana', intention: 'Revisaré mi semana el domingo a las 18:00' },
      ],
      first_things: [
        { name: 'La tarea más importante, primero', two_minute: 'Empezarla durante 2 minutos', intention: 'La empezaré a las 9:00 antes de mirar mensajes' },
        { name: 'Móvil en otra habitación al estudiar', two_minute: 'Apartar el móvil durante un bloque', intention: 'Dejaré el móvil en la entrada al empezar cada bloque de estudio' },
      ],
      win_win: [
        { name: 'Ayudar a un compañero', two_minute: 'Enviar un mensaje útil', intention: 'Lo haré después de comer' },
        { name: 'Dar las gracias de forma concreta', two_minute: 'Enviar un agradecimiento', intention: 'Lo haré al final del día' },
      ],
      understand: [
        { name: 'Escuchar y resumir antes de responder', two_minute: 'Resumir una vez en una conversación', intention: 'Lo haré en mi primera conversación del día' },
        { name: 'Preguntar por el punto de vista del otro', two_minute: 'Hacer una pregunta abierta', intention: 'Lo haré en reuniones y clases' },
      ],
      synergize: [
        { name: 'Sesión de estudio con un compañero', two_minute: 'Escribir a un compañero para quedar', intention: 'Quedaré con un compañero el jueves a las 17:00 en la biblioteca' },
        { name: 'Compartir una idea y construir sobre las de otros', two_minute: 'Compartir una idea', intention: 'Compartiré una idea en cada reunión de grupo' },
      ],
      saw: [
        { name: 'Hacer ejercicio 20 minutos', two_minute: 'Ponerme las zapatillas', intention: 'Haré ejercicio a las 7:30 en el parque' },
        { name: 'Leer 10 páginas', two_minute: 'Leer 1 página', intention: 'Leeré a las 22:30 en la cama' },
        { name: 'Llamar a un amigo o familiar', two_minute: 'Enviar un audio', intention: 'Llamaré de camino a casa' },
        { name: 'Escribir un diario 5 minutos', two_minute: 'Escribir una frase', intention: 'Escribiré a las 22:00 en mi escritorio' },
      ],
    },
  },

  tasks: {
    title: 'Tareas',
    prevWeek: 'Semana anterior',
    nextWeek: 'Semana siguiente',
    week: 'Semana',
    weekOption: (n: number, date: string) => `Semana ${n} · ${date}`,
    current: ' (actual)',
    summary: (done: number, partial: number, missed: number, open: number) =>
      `${done} hechas · ${partial} ½ · ${missed} no hechas · ${open} pendientes · ejecución`,
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
    markPartial: (title: string, minimum: string | null) =>
      `Solo la versión mínima de «${title}»${minimum ? ` (${minimum})` : ''}: cuenta ½`,
    partialUndo: 'Versión mínima: cuenta ½ (pulsa para deshacer)',
    deleteTask: (title: string) => `Borrar «${title}»`,
    edit: {
      title: 'Título',
      date: 'Fecha',
      startTime: 'Hora',
      plannedH: 'h previstas',
      actualH: 'h reales',
      notes: 'Notas',
      dateInWeek: 'La fecha debe estar dentro de esta semana.',
    },
  },
}

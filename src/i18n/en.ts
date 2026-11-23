// English texts. This file defines the STRUCTURE of all texts; `es.ts` must
// have exactly the same keys (TypeScript checks this), so nothing can be left
// untranslated by accident.
//
// Texts with changing parts are small functions, e.g. weekN(3) → "Week 3".
import type { DraftIssue } from '../screens/setup/draft'
import type { DataIssue } from '../logic/exchange'

export const en = {
  appName: '12 Week Tracker',
  language: 'Language',

  nav: {
    home: 'Home',
    tasks: 'Tasks',
    goals: 'Goals',
    tracking: 'Tracking',
    data: 'Data',
    about: 'About',
  },

  common: {
    back: 'Back',
    next: 'Next',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    remove: 'Remove',
    add: 'Add',
    loading: 'Loading…',
    other: 'Other',
    inactive: '(inactive)',
    perWeek: '× / week',
    timesPerWeek: 'Times per week',
    targetHours: 'Target h/week',
    minimumHours: 'Minimum h/week',
    minimumHoursOptional: 'Minimum h/week (optional)',
    startNewCycle: 'Start new cycle',
    noActiveCycle: 'There is no active cycle.',
  },

  storage: {
    local: 'Your data stays on this device. Nothing is sent anywhere.',
    granted: 'Storage: persistent ✓',
    notGranted: 'Storage: not persistent. The browser may clear data when disk is low, so back up regularly.',
    unsupported: 'Storage: this browser cannot guarantee persistence, so back up regularly.',
  },

  setup: {
    startOver: 'Start over',
    confirmStartOver: 'Discard everything entered in this wizard and start again?',
    startCycle: 'Start cycle',
    starting: 'Starting…',
    defaultCycleName: (n: number) => `Cycle ${n}`,
    steps: {
      welcome: { title: 'Welcome', hint: 'Set up your first 12-week cycle in a few minutes.' },
      review: {
        title: 'Review last cycle',
        hint: 'See how the last cycle went and choose what to keep for the next one.',
      },
      vision: {
        title: 'Vision',
        hint: 'Optional: the long-term life you want. Your goals should move you towards it.',
      },
      cycle: {
        title: 'Cycle',
        hint: 'A cycle is a 12-week "year": short enough to create urgency, long enough to achieve something.',
      },
      goals: {
        title: 'Goals',
        hint: 'What do you want to achieve in these 12 weeks? Fewer goals = more focus.',
      },
      tactics: {
        title: 'Tactics',
        hint: 'The repeatable actions that make each goal happen. Your weekly tasks will come from these.',
      },
      summary: { title: 'Summary', hint: 'Check everything, then start the cycle.' },
    },
    welcome: {
      line1: 'Plan a 12-week cycle: a few goals, and the tactics that make them happen.',
      line2: 'Each week, list your tasks and tick them off every evening.',
      line3: 'See your execution % and hours, and aim for 85% or more.',
      privacy: '🔒 Your data stays on this device. No account, nothing is sent anywhere.',
      start: 'Set up my first cycle',
      alreadyHaveData: 'Already have data?',
      importFile: 'Import a cycle from file',
      or: 'or',
      restoreBackup: 'restore from backup',
    },
    review: {
      overall: 'overall execution',
      bestWorst: (best: number, bestPct: string, worst: number, worstPct: string) =>
        `Best week: ${best} (${bestPct}) · Worst week: ${worst} (${worstPct})`,
      noTasks: 'No tracked tasks in this cycle.',
      willClose: 'This cycle will be closed when you press “Start cycle” at the end.',
      carryTitle: 'Carry over to the new cycle',
      carryHint: 'Ticked goals and tactics are copied. You can still edit them in the next steps.',
      noGoals: 'The last cycle had no goals.',
    },
    vision: {
      placeholder: 'In 3–5 years I want to… (you can leave this empty)',
      privacy: '🔒 Your vision stays on this device. It is never included in exports unless you choose to.',
    },
    cycle: {
      name: 'Name',
      startDate: 'Start date (a Monday)',
      mustBeMonday: 'Cycles start on a Monday.',
      useDate: (date: string) => `Use ${date}`,
      length: 'Length in weeks',
      runs: (from: string, to: string) => `Runs from ${from} to ${to}.`,
      not12: ' (The method uses 12 weeks.)',
    },
    goals: {
      recommend: 'We recommend 1–3 goals.',
      goalN: (n: number) => `Goal ${n}`,
      placeholder: 'e.g. Fitness',
      removeGoalN: (n: number) => `Remove goal ${n}`,
      addGoal: '+ Add goal',
    },
    tactics: {
      hint: '2–4 tactics per goal works best. “Times per week” is optional: with it, that many tasks are created for you automatically every week.',
      placeholder: 'e.g. Run 5 km',
      name: 'Tactic name',
      remove: 'Remove tactic',
      addTactic: '+ Add tactic',
    },
    summary: {
      cycle: 'Cycle',
      weeks: (n: number) => `${n} weeks`,
      vision: 'Vision',
      noVision: 'No vision written.',
      goalsAndTactics: 'Goals and tactics',
      editTactics: 'Edit tactics',
      target: (h: string) => `target ${h} h/week`,
      minimum: (h: string) => `minimum ${h} h`,
      noTactics: 'No tactics',
    },
    issue: (i: DraftIssue): string => {
      const label = i.goal || (i.index !== undefined ? `Goal ${i.index + 1}` : '')
      switch (i.code) {
        case 'cycleName': return 'Give the cycle a name.'
        case 'startDate': return 'Choose a start date.'
        case 'notMonday': return 'The start date must be a Monday.'
        case 'length': return 'Length must be between 1 and 52 weeks.'
        case 'noGoals': return 'Add at least one goal.'
        case 'goalName': return `${label}: give it a name.`
        case 'goalTarget': return `${label}: set a weekly hours target (0 is allowed).`
        case 'minAboveTarget': return `${label}: the minimum can't be higher than the target.`
        case 'frequency': return `${label} → ${i.tactic}: frequency must be a whole number from 1 to 14.`
        case 'tooManyGoals': return `You have ${i.count} goals. Fewer goals usually means better execution. Consider keeping 1–3.`
        case 'noTactics': return `"${label}" has no tactics yet. Its tasks can't count towards execution % until it has one.`
      }
    },
  },

  goalsScreen: {
    title: 'Goals',
    cycleName: 'Cycle name',
    start: 'Start (Monday)',
    weeks: 'Weeks',
    notes: 'Notes',
    showVision: 'Show vision',
    hideVision: 'Hide vision',
    visionPlaceholder: 'Your long-term vision (private, stays on this device)',
    confirmStartChange:
      'Tasks keep their week number, so they will move to different dates. Change the start date anyway?',
    newGoal: 'New goal',
    deleteGoal: 'Delete goal',
    confirmDeleteGoal: (name: string) => `Delete goal "${name}" and its tactics? Its tasks are kept as "Other".`,
    goalName: 'Goal name',
    description: 'Goal description',
    descriptionPlaceholder: 'Description (optional): what does success look like?',
    minAboveTarget: 'The minimum is higher than the target.',
    tactics: 'Tactics',
    name: 'Name',
    active: 'Active',
    noTactics: 'No tactics yet.',
    newTactic: 'New tactic',
    deleteTactic: (name: string) => `Delete tactic ${name}`,
    confirmDeleteTactic: (name: string) =>
      `Delete tactic "${name}"? Its tasks are kept as "Other". (Tip: untick "Active" to just hide it.)`,
  },

  home: {
    weekOf: (w: number, n: number) => `Week ${w} of ${n}`,
    daysLeft: (d: number) => (d === 1 ? 'last day of the week' : `${d} days left this week`),
    startsIn: (d: number) => `Starts in ${d} day${d === 1 ? '' : 's'}`,
    cycleOver: 'This cycle has ended. Review it and start the next one.',
    today: 'Today',
    nothingToday: 'Nothing planned for today.',
    openThisWeek: 'Still open this week',
    allDone: 'No open tasks left this week. 🎉',
    manage: 'Edit tasks →',
    execution: 'Execution this week',
    overall: 'Overall',
    target: 'Target 85%',
    noGoals: 'No goals yet.',
    hours: 'Hours this week',
    hoursOf: (actual: string, target: string) => `${actual} of ${target}`,
    minimum: (h: string) => `min ${h}`,
    other: (h: string) => `Other: ${h}`,
    lastBackup: (when: string) => `Last backup: ${when}`,
    daysAgo: (d: number) => (d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`),
    neverBackedUp: 'No backup yet',
    backupNow: 'Back up now',
  },

  tracking: {
    title: 'Tracking',
    notStarted: (date: string) => `The cycle starts on ${date}. Your numbers will appear here once week 1 begins.`,
    cycleSoFar: 'Cycle so far',
    weeksSoFar: (n: number, total: number) => `week ${n} of ${total}`,
    counts: (done: number, missed: number, open: number) => `${done} done · ${missed} missed · ${open} open`,
    countsHint: 'Counts include "Other" tasks; execution % does not.',
    bestWorst: (best: number, bestPct: string, worst: number, worstPct: string) =>
      `Best week: ${best} (${bestPct}) · Worst week: ${worst} (${worstPct})`,
    chartTitle: 'Execution % per week',
    chartHint: 'Dashed line = 85% target. Weeks with nothing to count yet show no point.',
    overall: 'Overall',
    target: 'Target',
    weekShort: (n: number) => `W${n}`,
    weekLong: (n: number) => `Week ${n}`,
    tableTitle: 'Week by week',
    week: 'Week',
    done: 'Done',
    missed: 'Missed',
    open: 'Open',
    inProgress: 'in progress',
    hoursTitle: 'Hours per week',
    hoursHint: 'Actual hours of target. Green = target reached, orange = only the minimum, red = below the minimum.',
    totalFinished: (n: number) => `Total (${n} finished week${n === 1 ? '' : 's'})`,
    other: 'Other',
  },

  data: {
    title: 'Data',
    intro: 'Everything stays on this device. Back up regularly to keep it safe; export a week to review or share it.',
    backup: {
      title: 'Backup',
      hint: 'One file with all your cycles, goals, tactics and tasks. Keep it somewhere safe, e.g. a folder synced to the cloud.',
      last: (when: string) => `Last backup: ${when}.`,
      never: 'No backup yet.',
      now: 'Back up now',
      chooseFolder: 'Choose backup folder',
      changeFolder: 'Change folder',
      folder: (name: string) => `Folder: ${name}`,
      download: 'Download backup',
      downloadInstead: 'Download a copy instead',
      noFolderSupport: 'This browser can’t save to a chosen folder, so the backup is downloaded (usually to Downloads).',
      savedFolder: (file: string, folder: string) => `Saved ${file} in “${folder}”.`,
      downloaded: (file: string) => `Downloaded ${file}.`,
      failed: (msg: string) => `Backup failed: ${msg}`,
    },
    restore: {
      title: 'Restore from backup',
      hint: 'Replaces ALL data in the app with the backup. If you might need what is here now, back it up first.',
      choose: 'Choose backup file',
      contains: (c: number, g: number, t: number, k: number) =>
        `This backup has ${c} cycle(s), ${g} goal(s), ${t} tactic(s) and ${k} task(s).`,
      madeOn: (date: string) => `Made on ${date}.`,
      button: 'Replace all my data with this backup',
      confirm: 'This deletes everything currently in the app and replaces it with the backup. Continue?',
      done: 'Backup restored.',
      problems: 'This file can’t be restored:',
    },
    export: {
      title: 'Export a week',
      hint: 'A report of one week: JSON (can be imported again) and Markdown (easy to read or share). Your vision is left out unless you tick the box.',
      week: 'Week',
      lastCompleted: ' (last completed)',
      includeVision: 'Include my vision (private)',
      json: 'Download JSON',
      md: 'Download Markdown',
      downloaded: (file: string) => `Downloaded ${file}.`,
    },
    import: {
      title: 'Import',
      hint: 'Add goals, tactics and tasks from a JSON file (schema 1.0, see docs/import_schema.md). Existing data is never changed or deleted.',
      chooseFile: 'Choose JSON file',
      paste: '…or paste JSON here',
      check: 'Check',
      clear: 'Clear',
      into: (name: string) => `Goes into the active cycle “${name}”.`,
      newCycle: (name: string, date: string, weeks: number) =>
        `Creates a new cycle “${name}”: ${weeks} weeks from ${date}.`,
      cycleIgnored: 'The file also describes a cycle. That part is ignored, because a cycle is already active.',
      newGoals: (names: string) => `New goals: ${names}`,
      newTactics: (names: string) => `New tactics: ${names}`,
      tasks: (n: number) => `${n} task(s) to add.`,
      duplicates: (n: number) => `${n} task(s) already exist and will be skipped.`,
      nothingNew: 'Nothing new: everything in this file is already in the app.',
      button: 'Import',
      done: 'Imported.',
      goHome: 'Go to Home →',
      problems: 'Fix these problems in the file, then check again:',
    },
    issue: (i: DataIssue): string => {
      const at = i.path ? `${i.path}: ` : ''
      switch (i.code) {
        case 'invalidJson': return `This is not valid JSON (${i.detail}).`
        case 'notObject': return `${at || 'The file '}should be an object { … }.`
        case 'version': return `Unknown schema_version “${i.detail}”. This app reads version “1.0”.`
        case 'nothing': return 'The file has no cycle, goals or tasks.'
        case 'missingCycle': return 'There is no active cycle, so the file must include a “cycle” (name, start_date, length_weeks).'
        case 'list': return `${at}should be a list [ … ].`
        case 'required': return `${at}is required.`
        case 'text': return `${at}should be text.`
        case 'number': return `${at}should be a number of hours (0 or more).`
        case 'boolean': return `${at}should be true or false.`
        case 'frequency': return `${at}should be a whole number from 1 to 14.`
        case 'length': return `${at}should be a whole number of weeks from 1 to 52.`
        case 'date': return `${at}“${i.detail}” is not a valid date (use YYYY-MM-DD).`
        case 'monday': return `${at}${i.detail} is not a Monday. Cycles start on a Monday.`
        case 'week': return `${at}should be a week number inside the cycle.`
        case 'dateOutsideWeek': return `${at}${i.detail} is not inside that week.`
        case 'status': return `${at}“${i.detail}” should be todo, done or missed.`
        case 'minAboveTarget': return `${at}the minimum is higher than the target.`
        case 'duplicateName': return `${at}“${i.detail}” appears twice.`
        case 'tacticNeedsGoal': return `${at}names tactic “${i.detail}” but not its goal.`
        case 'unknownTactic': return `${at}“${i.detail}” doesn’t exist in the file or in the app.`
        case 'notBackup': return 'This is not a backup file. (To add data from a file, use Import.)'
        case 'record': return `${at}missing or invalid.`
        case 'link': return `${at}points to something that isn’t in the backup.`
        case 'duplicateId': return `${at}uses an id that appears twice.`
        case 'manyActive': return 'The backup has more than one active cycle.'
      }
    },
  },

  about: {
    title: 'About & how to use',
    intro:
      'A personal tracker for the “12 Week Year” method: instead of yearly goals, you plan 12 weeks at a time and check every week whether you did what you planned.',
    sections: [
      {
        title: 'The idea',
        items: [
          'Your 12 weeks are your “year”: short enough to feel urgent, long enough to achieve something real.',
          'Choose 1–3 goals. For each goal, choose tactics: repeatable actions that are fully in your control (e.g. “Study block of 2 h”).',
          'Each week, turn tactics into tasks and do them. Measure execution (did I do what I planned?), not only results. Results follow execution.',
          'Aim for 85% execution or more. 100% isn’t needed, and usually means you planned too little.',
        ],
      },
      {
        title: 'Every day (2 minutes)',
        items: [
          'Morning: open Home and look at Today and what is still open this week.',
          'Evening: tick each task ✓ done or ✗ missed. Actual hours are copied from the planned hours; change them in Tasks if they were different.',
        ],
      },
      {
        title: 'Every week (15 minutes, e.g. on Sunday)',
        items: [
          'Tracking: look at the week’s execution % and hours. What got in the way?',
          'Tasks → next week: your tactics’ tasks are already there (they are created automatically from each tactic’s “times per week”, from Saturday on). Add any one-off tasks.',
          '“Copy unfinished” takes the tasks you still want to do into the next week.',
          'Data: make a backup. If you like, export the week as a report.',
        ],
      },
      {
        title: 'After 12 weeks',
        items: [
          'Goals → “Start new cycle”. The wizard shows how the cycle went and lets you carry goals and tactics over.',
        ],
      },
      {
        title: 'How the numbers work',
        items: [
          'Execution % = done ÷ (done + missed + open tasks whose date has passed). Tasks for today or later don’t count against you yet. When the week ends, every open task counts as not done.',
          'Tasks without a tactic (“Other”) are shown but don’t count.',
          'The cycle % adds up all counted tasks; it isn’t an average of the weekly percentages.',
          'Hours: actual hours per goal per week against its target. Green = target reached, orange = only the minimum, red = below.',
        ],
      },
      {
        title: 'Your data',
        items: [
          '🔒 Everything stays in this browser on this device. No account, nothing is sent anywhere.',
          'Each browser and each device has its own separate data. Clearing the browser’s site data deletes it.',
          'Back up every week (Data), ideally into a folder synced to the cloud. To move to another device, restore that backup there.',
          'Tip: install the app (the install icon in the address bar) to open it in its own window. It also makes the browser more likely to keep your data permanently.',
        ],
      },
    ],
    version: (v: string) => `Version ${v}`,
    license: 'Free software (MIT licence).',
    source: 'Source code',
  },

  // Texts inside the exported Markdown week report.
  report: {
    weekOf: (w: number, n: number) => `Week ${w} of ${n}`,
    exported: (date: string) => `exported ${date}`,
    execution: 'Execution',
    goal: 'Goal',
    done: 'Done',
    counted: 'Counted',
    overall: 'Overall',
    targetNote: 'Execution = done ÷ (done + missed + overdue). Target: 85%.',
    hours: 'Hours',
    actual: 'Actual',
    target: 'Target',
    minimum: 'Minimum',
    level: { target: '✓ target', minimum: '~ minimum only', below: '✗ below' },
    other: 'Other',
    tasks: 'Tasks',
    planned: 'planned',
    noTasks: 'No tasks this week.',
    vision: 'Vision',
  },

  tasks: {
    title: 'Tasks',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    week: 'Week',
    weekOption: (n: number, date: string) => `Week ${n} · ${date}`,
    current: ' (current)',
    summary: (done: number, missed: number, open: number) =>
      `${done} done · ${missed} missed · ${open} open · execution`,
    empty: 'No tasks this week yet. Add one above. Tasks from your tactics appear automatically when the week starts.',
    autoRecurring:
      'Your tactics’ tasks are created automatically every week (from Saturday for the next week). Deleted ones don’t come back; raising a tactic’s “times per week” adds the extra tasks.',
    copyTo: (week: string) => `Copy unfinished to week ${week}`,
    nothingToCopy: 'Nothing to copy: no open tasks that aren’t already in next week.',
    confirmCopy: (n: number, week: number) =>
      `Copy ${n} unfinished task(s) to week ${week}? The originals stay here as not done.`,
    copied: (n: number, week: number) => `Copied ${n} task${n === 1 ? '' : 's'} to week ${week}.`,
    confirmDelete: (title: string) => `Delete "${title}"?`,
    newPlaceholder: 'New task… (Enter to add)',
    newTitle: 'New task title',
    dateOptional: 'Date (optional)',
    hoursOptional: 'Planned hours (optional)',
    dateInWeek: 'Date must be in this week.',
    otherNotCounted: 'Other (not counted)',
    planned: 'planned',
    markDone: (title: string) => `Mark "${title}" done`,
    markMissed: (title: string) => `Mark "${title}" missed`,
    doneUndo: 'Done (click to undo)',
    missedUndo: 'Missed (click to undo)',
    deleteTask: (title: string) => `Delete "${title}"`,
    edit: {
      title: 'Title',
      date: 'Date',
      plannedH: 'Planned h',
      actualH: 'Actual h',
      notes: 'Notes',
      dateInWeek: 'The date must be inside this week.',
    },
  },
}

export type Dict = typeof en

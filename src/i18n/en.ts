// English texts. This file defines the STRUCTURE of all texts; `es.ts` must
// have exactly the same keys (TypeScript checks this), so nothing can be left
// untranslated by accident.
//
// Texts with changing parts are small functions, e.g. weekN(3) → "Week 3".
import type { DraftIssue } from '../screens/setup/draft'

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
    placeholder: (step: string) => `This screen is built in ${step}.`,
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
      hint: '2–4 tactics per goal works best. “Times per week” is optional: with it, the Tasks screen can create that many tasks each week for you.',
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

  tasks: {
    title: 'Tasks',
    prevWeek: 'Previous week',
    nextWeek: 'Next week',
    week: 'Week',
    weekOption: (n: number, date: string) => `Week ${n} · ${date}`,
    current: ' (current)',
    summary: (done: number, missed: number, open: number) =>
      `${done} done · ${missed} missed · ${open} open · execution`,
    empty: 'No tasks this week yet. Add one above, or generate them from your tactics.',
    generate: 'Generate recurring tasks',
    copyTo: (week: string) => `Copy unfinished to week ${week}`,
    nothingToGenerate: 'Nothing to add: all recurring tasks already exist this week.',
    generated: (n: number) => `Added ${n} recurring task${n === 1 ? '' : 's'}.`,
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

import { type Outage, type Task } from "./Data"

/** Repeating outages are created this many years ahead (or until their end date, if sooner) */
export const RECURRENCE_HORIZON_YEARS = 5

/** Safety cap so a tiny interval can't create thousands of outages */
const MAX_OCCURRENCES = 60

/** Quick-pick intervals shown in the Add outage form (typical refueling / maintenance cycles) */
export const COMMON_INTERVALS_MONTHS = [12, 18, 24]

/** Formats a Date as "YYYY-MM-DD" in local time */
function toDateString(date: Date): string {
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-")
}

/** Parses "YYYY-MM-DD" as a local date (so it never shifts a day because of time zones) */
function fromDateString(date: string): Date {
    const [year, month, day] = date.split("-").map(Number)
    return new Date(year, month - 1, day)
}

/** Adds days to a "YYYY-MM-DD" date (negative to go back) */
export function addDays(date: string, days: number): string {
    const result = fromDateString(date)
    result.setDate(result.getDate() + days)
    return toDateString(result)
}

/**
 * Adds months to a "YYYY-MM-DD" date. If the day doesn't exist in the target month it uses the
 * last day of that month (e.g. Jan 31 + 1 month = Feb 28/29), instead of spilling into the next month.
 */
export function addMonths(date: string, months: number): string {
    const [year, month, day] = date.split("-").map(Number)
    const target = new Date(year, month - 1 + months, 1)
    const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
    target.setDate(Math.min(day, lastDay))
    return toDateString(target)
}

/** Whole days between two "YYYY-MM-DD" dates */
function daysBetween(from: string, to: string): number {
    return Math.round((fromDateString(to).getTime() - fromDateString(from).getTime()) / 86_400_000)
}

/**
 * Start/end dates for every occurrence of a repeating outage.
 * The first occurrence is the one entered; later ones are `everyMonths` apart (counted from the first,
 * so dates don't drift), each lasting the same number of days. Stops at `until` or the 5-year horizon.
 * @param start First occurrence's start date ("YYYY-MM-DD")
 * @param end First occurrence's end date
 * @param everyMonths Months between starts
 * @param until Last allowed start date, or null for "never" (limited by the horizon)
 * @param today Today's date, used for the horizon
 */
export function outageOccurrences(start: string, end: string, everyMonths: number, until: string | null, today: string): { start: string, end: string }[] {
    const lengthDays = daysBetween(start, end)
    const horizon = addMonths(today, RECURRENCE_HORIZON_YEARS * 12)
    const lastStart = until && until < horizon ? until : horizon

    const occurrences: { start: string, end: string }[] = []
    for (let i = 0; i < MAX_OCCURRENCES; i++) {
        const occurrenceStart = addMonths(start, i * everyMonths)
        if (i > 0 && occurrenceStart > lastStart) break
        occurrences.push({ start: occurrenceStart, end: addDays(occurrenceStart, lengthDays) })
    }
    return occurrences
}

/** One task in the standard outage checklist, due a number of days before the start or after the end */
type TaskTemplate = {
    key: string,
    title: string,
    category: string,
    relativeTo: "start" | "end",
    days: number,
    description: string,
}

/** Tasks created automatically for every outage */
export const STANDARD_OUTAGE_TASKS: TaskTemplate[] = [
    { key: "order-parts", title: "Order parts", category: "Procurement", relativeTo: "start", days: -84,
        description: "Review the outage's TADs and order any parts that need to be bought (see each TAD's inventory)." },
    { key: "confirm-contractor", title: "Confirm contractor schedule", category: "Scheduling", relativeTo: "start", days: -42,
        description: "Confirm crews, contractors and equipment for the outage dates." },
    { key: "review-bill-of-sale", title: "Review bill of materials", category: "Documentation", relativeTo: "start", days: -14,
        description: "Review the bill of materials for this outage." },
    { key: "walkdown", title: "Pre-outage walkdown", category: "Inspection", relativeTo: "start", days: -7,
        description: "Walk down the equipment covered by this outage and confirm the scope." },
    { key: "service-report", title: "Submit service report", category: "Documentation", relativeTo: "end", days: 7,
        description: "Submit the service report for this outage." },
]

/** Describes when a template task is due, e.g. "12 weeks before" or "1 week after" */
export function describeTaskTiming(template: TaskTemplate): string {
    const weeks = Math.abs(template.days) / 7
    const amount = Number.isInteger(weeks) ? `${weeks} week${weeks === 1 ? "" : "s"}` : `${Math.abs(template.days)} days`
    return template.relativeTo === "start" ? `${amount} before` : `${amount} after`
}

/** "Oct 2026" for task titles */
function monthYear(date: string): string {
    return fromDateString(date).toLocaleDateString(undefined, { month: "short", year: "numeric" })
}

function buildOutageTask(outage: Outage, template: TaskTemplate, completed = false): Task {
    const anchor = template.relativeTo === "start" ? outage.start : outage.end
    return {
        id: `${outage.id}-${template.key}`,
        outageId: outage.id,
        title: `${template.title} for ${monthYear(outage.start)} outage`,
        completed,
        plant: outage.plant,
        assignee: undefined,
        dueDate: addDays(anchor, template.days),
        category: template.category,
        description: `${template.description}\n\n${outage.type} outage: ${outage.start} to ${outage.end}.\n${outage.description}`,
    }
}

/** Bill-of-sale and service-report tasks for an existing outage */
export function buildOutageFollowUpTasks(outage: Outage, today: string): Task[] {
    return STANDARD_OUTAGE_TASKS
        .filter(template => template.key === "review-bill-of-sale" || template.key === "service-report")
        .map(template => {
            const task = buildOutageTask(outage, template)
            task.completed = template.key === "review-bill-of-sale" && task.dueDate < today
            return task
        })
}

/**
 * The standard checklist tasks for one outage. Tasks that would already be past due are skipped
 * (e.g. "Order parts" for an outage that starts next week).
 * @param outage The outage the tasks are for (must have an id)
 * @param today Today's date ("YYYY-MM-DD")
 */
export function buildOutageTasks(outage: Outage, today: string): Task[] {
    return STANDARD_OUTAGE_TASKS
        .map(template => buildOutageTask(outage, template))
        .filter(task => task.dueDate >= today)
}

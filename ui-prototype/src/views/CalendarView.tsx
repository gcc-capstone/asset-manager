import { App } from '../components/Components'
import db, { type Outage, type Task } from '../data/Data'
import { useState } from 'react'
import { FlagIcon } from '../components/OutageFlag'

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** One outage's bar within one week of the calendar */
type OutageBar = {
    outage: Outage,
    /* Column (0 = Sunday) the bar starts in, and how many days it covers this week */
    startColumn: number,
    span: number,
    /* Row the bar sits in, so overlapping outages stack instead of covering each other */
    lane: number,
    /* True when the outage started before this week / carries on into the next week */
    continuesBefore: boolean,
    continuesAfter: boolean,
}

/**
 * Lays out the outages that touch one week as bars: each covers its days in the week, and bars that
 * overlap go in separate lanes (earliest-starting outage on top).
 * @param weekKeys The week's seven dates as "YYYY-MM-DD"
 */
function outageBarsForWeek(outages: Outage[], weekKeys: string[]): { bars: OutageBar[], laneCount: number } {
    const weekStart = weekKeys[0];
    const weekEnd = weekKeys[6];
    const inWeek = outages
        .filter(outage => outage.start <= weekEnd && outage.end >= weekStart)
        .sort((a, b) => a.start.localeCompare(b.start) || b.end.localeCompare(a.end));

    /* laneEnds[i] = last column used in lane i */
    const laneEnds: number[] = [];
    const bars = inWeek.map(outage => {
        const startColumn = outage.start < weekStart ? 0 : weekKeys.indexOf(outage.start);
        const endColumn = outage.end > weekEnd ? 6 : weekKeys.indexOf(outage.end);
        let lane = laneEnds.findIndex(lastColumn => lastColumn < startColumn);
        if (lane === -1) lane = laneEnds.length;
        laneEnds[lane] = endColumn;
        return {
            outage,
            startColumn,
            span: endColumn - startColumn + 1,
            lane,
            continuesBefore: outage.start < weekStart,
            continuesAfter: outage.end > weekEnd,
        };
    });
    return { bars, laneCount: laneEnds.length };
}

function CalendarView({
    outages,
    onTaskClick,
    onOutageClick,
    onFilterTasksByOutage,
}: {
    outages: Outage[],
    onTaskClick: (task: Task) => void,
    onOutageClick: (outage: Outage) => void,
    onFilterTasksByOutage: (outage: Outage) => void,
}): React.JSX.Element {

    const currentDate: Date = new Date();
    const [viewedMonth, setViewedMonth] = useState(() =>
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    );
    const year: number = viewedMonth.getFullYear();
    const month: number = viewedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    const daysGrid = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return {
            date,
            dayNumber: date.getDate(),
            isCurrentMonth: date.getMonth() === month && date.getFullYear() === year,
            dateKey: dateKey(date),
        };
    });

    /* Six weeks of seven days, each with its outage bars laid out in lanes */
    const weeks = Array.from({ length: 6 }, (_, weekIndex) => {
        const days = daysGrid.slice(weekIndex * 7, weekIndex * 7 + 7);
        return { days, ...outageBarsForWeek(outages, days.map(day => day.dateKey)) };
    });

    const tasksByDate = new Map<string, Task[]>();
    for (const task of db.tasks) {
        const tasksForDate = tasksByDate.get(task.dueDate) ?? [];
        tasksForDate.push(task);
        tasksByDate.set(task.dueDate, tasksForDate);
    }

    const weekdays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayKey = dateKey(currentDate);

    return <div className="flex min-w-0 flex-1 flex-col no-select">
        <div className="flex min-w-0 flex-col items-center">
            <div className="flex items-center justify-center">
                <App.Button.LeftArrow
                    onClick={() => setViewedMonth(new Date(year, month - 1, 1))}
                />
                <App.Title text={viewedMonth.toLocaleString('default', { month: 'long' }) + " " + year} />
                <App.Button.RightArrow
                    onClick={() => setViewedMonth(new Date(year, month + 1, 1))}
                />
            </div>

            <div aria-label={viewedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                className="flex w-full flex-col gap-px overflow-hidden border border-brand-blue bg-brand-blue">
                <div className="grid grid-cols-7 gap-x-px" aria-hidden="true">
                    {weekdays.map(day =>
                        <div key={day}
                            className="flex items-center justify-center bg-main-background-2 py-1 text-sm font-semibold text-brand-blue sm:py-2 sm:text-base">
                            {day}
                        </div>)}
                </div>

                {weeks.map(week =>
                    /* One week: the day backgrounds fill every row; row 1 = day numbers, then one row per outage lane, then tasks */
                    <div key={week.days[0].dateKey}
                        className="calendar-week grid min-h-16 grid-cols-7 gap-x-px sm:min-h-28"
                        style={{ gridTemplateRows: `auto ${'auto '.repeat(week.laneCount)}1fr` }}>
                        {week.days.map((item, column) =>
                            <div key={`bg-${item.dateKey}`} aria-hidden="true"
                                style={{ gridColumn: column + 1, gridRow: '1 / -1' }}
                                className={item.isCurrentMonth
                                    ? item.dateKey === todayKey ? "bg-brand-light-green" : "bg-main-background-2"
                                    : "bg-brand-light-blue"} />)}

                        {week.days.map((item, column) =>
                            <span key={`day-${item.dateKey}`}
                                style={{ gridColumn: column + 1, gridRow: 1 }}
                                className={`z-[1] px-1 pt-1 text-sm font-bold sm:px-2 sm:pt-2 sm:text-lg ${item.isCurrentMonth ? "text-brand-blue" : "text-gray-400"}`}>
                                <span aria-hidden="true">{item.dayNumber}</span>
                                <span className="sr-only">{item.date.toLocaleDateString(undefined, { dateStyle: 'full' })}</span>
                            </span>)}

                        {/* Outages: one continuous bar from start to end (split at the end of each week) */}
                        {week.bars.map(bar => {
                            const { outage } = bar;
                            return <div
                                key={`${outage.id ?? `${outage.plant}-${outage.start}-${outage.description}`}-${week.days[0].dateKey}`}
                                style={{ gridColumn: `${bar.startColumn + 1} / span ${bar.span}`, gridRow: bar.lane + 2 }}
                                className={`calendar-outage-bar z-[1] my-0.5 flex h-5 min-w-0 items-center gap-1 px-1 text-[11px] font-medium leading-none
                                    ${outage.type === "Major"
                                        ? "bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-100"
                                        : "bg-slate-200 text-slate-800 dark:bg-white/10 dark:text-slate-200"}
                                    ${bar.continuesBefore ? "" : "ml-1 rounded-l-full"} ${bar.continuesAfter ? "" : "mr-1 rounded-r-full"}
                                    `}
                            >
                                {bar.continuesBefore && <span aria-hidden="true" className="opacity-60">‹</span>}
                                <button
                                    type="button"
                                    aria-label={`Filter tasks associated with ${outage.plant}: ${outage.description}`}
                                    title="Show tasks associated with this outage"
                                    onClick={() => onFilterTasksByOutage(outage)}
                                    className="flex h-full shrink-0 items-center rounded-sm bg-amber-200/80 px-0.5 text-amber-700 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-blue [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-amber-700"
                                >
                                    <App.Icon.MagnifyingGlass />
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Open outage details: ${outage.plant}, ${outage.description}${outage.flag ? `, flagged: ${outage.flag}` : ''}`}
                                    title={`${outage.plant}: ${outage.description}\n${outage.start} to ${outage.end} (${outage.type})${outage.flag ? `\nFlag: ${outage.flag}` : ''}`}
                                    onClick={() => onOutageClick(outage)}
                                    className="flex h-full min-w-0 flex-1 items-center gap-1 text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green"
                                >
                                    {/* Flag: just the icon; hovering it shows the flag text */}
                                    {outage.flag &&
                                        <span className="group/flag relative inline-flex shrink-0 text-amber-500 dark:text-amber-300">
                                            <FlagIcon className="h-3 w-3" />
                                            <span role="tooltip"
                                                className="pointer-events-none absolute bottom-full left-0 z-20 mb-1.5 hidden whitespace-nowrap rounded-md border border-line bg-main-background px-2 py-1 text-xs font-semibold text-text shadow-lg group-hover/flag:block">
                                                <span className="text-amber-500 dark:text-amber-300">Flag:</span> {outage.flag}
                                            </span>
                                        </span>}
                                    <span className="truncate text-[11px] font-medium sm:text-xs"><b className="font-semibold">{outage.plant}</b> · {outage.description}</span>
                                    {bar.continuesAfter && <span aria-hidden="true" className="ml-auto pl-1 opacity-60">›</span>}
                                </button>
                            </div>
                        })}

                        {/* Tasks due that day */}
                        {week.days.map((item, column) =>
                            <div key={`tasks-${item.dateKey}`}
                                style={{ gridColumn: column + 1, gridRow: week.laneCount + 2 }}
                                className="z-[1] flex min-w-0 flex-col gap-1 px-1 pb-1 pt-1 sm:px-2 sm:pb-2">
                                {(tasksByDate.get(item.dateKey) ?? []).map((task) =>
                                    <button
                                        key={task.id ?? task.title}
                                        type="button"
                                        aria-label={`Open task details for ${task.title}`}
                                        onClick={() => onTaskClick(task)}
                                        className="flex w-full shrink-0 cursor-pointer items-start gap-1 text-left hover:outline hover:outline-2 hover:outline-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${task.dueDate < todayKey ? "bg-red-600" : "bg-yellow-600"}`}
                                        />
                                        <span className="line-clamp-2 text-[10px] leading-tight text-text-muted sm:text-xs">{task.title}</span>
                                    </button>
                                )}
                            </div>)}
                    </div>)}
            </div>
        </div>
    </div >

}

export default CalendarView

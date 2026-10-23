import { App } from '../components/Components'
import db, { type Outage, type Task } from '../data/Data'
import { useState } from 'react'

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function CalendarView({
    outages,
    onTaskClick,
    onOutageClick,
}: {
    outages: Outage[],
    onTaskClick: (task: Task) => void,
    onOutageClick: (outage: Outage) => void,
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

    const outagesByDate = new Map<string, Outage[]>();
    for (const outage of outages) {
        const day = new Date(`${outage.start}T00:00:00`);
        const end = new Date(`${outage.end}T00:00:00`);
        for (; day <= end; day.setDate(day.getDate() + 1)) {
            const key = dateKey(day);
            const outagesForDay = outagesByDate.get(key) ?? [];
            outagesForDay.push(outage);
            outagesByDate.set(key, outagesForDay);
        }
    }

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

            <fieldset className="mb-4 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-2">
                <legend className="sr-only">Showing</legend>
                <span className="app-label-text font-semibold">Showing</span>
                <App.Checkbox text="Scheduled Outages" color="red-600" />
                <App.Checkbox text="Maintenance Visits" color="yellow-600" />
                <App.Checkbox text="Incoming Delivery" color="indigo-600" />
            </fieldset>

            <div role="grid" aria-label={viewedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })} className="grid w-full grid-cols-7 gap-px overflow-hidden border border-brand-blue bg-brand-blue">
                {weekdays.map(day =>
                    <div
                        key={day}
                        role="columnheader"
                        className="flex items-center justify-center bg-main-background-2 py-1 text-sm font-semibold text-brand-blue sm:py-2 sm:text-base"
                    >
                        {day}
                    </div>
                )}
                {daysGrid.map((item) =>
                    <div
                        key={item.dateKey}
                        role="gridcell"
                        aria-label={item.date.toLocaleDateString(undefined, { dateStyle: 'full' })}
                        title={(outagesByDate.get(item.dateKey) ?? [])
                            .map((outage) => `${outage.plant}: ${outage.description}`)
                            .join('\n') || undefined}
                        className={`calendar-day-cell flex aspect-square min-w-0 flex-col overflow-hidden p-1 text-brand-blue sm:p-2
                            ${item.isCurrentMonth
                                ? `${item.dateKey === todayKey ? "bg-brand-light-green" : "bg-main-background-2"}`
                                : 'bg-brand-light-blue text-gray-400'}
                            ${outagesByDate.has(item.dateKey) ? "calendar-outage-day" : ""}`}
                    >
                        <span className="shrink-0 text-sm font-bold sm:text-lg">
                            {item.dayNumber}
                        </span>

                        <div className="mt-1 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
                            {(outagesByDate.get(item.dateKey) ?? []).map((outage) =>
                                <button
                                    key={outage.id ?? `${outage.plant}-${outage.start}-${outage.end}-${outage.description}`}
                                    type="button"
                                    aria-label={`Open outage details: ${outage.plant}, ${outage.description}`}
                                    onClick={() => onOutageClick(outage)}
                                    className="line-clamp-2 shrink-0 cursor-pointer rounded bg-red-100/80 px-1 text-left text-[10px] leading-tight text-red-800 hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-700 sm:text-xs dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/60"
                                >
                                    {outage.description}
                                </button>
                            )}
                            {(tasksByDate.get(item.dateKey) ?? []).map((task) =>
                                <button
                                    key={task.title}
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
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div >

}

export default CalendarView

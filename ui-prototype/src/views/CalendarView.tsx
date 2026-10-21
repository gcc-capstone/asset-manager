import { App } from '../components/Components'
import db, { type Task } from '../data/Data'

function dateKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function CalendarView({ onTaskClick }: { onTaskClick: (task: Task) => void }): React.JSX.Element {

    const currentDate: Date = new Date();
    const year: number = currentDate.getFullYear();
    const month: number = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const gridStart = new Date(year, month, 1 - firstDay.getDay());
    const daysGrid = Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        return {
            date,
            dayNumber: date.getDate(),
            monthOffset: date.getMonth() - month,
            dateKey: dateKey(date),
        };
    });

    const tasksByDate = new Map<string, Task[]>();
    for (const task of db.tasks) {
        const tasksForDate = tasksByDate.get(task.dueDate) ?? [];
        tasksForDate.push(task);
        tasksByDate.set(task.dueDate, tasksForDate);
    }

    const weeks = [];
    for (let i = 0; i < daysGrid.length; i += 7) {
        weeks.push(daysGrid.slice(i, i + 7));
    }

    const weekdays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayKey = dateKey(currentDate);

    return <div className="flex min-w-0 flex-1 flex-col no-select">
        <div className="flex min-w-0 flex-col items-center">
            <div className="flex items-center justify-center">
                <App.Button.LeftArrow />
                <App.Title text={currentDate.toLocaleString('default', { month: 'long' }) + " " + year} />
                <App.Button.RightArrow />
            </div>

            <fieldset className="mb-4 flex w-full flex-wrap items-center gap-x-5 gap-y-2 border-y border-line py-2">
                <legend className="sr-only">Showing</legend>
                <span className="app-label-text font-semibold">Showing</span>
                <App.Checkbox text="Scheduled Outages" color="red-600" />
                <App.Checkbox text="Maintenance Visits" color="yellow-600" />
                <App.Checkbox text="Incoming Delivery" color="indigo-600" />
            </fieldset>

            <table className="w-full table-fixed border-1 border-brand-blue">
                <thead>
                    <tr className="text-2xl text-brand-blue border-b-2 border-brand-blue bg-main-background-2">
                        {weekdays.map(day => (
                            <th key={day}>{day}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {weeks.map((week, weekIdx) => (
                        <tr key={weekIdx}>
                            {week.map((item, dayIdx) => (
                                <td
                                    key={dayIdx}
                                    className={`
                                                ${item.monthOffset === 0 ?
                                            `text-brand-blue font-bold border-1 border-brand-blue
                                                    ${item.dateKey === todayKey ? "bg-brand-light-green" : "bg-main-background-2"}`
                                            : ' bg-brand-light-blue text-gray-400'}
                                                px-2 pb-16 pt-1 text-xl`
                                    }
                                >
                                    <span className="text-2xl">
                                        {item.dayNumber}
                                    </span>

                                    <div className="flex flex-col gap-1">
                                        {(tasksByDate.get(item.dateKey) ?? []).map((task) =>
                                            <button
                                                key={task.title}
                                                type="button"
                                                aria-label={`Open task details for ${task.title}`}
                                                onClick={() => onTaskClick(task)}
                                                className="flex w-full cursor-pointer items-start gap-1 text-left hover:outline hover:outline-2 hover:outline-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-green"
                                            >
                                                <span
                                                    aria-hidden="true"
                                                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${task.dueDate < todayKey ? "bg-red-600" : "bg-yellow-600"}`}
                                                />
                                                <span className="line-clamp-2 text-xs text-text-muted">{task.title}</span>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div >

}

export default CalendarView

import { useRef, useState } from "react"
import CalendarView from "./CalendarView"
import db, { dateOffsetFromToday, replaceTasks, type Task, type Plant } from "../data/Data"
import { App } from "../components/Components";

/**
 * Formats a date to be displayed in a task detail view.
 * @param date The date to format
 * @returns The date in form "Mon Day, Year"
 */
function formatDate(date: string): string {
    return new Date(`${date}T00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Returns the React component for showing a list of task items.
 * @param title The title for the list of task items
 * @param tasks List of tasks to show
 * @param overdue Whether the list of tasks represents overdue tasks
 * @param onTaskClick A function to execute when a task item is clicked
 * @return the React component for showing a list of task items.
*/
function TaskList({
    title,
    tasks,
    overdue = false,
    emptyMessage = `No ${overdue ? "overdue" : "upcoming"} tasks.`,
    onTaskClick,
}: {
    title: string,
    tasks: Task[],
    overdue?: boolean,
    emptyMessage?: string,
    onTaskClick: (task: Task) => void,
}): React.JSX.Element {

    return <section className="flex shrink-0 flex-col">
        <div className="mb-3 flex items-center justify-between border-b-2 border-brand-blue">
            <h2 className="text-xl font-bold text-brand-blue">{title}</h2>
            <span className="app-label-text">{tasks.length}</span>
        </div>
        <div className="flex flex-col gap-3 pr-1">
            {tasks.length === 0
                ? <p className="app-label-text">{emptyMessage}</p>
                : tasks.map((task) =>
                    <button className="task-card" key={task.title} type="button" onClick={() => onTaskClick(task)}>
                        <div className="flex items-start justify-between">
                            <h3 className="font-bold text-text">{task.title}</h3>
                            <span className={`text-sm font-semibold ${overdue ? "text-red-600" : "text-brand-blue"}`}>
                                {formatDate(task.dueDate)}
                            </span>
                        </div>
                        <p className="mt-1 text-sm text-text-muted">{task.plant}</p>
                        <p className="mt-2 text-xs text-text-muted">{task.category}</p>
                    </button>
                )}
        </div>
    </section>
}

/**
 * Defines the React component for showing details about a task.
 * @param task The task to show detail for
 * @param isPast Whether the task is due before the current date
 * @param onTaskSelect The function to execute when a task is selected or unselected
 * @param onPlantSelect The function to execute when a plant is selected
 * @returns the React component for showing details about a task.
 */
function TaskDetailView({
    task,
    isNewTask,
    isPast,
    onTaskSelect,
    onTaskUpdate,
    onTaskDiscard,
    onPlantSelect
}: {
    task: Task,
    isNewTask: boolean,
    isPast: boolean,
    onTaskSelect: (task: Task | null) => void,
    onTaskUpdate: (task: Task) => void,
    onTaskDiscard: (task: Task) => void,
    onPlantSelect: (plant: Plant) => void,
}): React.JSX.Element {

    const [isEditing, setIsEditing] = useState(isNewTask);
    const [draft, setDraft] = useState<Task>(task);
    const formRef = useRef<HTMLFormElement>(null);

    const plant = db.plants.find((plant) => plant.name == task.plant);
    const statusColor = task.completed ? "text-brand-green" : isPast ? "text-red-600" : "text-brand-blue";
    const fieldClassName = `w-full rounded-lg border border-brand-blue bg-main-background px-3 py-2 text-base
        text-brand-blue focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-green`;

    function saveTask(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onTaskUpdate(draft);
        setIsEditing(false);
    }

    return <section className="flex max-h-[calc(100dvh-15rem)] min-h-0 flex-col border border-line bg-main-background-2 p-4">
        <button
            type="button"
            onClick={() => onTaskSelect(null)}
            className="app-subtitle app-hover-text cursor-pointer"
        >
            ← Back to calendar
        </button>
        <br />
        <span className="text-sm text-text-muted">Task</span>
        <App.Title text={task.title} />

        <form ref={formRef} className="flex min-h-0 flex-1 flex-col overflow-hidden" onSubmit={saveTask}>
            <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto">
                <div>
                    <div className="text-sm text-text-muted">Plant</div>
                    <div>
                        {isEditing
                            ? <select
                                value={draft.plant}
                                onChange={(event) => setDraft({ ...draft, plant: event.target.value })}
                                className={fieldClassName}
                            >
                                {db.plants.map((option) =>
                                    <option key={option.name} value={option.name}>{option.name}</option>
                                )}
                            </select>
                            : <button
                                type="button"
                                onClick={() => plant && onPlantSelect(plant)}
                                className="app-subtitle app-hover-text cursor-pointer"
                            >
                                {task.plant}
                            </button>}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-text-muted">Status</div>
                    <div style={{ fontWeight: 400 }} className={`text-xl ${statusColor}`}>
                        {task.completed ? "Complete" : isPast ? "Overdue" : "Upcoming"}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-text-muted">Assignee</div>
                    <div>
                        {isEditing
                            ? <input
                                type="text"
                                value={draft.assignee ?? ""}
                                onChange={(event) => setDraft({ ...draft, assignee: event.target.value })}
                                className={fieldClassName}
                            />
                            : <span className="app-subtitle">{task.assignee || "Unspecified"}</span>}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-text-muted">Due date</div>
                    <div>
                        {isEditing
                            ? <input
                                type="date"
                                required
                                value={draft.dueDate}
                                onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })}
                                className={fieldClassName}
                            />
                            : <span className="app-subtitle">{formatDate(task.dueDate)}</span>}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-text-muted">Type</div>
                    <div>
                        {isEditing
                            ? <input
                                type="text"
                                required
                                value={draft.category}
                                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                                className={fieldClassName}
                            />
                            : <span className="app-subtitle">{task.category}</span>}
                    </div>
                </div>

                <div>
                    <div className="text-sm text-text-muted">Description</div>
                    <div>
                        {isEditing
                            ? <textarea
                                value={draft.description ?? ""}
                                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                                rows={4}
                                className={fieldClassName}
                            />
                            : <p>{task.description || "This task has no description."}</p>}
                    </div>
                </div>
            </div>

            <div className={`flex shrink-0 gap-3 bg-main-background-2 pt-6 ${isEditing ? "justify-end" : "justify-start"}`}>
                {isEditing
                    ? <>
                        <button
                            type="button"
                            onClick={() => formRef.current?.requestSubmit()}
                            className="rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white transition hover:opacity-90"
                        >
                            Save task
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (isNewTask) {
                                    onTaskDiscard(task);
                                    onTaskSelect(null);
                                } else {
                                    setDraft(task);
                                    setIsEditing(false);
                                }
                            }}
                            className="rounded-lg border border-brand-blue px-4 py-2 font-semibold text-brand-blue transition hover:bg-brand-light-blue"
                        >
                            Cancel
                        </button>
                    </>
                    : <>
                        <button
                            type="button"
                            onClick={() => {
                                setDraft(task);
                                setIsEditing(true);
                            }}
                            className="rounded-lg bg-brand-blue px-4 py-2 font-semibold text-white transition hover:opacity-90"
                        >
                            Edit task
                        </button>
                        <button
                            type="button"
                            onClick={() => onTaskUpdate({ ...task, completed: !task.completed })}
                            className="rounded-lg border border-brand-blue px-4 py-2 font-semibold text-brand-blue transition hover:bg-brand-light-blue"
                        >
                            {task.completed ? "Mark incomplete" : "Mark complete"}
                        </button>
                    </>}
            </div>
        </form>
    </section>;
}

/**
 * Returns the parent React component for the Tasks view.
 * @param selectedTask Selected task to show details for, null if no task is selected
 * @param onTaskSelect Function to execute when a task is selected or unselected
 * @param onPlantSelect Function to execute when a plant is selected
 * @returns The parent React component for the Tasks view.
 */
function TasksView({
    selectedTask,
    onTaskSelect,
    onPlantSelect,
}: {
    selectedTask: Task | null,
    onTaskSelect: (task: Task | null) => void,
    onPlantSelect: (plant: Plant) => void,
}): React.JSX.Element {

    const [tasks, setTasks] = useState<Task[]>(db.tasks);
    const [newTask, setNewTask] = useState<Task | null>(null);
    const [taskCreated, setTaskCreated] = useState(false);
    const today: string = dateOffsetFromToday(0);

    const upcomingTasks: Task[] = tasks
        .filter((task) => !task.completed && task.dueDate >= today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const overdueTasks: Task[] = tasks
        .filter((task) => !task.completed && task.dueDate < today)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const completedTasks: Task[] = tasks
        .filter((task) => task.completed)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    function addTask() {
        setTaskCreated(false);
        const plant = db.plants[0];
        if (!plant) {
            throw new Error("Cannot create a task because there are no plants available.");
        }

        const task: Task = {
            title: "Untitled task",
            completed: false,
            plant: plant.name,
            assignee: undefined,
            dueDate: dateOffsetFromToday(0),
            category: "General",
            description: undefined,
        };
        const nextTasks = [...tasks, task];
        replaceTasks(nextTasks);
        setTasks(nextTasks);
        setNewTask(task);
        onTaskSelect(task);
    }

    function updateTask(updatedTask: Task) {
        const taskIndex = tasks.findIndex((task) => task === selectedTask);
        if (taskIndex < 0) {
            throw new Error("Cannot update a task that is no longer in the task list.");
        }

        const nextTasks = tasks.map((task, index) => index === taskIndex ? updatedTask : task);
        replaceTasks(nextTasks);
        setTasks(nextTasks);
        if (newTask === selectedTask) {
            setTaskCreated(true);
            setNewTask(null);
        }
        onTaskSelect(updatedTask);
    }

    function discardNewTask(taskToDiscard: Task) {
        const nextTasks = tasks.filter((task) => task !== taskToDiscard);
        replaceTasks(nextTasks);
        setTasks(nextTasks);
        setNewTask(null);
    }

    return <div className="grid min-h-[32rem] w-full grid-cols-2 items-start gap-30">
        <div className="flex min-w-0 flex-col gap-4">
            <button
                type="button"
                onClick={addTask}
                className="w-fit rounded-lg bg-brand-blue px-4 font-semibold text-white transition hover:opacity-90"
            >
                Add task
            </button>
            {taskCreated && <p className="text-sm font-semibold text-brand-green" role="status">Task created successfully.</p>}
            <TaskList title="Upcoming Tasks" tasks={upcomingTasks} onTaskClick={onTaskSelect} />
            <TaskList title="Overdue Tasks" tasks={overdueTasks} overdue onTaskClick={onTaskSelect} />
            <TaskList
                title="Complete Tasks"
                tasks={completedTasks}
                emptyMessage="No complete tasks."
                onTaskClick={onTaskSelect}
            />
        </div>
        <div className={`relative min-w-0 ${selectedTask ? "min-h-0 pt-12.5" : ""}`}>
            {selectedTask
                ? <TaskDetailView
                    key={selectedTask.title}
                    task={selectedTask}
                    isNewTask={selectedTask === newTask}
                    isPast={!selectedTask.completed && selectedTask.dueDate < today}
                    onTaskSelect={onTaskSelect}
                    onTaskUpdate={updateTask}
                    onTaskDiscard={discardNewTask}
                    onPlantSelect={onPlantSelect} />
                : <CalendarView onTaskClick={onTaskSelect} />}
        </div>
    </div>
}

export default TasksView

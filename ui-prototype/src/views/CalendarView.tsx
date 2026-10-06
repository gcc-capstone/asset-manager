import { useState } from 'react'
import { App } from '../components/Components'

function CalendarView(): React.JSX.Element {
    console.log("Generating calendar layout");

    const currentDate: Date = new Date();
    const year: number = currentDate.getFullYear();
    const month: number = currentDate.getMonth();

    const startDayOfWeek: number = new Date(year, month, 1).getDay();
    const daysInMonth: number = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth: number = new Date(year, month, 0).getDate();

    const daysGrid = [];

    // Step A: Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        daysGrid.push({ dayNumber: daysInPrevMonth - i, isCurrentMonth: false });
    }

    // Step B: Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        daysGrid.push({ dayNumber: i, isCurrentMonth: true });
    }

    // Step C: Next month padding
    const remainingCells = 42 - daysGrid.length;
    for (let i = 1; i <= remainingCells; i++) {
        daysGrid.push({ dayNumber: i, isCurrentMonth: false });
    }

    // --- NEW STEP: Chunk the flat 42-day array into 6 weeks of 7 days ---
    const weeks = [];
    for (let i = 0; i < daysGrid.length; i += 7) {
        weeks.push(daysGrid.slice(i, i + 7));
    }

    const weekdays: string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return <div className="flex no-select">

        <div className="flex flex-col">
            <App.Spacer p="61px" />

            <App.Subtitle text="Showing" />
            <div className="border-b-2 border-brand-blue" />
            <App.Spacer p="10px" />

            <App.Checkbox text="Scheduled Outages" color="red-600" />
            <App.Spacer p="10px" />

            <App.Checkbox text="Maintenance Visits" color="yellow-600" />
            <App.Spacer p="10px" />

            <App.Checkbox text="Incoming Orders" color="indigo-600" />
        </div>

        <App.Spacer p="4rem" />

        <div className="flex flex-col place-items-center">

            <div className="flex">
                <App.Button.LeftArrow />
                <App.Title text={currentDate.toLocaleString('default', { month: 'long' }) + " " + year} />
                <App.Button.RightArrow />
            </div>

            <App.Spacer p="5" />

            <table className="calendar-table border-1 border-brand-blue">
                <thead>
                    <tr className="text-2xl text-brand-blue border-b-2 border-brand-blue">
                        {weekdays.map(day => (
                            <th key={day}>{day}&nbsp;&nbsp;&nbsp;&nbsp;</th>
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
                                                ${item.isCurrentMonth ?
                                                    `text-brand-blue font-bold border-1 border-brand-blue
                                                    ${item.dayNumber == 25 ? "bg-brand-light-green" : ""}`
                                            : ' bg-brand-light-blue text-gray-400'}
                                                pl-7 pr-7 pb-1 pt-1 text-xl`
                                    }
                                >
                                    <span className="text-2xl">
                                        {item.dayNumber}
                                    </span>

                                    {Math.random() < 0.1 ?
                                        <div className="flex">
                                            <span className="text-red-600">⊛</span>
                                            <i className="text-gray-400 text-xs">&nbsp;Outage..</i>
                                        </div>
                                        : <div>&nbsp;</div>}

                                    {Math.random() < 0.1 ?
                                        <div className="flex">
                                            <span className="text-yellow-600 text-xl">⊛</span>
                                            <i className="text-gray-400 text-xs">&nbsp;Mainte..</i>
                                        </div>
                                        : <div>&nbsp;</div>}

                                    {Math.random() < 0.35 ?
                                        <div className="flex">
                                            <span className="text-indigo-600 text-xl">⊛</span>
                                            <i className="text-gray-400 text-xs">&nbsp;Order..</i>
                                        </div> : <div>&nbsp;</div>}

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

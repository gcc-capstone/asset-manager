import CalendarView from './views/CalendarView'
import PlantsView from './views/PlantsView'
import SettingsView from './views/SettingsView'
import { App } from './components/Components'
import { useState } from 'react'

function Home(): React.JSX.Element {

  /* State that holds the active view */
  const [OpenView, setOpenView] = useState(() => SettingsView);

  return <App.MainArea>

    {/* Left side: Panel allowing different views to be opened. */}
    <nav className="flex flex-col gap-4 pr-10">
      {
        /* This generates a series of buttons based on a list of views, icons, and titles */
        [
          [PlantsView, App.Icon.PowerPlants, () => <>Plants</>],
          [CalendarView, App.Icon.Calendar, () => <>Calendar</>],
          [SettingsView, App.Icon.Settings, () => <>Settings</>],
          [() => <></>, App.Icon.Company, () => <>Companies</>],
        ]
          .map(([element, icon, title]) =>
            <>
              <div className={`${OpenView === element ? "border-b-4 border-brand-green" : ""} flex`}>
                {icon()}
                <button className="app-tab-button" onClick={() => setOpenView(() => element)}>
                  {title()}
                </button>
              </div>
            </>
          )
      }
    </nav>

    {/* Right side: The view is shown here */}
    <div className="relative items-center justify-between px-6 py-4">
      <OpenView />
    </div>

  </App.MainArea>
}

export default Home

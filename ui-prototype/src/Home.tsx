import CalendarView from './views/CalendarView'
import PlantsView from './views/PlantsView'
import PlantDetailView from './views/PlantDetailView'
import SettingsView from './views/SettingsView'
import AdminView from './views/AdminView'
import CompaniesView from './views/CompaniesView'
import ContractorReportView from './views/ContractorReportView'
import { App } from './components/Components'
import { type Plant } from './data/Data'
import { useState } from 'react'

function Home(): React.JSX.Element {

  /* State that holds the active view */
  const [OpenView, setOpenView] = useState(() => CalendarView);

  /* State that holds the selected header tab */
  const [activeTab, setActiveTab] = useState("Plants");

  /* State that holds the plant opened from the Plants tab (null = show the list) */
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);

  /* Switching header tabs always goes back to that tab's starting page */
  function selectTab(tab: string) {
    setActiveTab(tab);
    setSelectedPlant(null);
  }

  return <App.MainArea activeTab={activeTab} onTabSelect={selectTab}>

    {activeTab === "Plants"

      /* Plants tab: the plant list, or one plant's page once it's clicked */
      ? (selectedPlant
        ? <PlantDetailView plant={selectedPlant} onBack={() => setSelectedPlant(null)} />
        : <div className="px-6 py-4">
          <PlantsView onSelect={setSelectedPlant} />
        </div>)

      /* Admin tab: accounts and the plants each one can access */
      : activeTab === "Admin"
      ? <div className="min-w-0 flex-1 px-6 py-4">
        <AdminView />
      </div>

      /* Settings: opened from the account button in the header */
      : activeTab === "Settings"
      ? <div className="min-w-0 flex-1 px-6 py-4">
        <SettingsView />
      </div>

      /* Other tabs: the original sidebar and views */
      : <>
        {/* Left side: Panel allowing different views to be opened. */}
        <nav className="flex flex-wrap gap-x-5 gap-y-2 pr-0 lg:flex-col lg:gap-4 lg:pr-10">
          {
            /* This generates a series of buttons based on a list of views, icons, and titles */
            ([
              [PlantsView, App.Icon.PowerPlants, () => <>Plants</>],
              [CalendarView, App.Icon.Calendar, () => <>Calendar</>],
              [CompaniesView, App.Icon.Company, () => <>Companies</>],
              [ContractorReportView, App.Icon.Calendar, () => <>Service Report</>],
            ] as [() => React.JSX.Element, () => React.JSX.Element, () => React.JSX.Element][])
              .map(([element, icon, title]) =>
                <div key={element.name} className={`${OpenView === element ? "border-b-4 border-brand-green" : ""} flex`}>
                  {icon()}
                  <button className="app-tab-button" onClick={() => setOpenView(() => element)}>
                    {title()}
                  </button>
                </div>
              )
          }
        </nav>

        {/* Right side: The view is shown here */}
        <div className="relative min-w-0 flex-1 items-center justify-between px-0 py-4 lg:px-6">
          <OpenView />
        </div>
      </>}

  </App.MainArea>
}

export default Home
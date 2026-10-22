import PlantsView from './views/PlantsView'
import PlantDetailView from './views/PlantDetailView'
import SettingsView from './views/SettingsView'
import AdminView from './views/AdminView'
import CompaniesView from './views/CompaniesView'
import ContractorReportView from './views/ContractorReportView'
import TasksView from './views/TasksView'
import { App } from './components/Components'
import db, { type Outage, type Plant, type Task, type Tad } from './data/Data'
import { useState } from 'react'

function Home(): React.JSX.Element {

  /* State that holds the active view */
  const [OpenView, setOpenView] = useState(() => CompaniesView);

  /* State that holds the selected header tab */
  const [activeTab, setActiveTab] = useState("Tasks");

  /* State that holds the plant opened from the Plants tab (null = show the list) */
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [plantOpenedFromTask, setPlantOpenedFromTask] = useState(false);

  /* All outages. Kept here so ones added on a plant's page stay when you go back and reopen it. */
  const [outages, setOutages] = useState<Outage[]>(db.outages);

  /* TADs are prototype state so edits persist while navigating between plants. */
  const [tads, setTads] = useState<Tad[]>(() =>
    Object.entries(db.tadDrawings).map(([plant, url]) => ({
      id: `tad-existing-${plant}`,
      plant,
      name: `${plant} TAD`,
      tagNumber: "",
      installationStatus: "Not installed",
      operationalStatus: "Unknown",
      installDate: "",
      lastMaintenanceDate: "",
      nextMaintenanceDate: "",
      drawing: { name: `${plant} TAD`, url },
      parts: [],
    }))
  );
  
  /* Switching header tabs always goes back to that tab's starting page */
  function selectTab(tab: string) {
    setActiveTab(tab);
    setSelectedPlant(null);
    setSelectedTask(null);
    setPlantOpenedFromTask(false);
  }

  function openPlantFromTask(plant: Plant) {
    setSelectedPlant(plant);
    setPlantOpenedFromTask(true);
    setActiveTab("Plants");
  }

  function backToTasks() {
    setSelectedPlant(null);
    setPlantOpenedFromTask(false);
    setActiveTab("Tasks");
  }

  return <App.MainArea activeTab={activeTab} onTabSelect={selectTab}>

    {
      /* Plants tab: the plant list, or one plant's page once it's clicked */
      activeTab === "Plants"
      ? (selectedPlant
        ? <PlantDetailView
          plant={selectedPlant}
          outages={outages}
          tads={tads}
          onAddOutage={outage => setOutages(current => [...current, outage])}
          onAddTad={tad => setTads(current => [...current, tad])}
          onUpdateTad={updated => setTads(current => current.map(tad => tad.id === updated.id ? updated : tad))}
          onDeleteTad={id => setTads(current => current.filter(tad => tad.id !== id))}
          onBack={plantOpenedFromTask ? backToTasks : () => setSelectedPlant(null)}
          backToTasks={plantOpenedFromTask}
        />
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

      /* Settings: opened from the account button in the header */
      : activeTab === "Tasks"
      ? <div className="min-w-0 flex-1 px-6 py-4">
        <TasksView
          selectedTask={selectedTask}
          onTaskSelect={setSelectedTask}
          onPlantSelect={openPlantFromTask}
        />
      </div>

      /* Other tabs: the original sidebar and views */
      : <>
        {/* Left side: Panel allowing different views to be opened. */}
        <nav className="flex flex-wrap gap-x-5 gap-y-2 pr-0 lg:flex-col lg:gap-4 lg:pr-10">
          {
            /* This generates a series of buttons based on a list of views, icons, and titles */
            ([
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
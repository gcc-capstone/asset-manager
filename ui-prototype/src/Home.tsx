import PlantsView from './views/PlantsView'
import PlantDetailView from './views/PlantDetailView'
import SettingsView from './views/SettingsView'
import AdminView from './views/AdminView'
import ContractorReportView from './views/ContractorReportView'
import OutageServiceReportView from './views/OutageServiceReportView'
import TasksView from './views/TasksView'
import { App } from './components/Components'
import { GlobalSearch } from './components/GlobalSearch'
import db, { seededTads, type Outage, type Plant, type Task, type Tad } from './data/Data'
import { useEffect, useState } from 'react'

function Home(): React.JSX.Element {

  const [outages, setOutages] = useState<Outage[]>(() => db.outages.map((outage, index) => ({
    ...outage,
    id: outage.id ?? `outage-${index + 1}`,
    tadIds: outage.tadIds?.length
      ? outage.tadIds
      : seededTads.filter(tad => tad.plant === outage.plant).slice(0, 1).map(tad => tad.id),
  })));
  const [submittedReportIds, setSubmittedReportIds] = useState<Set<string>>(() => new Set());

  const [isDo1Page, setIsDo1Page] = useState(() => window.location.pathname.toLowerCase() === "/do1");
  const [outageReport, setOutageReport] = useState<Outage | null>(() => {
    if (window.location.pathname.toLowerCase() !== "/do1") return null;
    const outageId = new URLSearchParams(window.location.search).get("outage");
    return outages.find(outage => outage.id === outageId) ?? null;
  });

  useEffect(() => {
    function syncDo1Route() {
      const onDo1Page = window.location.pathname.toLowerCase() === "/do1";
      const outageId = new URLSearchParams(window.location.search).get("outage");
      setIsDo1Page(onDo1Page);
      setOutageReport(onDo1Page && outageId
        ? outages.find(outage => outage.id === outageId) ?? null
        : null);
    }

    window.addEventListener("popstate", syncDo1Route);
    return () => window.removeEventListener("popstate", syncDo1Route);
  }, [outages]);

  /* State that holds the selected header tab */
  const [activeTab, setActiveTab] = useState(() => outageReport ? "Plants" : "Tasks");

  /* State that holds the plant opened from the Plants tab (null = show the list) */
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(() =>
    outageReport ? db.plants.find(plant => plant.name === outageReport.plant) ?? null : null
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedOutage, setSelectedOutage] = useState<Outage | null>(null);
  const [calendarNavigation, setCalendarNavigation] = useState<{ outage: Outage, nonce: number } | null>(null);
  const [plantOpenedFromTask, setPlantOpenedFromTask] = useState(false);
  const [plantOpenedFromCalendar, setPlantOpenedFromCalendar] = useState(false);

  /* TADs are prototype state so edits persist while navigating between plants. */
  const [tads, setTads] = useState<Tad[]>(() => seededTads);

  /* Where the plant page should open. `nonce` changes on every navigation so the page resets
     even when the same plant is opened again (e.g. a different TAD from the search). */
  const [plantPageTarget, setPlantPageTarget] = useState<{ tadId: string | null, nonce: number }>({ tadId: null, nonce: 0 });

  /* Opens a plant's page, optionally straight to one of its TADs under Assets */
  function openPlant(plant: Plant, tadId: string | null = null) {
    setPlantPageTarget({ tadId, nonce: Date.now() });
    setSelectedPlant(plant);
  }

  /* Opens a plant or TAD picked from the header search, from anywhere in the app */
  function openFromSearch(plant: Plant, tadId: string | null = null) {
    selectTab("Plants");
    openPlant(plant, tadId);
  }
  
  /* Switching header tabs always goes back to that tab's starting page */
  function selectTab(tab: string) {
    setOutageReport(null);
    if (isDo1Page) {
      setIsDo1Page(false);
      window.history.pushState({}, "", "/");
    }
    setActiveTab(tab);
    setSelectedPlant(null);
    setSelectedTask(null);
    setSelectedOutage(null);
    setPlantOpenedFromTask(false);
    setPlantOpenedFromCalendar(false);
  }

  function openPlantFromTask(plant: Plant) {
    openPlant(plant);
    setSelectedOutage(null);
    setPlantOpenedFromTask(true);
    setPlantOpenedFromCalendar(false);
    setActiveTab("Plants");
  }

  function openPlantFromOutage(outage: Outage) {
    const plant = db.plants.find(candidate => candidate.name === outage.plant);
    if (!plant) {
      throw new Error(`Cannot open outage for unknown plant "${outage.plant}".`);
    }
    openPlant(plant);
    setSelectedOutage(outage);
    setPlantOpenedFromTask(false);
    setPlantOpenedFromCalendar(true);
    setActiveTab("Plants");
  }

  function openOutageInCalendar(outage: Outage) {
    setCalendarNavigation(current => ({ outage, nonce: (current?.nonce ?? 0) + 1 }));
    setSelectedPlant(null);
    setSelectedTask(null);
    setSelectedOutage(null);
    setPlantOpenedFromTask(false);
    setPlantOpenedFromCalendar(false);
    setActiveTab("Tasks");
  }

  function backToTasks() {
    setSelectedPlant(null);
    setPlantOpenedFromTask(false);
    setPlantOpenedFromCalendar(false);
    setActiveTab("Tasks");
  }

  function backToCalendar() {
    setSelectedPlant(null);
    setSelectedOutage(null);
    setPlantOpenedFromCalendar(false);
    setActiveTab("Tasks");
  }

  function leaveDo1Page() {
    setOutageReport(null);
    setIsDo1Page(false);
    window.history.replaceState({}, "", "/");
  }

  function openOutageReport(outage: Outage, plant: Plant) {
    setOutageReport(outage);
    setIsDo1Page(true);
    setSelectedPlant(plant);
    setPlantOpenedFromTask(false);
    setActiveTab("Plants");
    window.history.pushState({}, "", `/DO1?outage=${encodeURIComponent(outage.id ?? "")}`);
  }

  /* Saves a changed outage (e.g. a new flag), keeping the selected outage pointing at the new copy */
  function updateOutage(updated: Outage) {
    setOutages(current => current.map(outage => outage.id === updated.id ? updated : outage));
    setSelectedOutage(current => current?.id === updated.id ? updated : current);
  }

  function markReportSubmitted(outage: Outage) {
    const reportId = outage.id ?? `${outage.plant}-${outage.start}`;
    setSubmittedReportIds(current => new Set(current).add(reportId));
  }

  const outageReportPlant = outageReport
    ? db.plants.find(plant => plant.name === outageReport.plant) ?? null
    : null;

  if (isDo1Page) {
    const requestedOutageId = new URLSearchParams(window.location.search).get("outage");

    if (!requestedOutageId) {
      return <main className="min-h-screen bg-main-background px-4 py-6 sm:px-8">
        <div className="mx-auto mb-4 w-full max-w-4xl">
          <button
            type="button"
            className="text-sm font-semibold text-brand-blue hover:text-brand-green"
            onClick={leaveDo1Page}>
            Return to Asset Manager
          </button>
        </div>
        <ContractorReportView />
      </main>;
    }

    return outageReport && outageReportPlant
      ? <main className="min-h-screen bg-main-background px-4 py-6 sm:px-8">
        <OutageServiceReportView
          plant={outageReportPlant}
          outage={outageReport}
          tads={tads.filter(tad => tad.plant === outageReport.plant)}
          onReportSubmitted={() => markReportSubmitted(outageReport)}
          onBack={leaveDo1Page}
        />
      </main>
      : <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-main-background px-6 text-center">
        <h1 className="text-2xl font-bold text-brand-blue">Service report unavailable</h1>
        <p className="text-text-muted">This DO1 service report could not be found.</p>
        <button
          type="button"
          className="font-semibold text-brand-blue hover:text-brand-green"
          onClick={leaveDo1Page}>
          Return to Asset Manager
        </button>
      </main>;
  }

  return <App.MainArea activeTab={activeTab} onTabSelect={selectTab} search={
    <GlobalSearch
      plants={db.plants}
      tads={tads}
      onOpenPlant={plant => openFromSearch(plant)}
      onOpenTad={tad => {
        const plant = db.plants.find(item => item.name === tad.plant);
        if (plant) openFromSearch(plant, tad.id);
      }} />
  }>

    {
      /* Plants tab: the plant list, or one plant's page once it's clicked */
      activeTab === "Plants"
      ? (selectedPlant
        ? <PlantDetailView
          key={`${selectedPlant.name}-${plantPageTarget.nonce}`}
          initialTadId={plantPageTarget.tadId}
          plant={selectedPlant}
          outages={outages}
          focusOutage={selectedOutage}
          tads={tads}
          onAddOutage={outage => setOutages(current => [...current, { ...outage, id: outage.id ?? `outage-${Date.now()}` }])}
          onUpdateOutage={updateOutage}
          onAddTad={tad => setTads(current => [...current, tad])}
          onUpdateTad={updated => setTads(current => current.map(tad => tad.id === updated.id ? updated : tad))}
          onDeleteTad={id => setTads(current => current.filter(tad => tad.id !== id))}
          onBack={plantOpenedFromCalendar
            ? backToCalendar
            : plantOpenedFromTask ? backToTasks : () => setSelectedPlant(null)}
          onOpenReport={outage => openOutageReport(outage, selectedPlant)}
          onOpenInCalendar={openOutageInCalendar}
          submittedReportIds={submittedReportIds}
          onReportSubmitted={markReportSubmitted}
          backToTasks={plantOpenedFromTask}
          backToCalendar={plantOpenedFromCalendar}
        />
        : <div className="px-6 py-4">
          <PlantsView onSelect={plant => openPlant(plant)} />
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
          outages={outages}
          onOutageSelect={openPlantFromOutage}
          calendarNavigation={calendarNavigation}
        />
      </div>
      : null}

  </App.MainArea>
}

export default Home
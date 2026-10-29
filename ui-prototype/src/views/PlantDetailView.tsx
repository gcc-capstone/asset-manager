import { Fragment, useEffect, useState } from 'react'
import db, { outageTypes, replaceTasks, type Drawing, type Outage, type OutageType, type Plant, type Tad, type TadPart, type TadTag } from '../data/Data'
import { COMMON_INTERVALS_MONTHS, RECURRENCE_HORIZON_YEARS, STANDARD_OUTAGE_TASKS, buildOutageTasks, describeTaskTiming, outageOccurrences } from '../data/Recurrence'
import { App } from "../components/Components"
import { Modal, formStyles } from '../components/Modal'
import { BomModal } from '../components/BomModal'
import { AddFlagButton, FLAG_MAX_LENGTH, FlagBadge, FlagModal } from '../components/OutageFlag'

/** The sections listed in the left sidebar when a plant is open */
type Section = "Outages" | "Info" | "Assets"

/** Today as "YYYY-MM-DD" in local time */
function todayString(): string {
    return new Date().toLocaleDateString("en-CA")
}

/** Formats a "YYYY-MM-DD" date as e.g. "Oct 26, 2026" (parsed as local time so it doesn't shift a day) */
function formatDate(date: string): string {
    return new Date(date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/** Returns a drawing's tags, including a fallback for older TAD records that have only drawing-level fields. */
function maintenanceCycleParts(cycle: string): { amount: string; unit: "week" | "month" | "year" } {
    const match = cycle.trim().match(/^(\d+)\s*(week|weeks|month|months|year|years)$/i);
    if (!match) return { amount: "", unit: "month" };
    const unit = match[2].toLowerCase().replace(/s$/, "") as "week" | "month" | "year";
    return { amount: match[1], unit };
}

function formatMaintenanceCycle(cycle: string): string {
    const { amount, unit } = maintenanceCycleParts(cycle);
    if (!amount) return "Not set";
    return `${amount} ${unit}${Number(amount) === 1 ? "" : "s"}`;
}

function tadTags(tad: Tad): TadTag[] {
    if (tad.tags?.length) return tad.tags;
    return [{
        id: `${tad.id}-tag`,
        tagNumber: tad.tagNumber,
        installationStatus: tad.installationStatus,
        operationalStatus: tad.operationalStatus,
        installDate: tad.installDate,
        lastMaintenanceDate: tad.lastMaintenanceDate,
        maintenanceCycle: tad.maintenanceCycle,
    }];
}

/** Number of days an outage lasts, counting both the start and end day */
function durationDays(start: string, end: string): number {
    return Math.round((new Date(end + "T00:00").getTime() - new Date(start + "T00:00").getTime()) / 86_400_000) + 1
}

/** Returns a plant's outages that haven't ended yet, soonest first */
function upcomingOutages(plant: Plant, outages: Outage[]): Outage[] {
    const today = todayString()
    return outages
        .filter((outage) => outage.plant === plant.name && outage.end >= today)
        .sort((a, b) => a.start.localeCompare(b.start))
}

/** True if a drawing is a PDF (shown as a file tile instead of an image preview) */
function isPdf(drawing: Drawing): boolean {
    return /\.pdf$/i.test(drawing.name) || /\.pdf($|\?)/i.test(drawing.url)
}

/** ----------------------------------------------------------------------------------------------------------------
 * Shows one plant: a left sidebar with Outages, Info and Assets, and the selected section on the right.
 */
function PlantDetailView({
    plant,
    outages,
    focusOutage = null,
    tads,
    onAddOutage,
    onUpdateOutage,
    onAddTad,
    onUpdateTad,
    onDeleteTad,
    onOpenReport,
    onOpenInCalendar,
    submittedReportIds,
    onReportSubmitted,
    onBack,
    backToTasks = false,
    initialTadId = null,
    backToCalendar = false,
}: {
    plant: Plant,
    outages: Outage[],
    focusOutage?: Outage | null,
    tads: Tad[],
    onAddOutage: (outage: Outage) => void,
    /* Saves a changed outage (e.g. its flag), matched by id */
    onUpdateOutage: (outage: Outage) => void,
    onAddTad: (tad: Tad) => void,
    onUpdateTad: (tad: Tad) => void,
    onDeleteTad: (id: string) => void,
    onOpenReport: (outage: Outage) => void,
    onOpenInCalendar: (outage: Outage) => void,
    submittedReportIds: Set<string>,
    onReportSubmitted: (outage: Outage) => void,
    onBack: () => void,
    backToTasks?: boolean,
    /* Open the page on Assets with this TAD selected (e.g. a TAD or part picked from the header search) */
    initialTadId?: string | null,
    backToCalendar?: boolean,
}): React.JSX.Element {

    /* State that holds the selected sidebar section */
    const [section, setSection] = useState<Section>(initialTadId ? "Assets" : "Outages");

    /* TAD to open when switching to Assets from an outage or search (null = none selected) */
    const [focusTadId, setFocusTadId] = useState<string | null>(initialTadId);

    /* Jumps from an outage to that TAD's page under Assets */
    function openTad(id: string) {
        setFocusTadId(id);
        setSection("Assets");
    }

    const sections: [Section, () => React.JSX.Element][] = [
        ["Outages", App.Icon.Calendar],
        ["Info", App.Icon.Company],
        ["Assets", App.Icon.PowerPlants],
    ];

    return <div className="flex flex-col w-full">

        {/* Top: small back link, then the plant name and county, above the sidebar */}
        <div className="mb-6 flex flex-col gap-1 border-b border-line pb-4">
            <button type="button" onClick={onBack}
                className="w-fit text-sm text-text-muted transition-colors hover:text-brand-green cursor-pointer">
                {backToCalendar ? "← Back to calendar" : backToTasks ? "← Back to tasks" : "← All plants"}
            </button>
            <h1 className="text-2xl text-text">
                {plant.name}{" "}
                <span className="ml-2 text-base font-normal text-text-muted">{plant.county} County</span>
            </h1>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-0">
            {/* Left side: sections for this plant (same styling as the main sidebar) */}
            <nav className="flex flex-wrap gap-x-5 gap-y-2 lg:flex-col lg:gap-4 lg:pr-10">
                {sections.map(([name, Icon]) =>
                    <div key={name} className={`${section === name ? "border-b-4 border-brand-green" : ""} flex`}>
                        <Icon />
                        <button className="app-tab-button" onClick={() => { setFocusTadId(null); setSection(name) }}>
                            {name}
                        </button>
                    </div>
                )}
            </nav>

            {/* Right side: the selected section */}
            <div className="flex min-w-0 grow flex-col lg:px-6">
                {section === "Outages" && <PlantOutages
                    plant={plant}
                    outages={outages}
                    focusOutage={focusOutage}
                    tads={tads.filter(tad => tad.plant === plant.name)}
                    onAddOutage={onAddOutage}
                    onUpdateOutage={onUpdateOutage}
                    onOpenTad={openTad}
                    onOpenReport={onOpenReport}
                    onOpenInCalendar={onOpenInCalendar}
                    submittedReportIds={submittedReportIds}
                    onReportSubmitted={onReportSubmitted} />}
                {section === "Info" && <PlantInfo plant={plant} outages={outages} />}
                {section === "Assets" && <PlantAssets
                    initialSelectedId={focusTadId}
                    plant={plant}
                    tads={tads.filter(tad => tad.plant === plant.name)}
                    onAddTad={onAddTad}
                    onUpdateTad={onUpdateTad}
                    onDeleteTad={onDeleteTad} />}
            </div>
        </div>
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Upcoming outages for a plant, each with its description and the TADs it covers, plus an "Add outage" button
 * @param tads This plant's TADs (the ones managed under Assets)
 * @param onOpenTad Called with a TAD's id when it's clicked on an outage (opens it under Assets)
 */
function PlantOutages({
    plant,
    outages,
    focusOutage,
    tads,
    onAddOutage,
    onUpdateOutage,
    onOpenTad,
    onOpenReport,
    onOpenInCalendar,
    submittedReportIds,
    onReportSubmitted,
}: {
    plant: Plant,
    outages: Outage[],
    focusOutage: Outage | null,
    tads: Tad[],
    onAddOutage: (outage: Outage) => void,
    onUpdateOutage: (outage: Outage) => void,
    onOpenTad: (id: string) => void,
    onOpenReport: (outage: Outage) => void,
    onOpenInCalendar: (outage: Outage) => void,
    submittedReportIds: Set<string>,
    onReportSubmitted: (outage: Outage) => void,
}): React.JSX.Element {
    const [focusedOutageElement, setFocusedOutageElement] = useState<HTMLElement | null>(null);
    const upcoming = upcomingOutages(plant, outages);
    const displayedOutages = focusOutage?.plant === plant.name && !upcoming.includes(focusOutage)
        ? [...upcoming, focusOutage].sort((a, b) => a.start.localeCompare(b.start))
        : upcoming;

    /* Whether the Add outage popup is open */
    const [adding, setAdding] = useState(false);

    /* Confirmation shown after adding outages, e.g. "Added 4 outages and 14 tasks." */
    const [notice, setNotice] = useState('');

    /* Adds every occurrence and (optionally) the standard tasks for each, then confirms */
    function createOutages(newOutages: Outage[], createTasks: boolean) {
        newOutages.forEach(onAddOutage);
        const newTasks = createTasks ? newOutages.flatMap(outage => buildOutageTasks(outage, todayString())) : [];
        if (newTasks.length) replaceTasks([...db.tasks, ...newTasks]);
        const outageText = newOutages.length === 1 ? "1 outage" : `${newOutages.length} outages`;
        const taskText = newTasks.length === 1 ? "1 task" : `${newTasks.length} tasks`;
        setNotice(createTasks ? `Added ${outageText} and ${taskText} (see Tasks).` : `Added ${outageText}.`);
        setAdding(false);
    }

    useEffect(() => {
        if (focusOutage?.plant === plant.name) {
            focusedOutageElement?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [focusOutage, focusedOutageElement, plant.name]);

    return <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl text-text">
                Outages <span className="text-base font-normal text-text-muted">{displayedOutages.length}</span>
            </h2>
            <button className={formStyles.primaryButton} onClick={() => { setNotice(''); setAdding(true) }}>+ Add outage</button>
        </div>
        {notice && <p className="-mt-2 text-sm font-semibold text-brand-green" role="status">{notice}</p>}

        {displayedOutages.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
                No upcoming outages scheduled. Click <b>+ Add outage</b> to schedule one.
            </p>
            : <ul className="flex flex-col gap-4">
                {displayedOutages.map((outage, index) =>
                    <li key={outage.id ?? `${outage.plant}-${outage.start}-${outage.end}-${index}`}>
                        <OutageCard
                            outage={outage}
                            tads={tads}
                            onOpenTad={onOpenTad}
                            onUpdate={onUpdateOutage}
                            isFocused={outage === focusOutage}
                            onFocusElement={outage === focusOutage ? setFocusedOutageElement : undefined}
                            onOpenReport={onOpenReport}
                            onOpenInCalendar={onOpenInCalendar}
                            reportSubmitted={submittedReportIds.has(outage.id ?? `${outage.plant}-${outage.start}`)}
                            onReportSubmitted={() => onReportSubmitted(outage)} />
                    </li>)}
            </ul>}

        {adding &&
            <AddOutageModal
                plant={plant}
                tads={tads}
                onCreate={createOutages}
                onClose={() => setAdding(false)} />}

    </div>
}

/** Colored dot for an outage type: red for Major, amber for Minor */
function OutageTypeBadge({ type }: { type: OutageType }): React.JSX.Element {
    return <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-semibold text-text">
        <span className={`h-2 w-2 rounded-full ${type === "Major" ? "bg-red-500" : "bg-amber-400"}`} aria-hidden="true" />
        {type}
    </span>
}

/** ----------------------------------------------------------------------------------------------------------------
 * One outage: dates, type, description, and the TADs it covers
 */
function OutageCard({
    outage,
    tads,
    onOpenTad,
    onUpdate,
    onOpenReport,
    onOpenInCalendar,
    reportSubmitted,
    onReportSubmitted,
    isFocused = false,
    onFocusElement,
}: {
    outage: Outage,
    tads: Tad[],
    onOpenTad: (id: string) => void,
    /* Saves this outage with changes (used for the flag) */
    onUpdate: (outage: Outage) => void,
    onOpenReport: (outage: Outage) => void,
    onOpenInCalendar: (outage: Outage) => void,
    reportSubmitted: boolean,
    onReportSubmitted: () => void,
    isFocused?: boolean,
    onFocusElement?: (element: HTMLElement | null) => void,
}): React.JSX.Element {
    /* Look up the outage's TADs (any that were deleted under Assets are skipped) */
    const linkedTads = (outage.tadIds ?? [])
        .map(id => tads.find(tad => tad.id === id))
        .filter((tad): tad is Tad => Boolean(tad));
    const outageTads = linkedTads.length > 0 ? linkedTads : tads.slice(0, 1);
    const inProgress = outage.start <= todayString();
    const pdfInputId = `outage-pdf-${outage.id ?? outage.start}`
    /* Bill of Materials popup, and the confirmation shown after emailing it */
    const [bomOpen, setBomOpen] = useState(false)
    const [bomNotice, setBomNotice] = useState("")
    /* Flag popup */
    const [flagging, setFlagging] = useState(false)

    function handleBomSent(message: string) {
        setBomNotice(message)
        setBomOpen(false)
        onUpdate({ ...outage, billOfMaterialsSent: true })

        const linkedBomTasks = db.tasks.map(task =>
            outage.id !== undefined && task.outageId === outage.id && task.title.toLowerCase().includes("bill of material")
                ? { ...task, completed: true }
                : task
        )
        if (linkedBomTasks.some((task, index) => task !== db.tasks[index])) {
            replaceTasks(linkedBomTasks)
        }
    }

    return <article
        ref={onFocusElement}
        className={`flex flex-col gap-4 rounded-lg border bg-main-background-2 p-5 ${isFocused ? "border-red-600 ring-2 ring-red-500" : "border-line"}`}
    >

        {/* Dates and type */}
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-text" style={{ fontFamily: "var(--font-display)" }}>
                        {formatDate(outage.start)} – {formatDate(outage.end)}
                    </span>
                    <button type="button" className={formStyles.ghostButton} onClick={() => onOpenInCalendar(outage)}>
                        Open in calendar
                    </button>
                </div>
                <span className="text-sm text-text-muted">
                    {durationDays(outage.start, outage.end)} days{inProgress && " · in progress"}
                    {outage.repeatEveryMonths && <> · <span title="Repeating outage">↻ Every {outage.repeatEveryMonths} months</span></>}
                </span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
                {/* Flag (click to add or edit), then Major/Minor */}
                {outage.flag
                    ? <FlagBadge text={outage.flag} onClick={() => setFlagging(true)} />
                    : <AddFlagButton onClick={() => setFlagging(true)} />}
                <OutageTypeBadge type={outage.type} />
            </div>
        </div>

        {/* Description */}
        <p className="whitespace-pre-line text-text">{outage.description}</p>

        {/* Top Assembly Drawings (TADs) as small chips; clicking one opens it under Assets */}
        <div className="flex flex-wrap items-center gap-2" aria-label="Top Assembly Drawings">
            <span className="text-sm text-text-muted">TADs</span>
            {outageTads.length === 0
                ? <span className="text-sm text-text-muted">· none selected</span>
                : outageTads.map(tad =>
                    <button key={tad.id}
                        onClick={() => onOpenTad(tad.id)}
                        title={`Open ${tad.name || "this TAD"} in Assets`}
                        className="group inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-main-background px-3 py-1 text-sm transition-colors hover:border-brand-green cursor-pointer">
                        <svg className="h-4 w-4 shrink-0 text-text-muted group-hover:text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" />
                        </svg>
                        <span className="shrink-0 font-semibold text-text group-hover:text-brand-green">{tad.tagNumber || tad.name || "Unnamed TAD"}</span>
                        {tad.tagNumber && tad.drawing &&
                            <span className="truncate text-text-muted">{tad.drawing.name.replace(/\.pdf$/i, "")}</span>}
                    </button>)}
        </div>

        {/* Bill of Materials and service report actions (secondary, so "+ Add outage" stays the main action on the page) */}
        <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={formStyles.ghostButton} disabled={outageTads.length === 0}
                aria-label={`Bill of Materials${outage.billOfMaterialsSent ? " sent" : ""}`}
                onClick={() => { setBomNotice(""); setBomOpen(true) }}>
                Bill of Materials
                {outage.billOfMaterialsSent &&
                    <svg className="ml-2 inline h-4 w-4 text-brand-green" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.42 0l-3.8-3.83a1 1 0 0 1 1.42-1.408l3.09 3.114 6.493-6.534a1 1 0 0 1 1.411-.006Z" clipRule="evenodd" />
                    </svg>}
            </button>
            {reportSubmitted
                ? <button type="button" className={formStyles.ghostButton} onClick={() => onOpenReport(outage)}>
                    View report
                </button>
                : <>
                    <label htmlFor={pdfInputId} className={`${formStyles.ghostButton} cursor-pointer`}>
                        Submit service report PDF
                    </label>
                    <input id={pdfInputId} type="file" accept=".pdf,application/pdf" className="sr-only"
                        onChange={event => {
                            const file = event.target.files?.[0]
                            if (file) onReportSubmitted()
                            event.target.value = ""
                        }} />
                    <button type="button" onClick={() => onOpenReport(outage)} className={formStyles.ghostButton}>
                        Open DO1 service report
                    </button>
                </>}
        </div>
        {bomNotice && <p className="-mt-2 text-sm font-semibold text-brand-green" role="status">{bomNotice}</p>}

        {bomOpen &&
            <BomModal
                outage={outage}
                tads={outageTads}
                onSent={handleBomSent}
                onClose={() => setBomOpen(false)} />}

        {flagging &&
            <FlagModal
                initial={outage.flag ?? ""}
                onSave={text => { onUpdate({ ...outage, flag: text || undefined }); setFlagging(false) }}
                onClose={() => setFlagging(false)} />}
    </article>
}

function groupTadsByDrawing(tads: Tad[]): { key: string, representative: Tad, tags: Tad[] }[] {
    const groups = new Map<string, Tad[]>()
    tads.forEach(tad => {
        const key = tad.drawing?.url || tad.drawing?.name || `tad:${tad.id}`
        groups.set(key, [...(groups.get(key) ?? []), tad])
    })
    return Array.from(groups.entries()).map(([key, tags]) => ({ key, representative: tags[0], tags }))
}

function InventorySection({ tads, selectedTadId, disabled, onSelectTad, onAddPart, onUpdatePart, onDeletePart }: {
    tads: Tad[],
    selectedTadId: string,
    disabled: boolean,
    onSelectTad: (id: string) => void,
    onAddPart: (tadId: string, part: TadPart) => void,
    onUpdatePart: (tadId: string, part: TadPart) => void,
    onDeletePart: (tadId: string, partId: string) => void,
}): React.JSX.Element {
    const [adding, setAdding] = useState(false)
    const [editing, setEditing] = useState<{ tadId: string, part: TadPart } | null>(null)
    const [targetTadId, setTargetTadId] = useState(selectedTadId || tads[0]?.id || "")
    const [partNumber, setPartNumber] = useState("")
    const [customerNumber, setCustomerNumber] = useState("")
    const [description, setDescription] = useState("")
    const [location, setLocation] = useState("")
    const [tadItemNum, setTadItemNum] = useState("")
    const [qtyPerValve, setQtyPerValve] = useState(1)
    const [qtyInStock, setQtyInStock] = useState(0)
    const [qtyNeeded, setQtyNeeded] = useState(1)
    const [deliveryWeeks, setDeliveryWeeks] = useState(0)
    const inventory = tads.flatMap(tad => tad.parts.map(part => ({ tad, part })))

    useEffect(() => {
        if (selectedTadId && tads.some(tad => tad.id === selectedTadId)) {
            setTargetTadId(selectedTadId)
        }
    }, [selectedTadId, tads])

    function addInventoryItem(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (disabled) return
        if (!tads.some(tad => tad.id === targetTadId)) {
            throw new Error("Select a valid TAD before adding inventory.")
        }

        onAddPart(targetTadId, {
            id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            partNumber: partNumber.trim(),
            customerNumber: customerNumber.trim(),
            location: location.trim(),
            description: description.trim(),
            tadItemNum: tadItemNum.trim(),
            qtyPerValve,
            qtyUsed: 0,
            qtyInStock,
            qtyNeeded,
            qtyToBuy: Math.max(0, qtyNeeded - qtyInStock),
            deliveryWeeks,
        })
        setPartNumber("")
        setCustomerNumber("")
        setDescription("")
        setLocation("")
        setTadItemNum("")
        setQtyPerValve(1)
        setQtyInStock(0)
        setQtyNeeded(1)
        setDeliveryWeeks(0)
        setAdding(false)
    }

    function updateEditingPart(patch: Partial<TadPart>) {
        setEditing(current => current ? { ...current, part: { ...current.part, ...patch } } : current)
    }

    function saveInventoryItem(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!editing || disabled) return
        onUpdatePart(editing.tadId, {
            ...editing.part,
            qtyToBuy: Math.max(0, editing.part.qtyNeeded - editing.part.qtyInStock),
        })
        setEditing(null)
    }

    return <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
            <div>
                <h3 className="text-xl font-semibold text-text">Inventory</h3>
                <p className="mt-1 text-sm text-text-muted">{inventory.length} item{inventory.length === 1 ? "" : "s"} linked to this plant's TADs</p>
            </div>
            <button className={formStyles.primaryButton} onClick={() => setAdding(value => !value)}
                disabled={disabled || tads.length === 0}>
                {adding ? "Cancel" : "+ Add inventory"}
            </button>
        </div>

        {adding && <form onSubmit={addInventoryItem} className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-main-background-2 p-4 sm:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 sm:col-span-2 xl:col-span-3">
                <span className={formStyles.label}>Link to Top Assembly Drawing</span>
                <select className={formStyles.input} value={targetTadId} onChange={event => setTargetTadId(event.target.value)} required>
                    {tads.map(tad =>
                        <option key={tad.id} value={tad.id}>{tad.name} · {tad.tagNumber || "No tag number"}</option>)}
                </select>
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Part number</span>
                <input className={formStyles.input} value={partNumber} onChange={event => setPartNumber(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Customer number</span>
                <input className={formStyles.input} value={customerNumber} onChange={event => setCustomerNumber(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>TAD item number</span>
                <input className={formStyles.input} value={tadItemNum} onChange={event => setTadItemNum(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2 xl:col-span-3">
                <span className={formStyles.label}>Description</span>
                <input className={formStyles.input} value={description} onChange={event => setDescription(event.target.value)} required />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Warehouse location</span>
                <input className={formStyles.input} value={location} onChange={event => setLocation(event.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Quantity per assembly</span>
                <input type="number" min="0" step="1" className={formStyles.input} value={qtyPerValve}
                    onChange={event => setQtyPerValve(Number(event.target.value))} required />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>In stock</span>
                <input type="number" min="0" step="1" className={formStyles.input} value={qtyInStock}
                    onChange={event => setQtyInStock(Number(event.target.value))} required />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Quantity needed</span>
                <input type="number" min="0" step="1" className={formStyles.input} value={qtyNeeded}
                    onChange={event => setQtyNeeded(Number(event.target.value))} required />
            </label>
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Delivery time (weeks)</span>
                <input type="number" min="0" step="1" className={formStyles.input} value={deliveryWeeks}
                    onChange={event => setDeliveryWeeks(Number(event.target.value))} required />
            </label>
            <div className="flex items-end sm:col-span-2 xl:col-span-3">
                <button type="submit" className={formStyles.primaryButton}>Save inventory item</button>
            </div>
        </form>}

        {inventory.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-text-muted">
                No inventory recorded. Add an item and link it to one of this plant's Top Assembly Drawings.
            </p>
            : <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full border-collapse text-sm">
                    <thead><tr className="bg-main-background text-left text-text-muted">
                        {["Part #", "Description", "Top Assembly Drawing", "Location", "Qty / assembly", "In stock", "Needed", "To buy", "Delivery (weeks)", "Actions"].map(label =>
                            <th key={label} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{label}</th>)}
                    </tr></thead>
                    <tbody>
                        {inventory.map(({ tad, part }) =>
                            <Fragment key={`${tad.id}-${part.id}`}>
                                <tr className="border-b border-line last:border-0">
                                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-text">{part.partNumber || "—"}</td>
                                    <td className="min-w-48 px-3 py-2">{part.description || "—"}</td>
                                    <td className="min-w-48 px-3 py-2">
                                        <button className="text-left font-semibold text-brand-blue underline decoration-brand-green underline-offset-2 hover:text-brand-green"
                                            disabled={disabled}
                                            onClick={() => onSelectTad(tad.id)}>
                                            {tad.drawing?.name ?? tad.name}
                                        </button>
                                        <span className="block text-xs text-text-muted">{tad.tagNumber || "No tag number"}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-2">{part.location || "—"}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{part.qtyPerValve}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{part.qtyInStock}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{part.qtyNeeded}</td>
                                    <td className={`px-3 py-2 text-right tabular-nums ${part.qtyToBuy > 0 ? "font-bold text-red-500" : ""}`}>{part.qtyToBuy}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{part.deliveryWeeks}</td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                        <div className="flex gap-2">
                                            <button className={formStyles.ghostButton} disabled={disabled}
                                                onClick={() => setEditing({ tadId: tad.id, part: { ...part } })}>Edit</button>
                                            <button className="font-semibold text-red-500 hover:underline" disabled={disabled}
                                                onClick={() => onDeletePart(tad.id, part.id)}>Remove</button>
                                        </div>
                                    </td>
                                </tr>
                                {editing?.tadId === tad.id && editing.part.id === part.id &&
                                    <tr className="border-b border-line bg-main-background-2">
                                        <td colSpan={10} className="p-3">
                                            <form onSubmit={saveInventoryItem} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                                <label className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>Part number</span>
                                                    <input className={formStyles.input} value={editing.part.partNumber}
                                                        onChange={event => updateEditingPart({ partNumber: event.target.value })} required />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>Customer number</span>
                                                    <input className={formStyles.input} value={editing.part.customerNumber ?? ""}
                                                        onChange={event => updateEditingPart({ customerNumber: event.target.value })} />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>Description</span>
                                                    <input className={formStyles.input} value={editing.part.description}
                                                        onChange={event => updateEditingPart({ description: event.target.value })} required />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>Location</span>
                                                    <input className={formStyles.input} value={editing.part.location ?? ""}
                                                        onChange={event => updateEditingPart({ location: event.target.value })} />
                                                </label>
                                                <label className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>TAD item number</span>
                                                    <input className={formStyles.input} value={editing.part.tadItemNum}
                                                        onChange={event => updateEditingPart({ tadItemNum: event.target.value })} />
                                                </label>
                                                {([
                                                    ["Quantity per assembly", "qtyPerValve"],
                                                    ["Quantity used", "qtyUsed"],
                                                    ["In stock", "qtyInStock"],
                                                    ["Quantity needed", "qtyNeeded"],
                                                    ["Delivery time (weeks)", "deliveryWeeks"],
                                                ] as const).map(([label, field]) =>
                                                    <label key={field} className="flex flex-col gap-1">
                                                        <span className={formStyles.label}>{label}</span>
                                                        <input type="number" min="0" step="1" className={formStyles.input} value={editing.part[field]}
                                                            onChange={event => updateEditingPart({ [field]: Number(event.target.value) })} required />
                                                    </label>)}
                                                <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-4">
                                                    <button type="submit" className={formStyles.primaryButton}>Save changes</button>
                                                    <button type="button" className={formStyles.ghostButton} onClick={() => setEditing(null)}>Cancel</button>
                                                </div>
                                            </form>
                                        </td>
                                    </tr>}
                            </Fragment>)}
                    </tbody>
                </table>
            </div>}
    </section>
}

/** A TAD's drawing preview: the image, a "PDF" tile, or "No drawing" when none has been uploaded */
function TadThumbnail({ tad, className = "" }: { tad: Tad, className?: string }): React.JSX.Element {
    if (!tad.drawing) {
        return <span className={`flex items-center justify-center text-xs text-text-muted ${className}`}>No drawing</span>
    }
    if (isPdf(tad.drawing)) {
        return <span title={tad.drawing.name} className={`flex flex-col items-center justify-center overflow-hidden px-1 text-center text-xs text-text-muted ${className}`}>
            <span className="font-bold">PDF</span>
            <span className="w-full truncate">{tad.drawing.name}</span>
        </span>
    }
    return <img src={tad.drawing.url} alt="" className={`w-full bg-white object-contain ${className}`} />
}

/** A drawing attachment that opens PDFs directly and previews image drawings inline. */
function TadDrawingAttachment({ drawing, alt }: { drawing: Drawing, alt: string }): React.JSX.Element {
    if (isPdf(drawing)) {
        return <a href={drawing.url} target="_blank" rel="noreferrer"
            className="flex max-w-full flex-col items-start gap-1 rounded-lg border border-line bg-main-background-2 p-4 text-left hover:border-brand-green">
            <span className="font-semibold text-brand-blue">PDF drawing</span>
            <span className="break-all text-sm text-text-muted">{drawing.name}</span>
            <span className="text-sm font-semibold text-brand-green">Open PDF in new tab ↗</span>
        </a>
    }
    return <img src={drawing.url} alt={alt}
        className="max-h-96 max-w-full self-start rounded-lg border border-line bg-white object-contain" />
}

/** ----------------------------------------------------------------------------------------------------------------
 * Popup form for a new outage: dates, Major/Minor, description, and which of the plant's existing TADs it covers
 */
function AddOutageModal({ plant, tads, onCreate, onClose }: {
    plant: Plant,
    tads: Tad[],
    /* Called with every occurrence to add (one, or several for a repeating outage) */
    onCreate: (outages: Outage[], createTasks: boolean) => void,
    onClose: () => void,
}): React.JSX.Element {
    const [start, setStart] = useState('');
    const [repeats, setRepeats] = useState(false);
    const [everyMonths, setEveryMonths] = useState(18);
    const [endsOn, setEndsOn] = useState<'never' | 'date'>('never');
    const [repeatUntil, setRepeatUntil] = useState('');
    const [createTasks, setCreateTasks] = useState(true);
    const [end, setEnd] = useState('');
    const [type, setType] = useState<OutageType>("Major");
    const [description, setDescription] = useState('');
    const [flag, setFlag] = useState('');
    const [tadIds, setTadIds] = useState<string[]>(() => tads[0] ? [tads[0].id] : []);
    const [tadSearch, setTadSearch] = useState('');
    const [error, setError] = useState('');

    /* TADs matching the search box (by name, tag number or status) */
    const query = tadSearch.trim().toLowerCase();
    const visibleTads = tads.filter(tad =>
        !query || `${tad.name} ${tad.tagNumber} ${tad.installationStatus}`.toLowerCase().includes(query));

    function toggleTad(id: string) {
        setTadIds(current => current.includes(id) ? current.filter(existing => existing !== id) : [...current, id]);
    }

    function create(e: React.FormEvent) {
        e.preventDefault();
        if (!start || !end) return setError('Pick a start and end date.');
        if (end < start) return setError('The end date must be on or after the start date.');
        if (end < todayString()) return setError('That outage has already ended. Only upcoming outages are listed here.');
        if (!description.trim()) return setError('Add a description of the outage.');
        const selectedTadIds = tads.map(tad => tad.id).filter(id => tadIds.includes(id));
        if (selectedTadIds.length === 0) return setError('Select at least one TAD for every outage.');

        if (repeats && (!Number.isInteger(everyMonths) || everyMonths < 1)) return setError('Enter how many months apart the outages are (1 or more).');
        if (repeats && endsOn === 'date' && (!repeatUntil || repeatUntil < start)) return setError('Pick an end date for the repeats on or after the first outage.');

        /* One outage, or every occurrence of a repeating one, all sharing the same details */
        const seriesId = `outage-${Date.now()}`;
        const dates = repeats ? occurrences : [{ start, end }];
        onCreate(dates.map((occurrence, index) => ({
            id: repeats ? `${seriesId}-${index + 1}` : seriesId,
            plant: plant.name,
            start: occurrence.start,
            end: occurrence.end,
            type,
            description: description.trim(),
            ...(flag.trim() ? { flag: flag.trim() } : {}),
            /* Keep the TADs in the same order they're listed under Assets */
            tadIds: selectedTadIds,
            ...(repeats ? { seriesId, repeatEveryMonths: everyMonths, repeatUntil: endsOn === 'date' ? repeatUntil : null } : {}),
        })), createTasks);
    }

    /* Every occurrence of the outage being entered (used for the preview and on save) */
    const occurrences = repeats && start && end && end >= start && everyMonths >= 1
        ? outageOccurrences(start, end, everyMonths, endsOn === 'date' && repeatUntil ? repeatUntil : null, todayString())
        : [];

    return <Modal title={`Add outage · ${plant.name}`} onClose={onClose} wide footer={<>
        {error && <span className="mr-auto text-sm text-red-500" role="alert">{error}</span>}
        <button className={formStyles.ghostButton} onClick={onClose}>Cancel</button>
        <button className={formStyles.primaryButton} type="submit" form="add-outage-form">Add outage</button>
    </>}>
        <form id="add-outage-form" onSubmit={create} className="flex flex-col gap-4">

            {/* Dates */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                    <label className={formStyles.label} htmlFor="outage-start">Start date</label>
                    <input id="outage-start" type="date" className={formStyles.input} value={start} autoFocus
                        onChange={e => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value) }} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={formStyles.label} htmlFor="outage-end">End date</label>
                    <input id="outage-end" type="date" className={formStyles.input} value={end} min={start || undefined}
                        onChange={e => setEnd(e.target.value)} />
                </div>
            </div>
            {start && end && end >= start &&
                <p className="-mt-2 text-sm text-text-muted">{durationDays(start, end)} days</p>}

            {/* Major / Minor */}
            <fieldset className="flex flex-col gap-1">
                <legend className={formStyles.label + " mb-1"}>Type</legend>
                <div className="inline-flex w-fit rounded-lg border border-line bg-main-background p-1">
                    {outageTypes.map(option =>
                        <label key={option}
                            className={`flex cursor-pointer items-center gap-2 rounded-md px-4 py-1.5 font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-green
                                ${type === option ? 'bg-brand-blue text-main-background' : 'text-text-muted hover:text-text'}`}>
                            <input type="radio" name="outage-type" value={option} className="sr-only"
                                checked={type === option} onChange={() => setType(option)} />
                            {option}
                        </label>)}
                </div>
            </fieldset>

            {/* Repeats */}
            <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-3">
                <legend className="sr-only">Repeats</legend>
                <label className="flex w-fit cursor-pointer items-center gap-3 font-semibold text-text">
                    <input type="checkbox" className={formStyles.checkbox} checked={repeats} onChange={e => setRepeats(e.target.checked)} />
                    Repeats
                </label>

                {repeats && <>
                    <div className="flex flex-wrap items-center gap-2">
                        <label htmlFor="outage-every" className="text-text">Every</label>
                        <input id="outage-every" type="number" min={1} max={120} step={1} className={formStyles.input.replace("w-full", "w-20")}
                            value={Number.isNaN(everyMonths) ? '' : everyMonths} onChange={e => setEveryMonths(parseInt(e.target.value, 10))} />
                        <span className="text-text">months</span>
                        <span className="ml-2 flex gap-1" role="group" aria-label="Common intervals">
                            {COMMON_INTERVALS_MONTHS.map(months =>
                                <button key={months} type="button" onClick={() => setEveryMonths(months)}
                                    aria-pressed={everyMonths === months}
                                    className={`rounded-full border px-3 py-1 text-sm transition-colors cursor-pointer ${everyMonths === months ? 'border-brand-blue bg-brand-blue text-main-background' : 'border-line text-text-muted hover:text-text'}`}>
                                    {months}
                                </button>)}
                        </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="radiogroup" aria-label="Ends">
                        <span className="text-text">Ends</span>
                        <label className="flex cursor-pointer items-center gap-2 text-text">
                            <input type="radio" name="outage-ends" checked={endsOn === 'never'} onChange={() => setEndsOn('never')} className="accent-brand-blue" />
                            Never
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-text">
                            <input type="radio" name="outage-ends" checked={endsOn === 'date'} onChange={() => setEndsOn('date')} className="accent-brand-blue" />
                            On
                        </label>
                        <label htmlFor="outage-repeat-until" className="sr-only">Repeat until</label>
                        <input id="outage-repeat-until" type="date" className={formStyles.input.replace("w-full", "w-auto")} value={repeatUntil}
                            onChange={e => { setRepeatUntil(e.target.value); setEndsOn('date') }} />
                    </div>

                    <p className="text-sm text-text-muted" aria-live="polite">
                        {occurrences.length === 0
                            ? 'Pick the first outage dates to see when it repeats.'
                            : <>{occurrences.length} outage{occurrences.length === 1 ? '' : 's'}{endsOn === 'never' && ` in the next ${RECURRENCE_HORIZON_YEARS} years`}: {' '}
                                {occurrences.slice(0, 4).map(o => formatDate(o.start)).join(' · ')}{occurrences.length > 4 && ' …'}</>}
                    </p>
                </>}
            </fieldset>

            {/* Description */}
            <div className="flex flex-col gap-1">
                <label className={formStyles.label} htmlFor="outage-description">Description</label>
                <textarea id="outage-description" rows={4} className={formStyles.input + " resize-y"} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's being worked on, scope, affected units, contractors, notes..." />
            </div>

            {/* Optional flag */}
            <div className="flex flex-col gap-1">
                <label className={formStyles.label} htmlFor="outage-flag">Flag <span className="text-text-muted">(optional) · e.g. Waiting on parts</span></label>
                <input id="outage-flag" className={formStyles.input} value={flag} maxLength={FLAG_MAX_LENGTH}
                    onChange={e => setFlag(e.target.value)} />
            </div>

            {/* Pick existing TADs */}
            <fieldset className="flex flex-col gap-2">
                <legend className={formStyles.label + " mb-1"}>
                    Top Assembly Drawings <span className="text-text-muted">· {tadIds.filter(id => tads.some(tad => tad.id === id)).length} of {tads.length} selected · select at least one</span>
                </legend>

                {tads.length === 0
                    ? <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-text-muted">
                        This plant doesn't have any TADs yet. Add at least one under <b>Assets</b> before scheduling an outage.
                    </p>
                    : <>
                        {tads.length > 5 &&
                            <>
                                <label className="sr-only" htmlFor="outage-tad-search">Search TADs</label>
                                <input id="outage-tad-search" type="search" placeholder="Search TADs by name or tag..."
                                    value={tadSearch} onChange={e => setTadSearch(e.target.value)} className={formStyles.input} />
                            </>}

                        <ul className="flex max-h-72 flex-col overflow-y-auto rounded-lg border border-line">
                            {visibleTads.map((tad, index) =>
                                <li key={tad.id} className={index > 0 ? 'border-t border-line' : ''}>
                                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-main-background">
                                        <input type="checkbox" className={formStyles.checkbox}
                                            checked={tadIds.includes(tad.id)} onChange={() => toggleTad(tad.id)} />
                                        <span className="h-10 w-14 shrink-0 overflow-hidden rounded border border-line bg-main-background">
                                            <TadThumbnail tad={tad} className="h-full" />
                                        </span>
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-semibold text-text">{tad.name || "Unnamed TAD"}</span>
                                            <span className="truncate text-xs text-text-muted">
                                                {tad.tagNumber || "No tag number"} · {tad.installationStatus}
                                            </span>
                                        </span>
                                    </label>
                                </li>)}
                            {visibleTads.length === 0 &&
                                <li className="px-3 py-3 text-sm text-text-muted">No TADs match "{tadSearch}".</li>}
                        </ul>
                    </>}
            </fieldset>

            {/* Standard tasks */}
            <fieldset className="flex flex-col gap-2">
                <legend className="sr-only">Tasks</legend>
                <label className="flex w-fit cursor-pointer items-center gap-3 font-semibold text-text">
                    <input type="checkbox" className={formStyles.checkbox} checked={createTasks} onChange={e => setCreateTasks(e.target.checked)} />
                    Create standard tasks{repeats ? ' for each outage' : ''}
                </label>
                {createTasks &&
                    <ul className="ml-7 flex flex-col gap-0.5 text-sm text-text-muted">
                        {STANDARD_OUTAGE_TASKS.map(task =>
                            <li key={task.key}><span className="text-text">{task.title}</span> · {describeTaskTiming(task)}</li>)}
                        <li className="text-xs">Tasks that would already be past due are skipped.</li>
                    </ul>}
            </fieldset>
        </form>
    </Modal>
}

/** ----------------------------------------------------------------------------------------------------------------
 * General information about a plant
 */
function PlantInfo({ plant, outages }: { plant: Plant, outages: Outage[] }): React.JSX.Element {
    const upcoming = upcomingOutages(plant, outages);

    const rows: [string, string][] = [
        ["Name", plant.name],
        ["County", `${plant.county} County`],
        ["Upcoming outages", `${upcoming.length}`],
        ["Next outage", upcoming.length ? `${formatDate(upcoming[0].start)} (${upcoming[0].type})` : "None scheduled"],
    ];

    return <div className="flex flex-col gap-4">
        <h2 className="text-xl text-text">Plant Info</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-10 gap-y-3">
            {rows.map(([label, value]) =>
                <Fragment key={label}>
                    <dt className="app-label-text font-bold">{label}</dt>
                    <dd className="app-label-text">{value}</dd>
                </Fragment>
            )}
        </dl>
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * A plant's installed assets, Top Assembly Drawings, and linked inventory
 */
function PlantAssets({ plant, tads, initialSelectedId = null, onAddTad, onUpdateTad, onDeleteTad }: {
    plant: Plant,
    tads: Tad[],
    /* TAD to show when the page opens (e.g. one clicked on an outage) */
    initialSelectedId?: string | null,
    onAddTad: (tad: Tad) => void,
    onUpdateTad: (tad: Tad) => void,
    onDeleteTad: (id: string) => void,
}): React.JSX.Element {
    const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [draftTad, setDraftTad] = useState<Tad | null>(null);
    const [isNewTad, setIsNewTad] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [toast, setToast] = useState("");
    const [isToastExiting, setIsToastExiting] = useState(false);
    const [showLocation, setShowLocation] = useState(true);
    const [editorTab, setEditorTab] = useState<"General Info" | "Parts Info" | "Image Upload">("General Info");
    const editorTabs = ["General Info", "Parts Info", "Image Upload"] as const;
    const editorTabIndex = editorTabs.indexOf(editorTab);
    const selectedTad = draftTad?.id === selectedId
        ? draftTad
        : tads.find(tad => tad.id === selectedId) ?? null;
    const visibleTads = draftTad && isNewTad ? [...tads, draftTad] : tads;

    useEffect(() => {
        if (!toast) return;
        setIsToastExiting(false);
        const exitTimeout = window.setTimeout(() => setIsToastExiting(true), 3000);
        const removeTimeout = window.setTimeout(() => setToast(""), 3350);
        return () => {
            window.clearTimeout(exitTimeout);
            window.clearTimeout(removeTimeout);
        };
    }, [toast]);

    function addTad() {
        if (draftTad?.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(draftTad.drawing.url);
        const tad: Tad = {
            id: `tad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            plant: plant.name,
            name: "New TAD",
            tagNumber: "",
            installationStatus: "Not installed",
            operationalStatus: "Unknown",
            installDate: "",
            lastMaintenanceDate: "",
            maintenanceCycle: "",
            tags: [],
            drawing: null,
            parts: [],
        };
        setDraftTad(tad);
        setIsNewTad(true);
        setIsEditing(true);
        setEditorTab("General Info");
        setSelectedId(tad.id);
    }

    function update(patch: Partial<Tad>) {
        if (selectedTad && isEditing) setDraftTad({ ...selectedTad, ...patch });
    }

    function updateTag(tagId: string, patch: Partial<TadTag>) {
        if (!selectedTad) return;
        update({ tags: tadTags(selectedTad).map(tag => tag.id === tagId ? { ...tag, ...patch } : tag) });
    }

    function addTag() {
        if (!selectedTad) return;
        update({ tags: [...tadTags(selectedTad), {
            id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            tagNumber: "",
            installationStatus: "Not installed",
            operationalStatus: "Unknown",
            installDate: "",
            lastMaintenanceDate: "",
            maintenanceCycle: "",
        }] });
    }

    function removeTag(tagId: string) {
        if (selectedTad) update({ tags: tadTags(selectedTad).filter(tag => tag.id !== tagId) });
    }

    function updatePart(partId: string, patch: Partial<TadPart>) {
        if (selectedTad) {
            update({ parts: selectedTad.parts.map(part => part.id === partId ? { ...part, ...patch } : part) });
        }
    }

    function addPart() {
        if (!selectedTad) return;
        update({
            parts: [...selectedTad.parts, {
                id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                partNumber: "",
                customerNumber: "",
                location: "",
                description: "",
                tadItemNum: "",
                qtyPerValve: 0,
                qtyUsed: 0,
                qtyInStock: 0,
                qtyNeeded: 0,
                qtyToBuy: 0,
                deliveryWeeks: 0,
            }],
        });
    }

    function removePart(partId: string) {
        if (selectedTad) update({ parts: selectedTad.parts.filter(part => part.id !== partId) });
    }

    function setDrawing(file: File | undefined) {
        if (!file) return;
        update({ drawing: { name: file.name, url: URL.createObjectURL(file) } });
    }

    function beginEdit() {
        if (!selectedTad) return;
        setDraftTad({ ...selectedTad, parts: selectedTad.parts.map(part => ({ ...part })) });
        setIsNewTad(false);
        setIsEditing(true);
        setEditorTab("General Info");
    }

    function editTadAssets() {
        if (!selectedTad) return;
        setDraftTad({ ...selectedTad, tags: tadTags(selectedTad).map(tag => ({ ...tag })) });
        setIsNewTad(false);
        setIsEditing(true);
        setEditorTab("General Info");
    }

    function addTadAsset() {
        editTadAssets();
        window.requestAnimationFrame(() => {
            const currentTags = selectedTad ? tadTags(selectedTad) : [];
            setDraftTad({ ...selectedTad!, tags: [...currentTags, {
                id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                tagNumber: "",
                installationStatus: "Not installed",
                operationalStatus: "Unknown",
                installDate: "",
                lastMaintenanceDate: "",
                maintenanceCycle: "",
            }] });
        });
    }

    function editTadInventory() {
        if (!selectedTad) return;
        setDraftTad({ ...selectedTad, parts: selectedTad.parts.map(part => ({ ...part })) });
        setIsNewTad(false);
        setIsEditing(true);
        setEditorTab("Parts Info");
    }

    function confirmTad() {
        if (!selectedTad || !isEditing) return;

        const savedTad = draftTad ?? selectedTad;
        const previousTad = tads.find(tad => tad.id === savedTad.id);
        if (previousTad?.drawing?.url.startsWith("blob:")
            && previousTad.drawing.url !== savedTad.drawing?.url) {
            URL.revokeObjectURL(previousTad.drawing.url);
        }

        if (isNewTad) {
            onAddTad(savedTad);
            setToast("TAD added.");
        } else {
            onUpdateTad(savedTad);
            setToast("TAD changes saved.");
        }
        setDraftTad(null);
        setIsNewTad(false);
        setIsEditing(false);
    }

    function cancelEdit() {
        if (!selectedTad) return;
        const original = tads.find(tad => tad.id === selectedTad.id);
        if (selectedTad.drawing?.url.startsWith("blob:")
            && selectedTad.drawing.url !== original?.drawing?.url) {
            URL.revokeObjectURL(selectedTad.drawing.url);
        }
        if (isNewTad) setSelectedId(null);
        setDraftTad(null);
        setIsNewTad(false);
        setIsEditing(false);
    }

    function deleteSelectedTad() {
        if (!selectedTad) return;
        if (selectedTad.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(selectedTad.drawing.url);
        onDeleteTad(selectedTad.id);
        setSelectedId(null);
        setConfirmingDelete(false);
    }

    return <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
                <div>
                    <h3 className="text-xl font-semibold text-text">Top Assembly Drawings</h3>
                    <p className="mt-1 text-sm text-text-muted">{tads.length} drawing{tads.length === 1 ? "" : "s"} for this plant</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button className={formStyles.ghostButton} disabled title="Excel export will be available once the spreadsheet format is defined.">
                        Export to Excel
                    </button>
                    <button className={formStyles.primaryButton} onClick={addTad} disabled={isEditing}>+ Add TAD</button>
                </div>
            </div>
        {visibleTads.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
                No TADs on file for this plant. Add one to record its details and parts.
            </p>
            : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.5fr)]">
                <ul className="flex flex-col gap-2">
                    {visibleTads.map(tad =>
                        <li key={tad.id}>
                            <button disabled={isEditing && selectedId !== tad.id} onClick={() => {
                                if (selectedId === tad.id) return;
                                if (draftTad?.drawing?.url.startsWith("blob:")
                                    && draftTad.drawing.url !== tads.find(item => item.id === draftTad.id)?.drawing?.url) {
                                    URL.revokeObjectURL(draftTad.drawing.url);
                                }
                                setDraftTad(null);
                                setIsNewTad(false);
                                setIsEditing(false);
                                setSelectedId(tad.id);
                            }}
                                className={`flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${selectedId === tad.id ? "border-brand-green bg-main-background-2" : "border-line hover:border-brand-blue"}`}>
                                <span className={`font-semibold ${selectedId === tad.id ? "text-brand-blue" : "text-text"}`}>{tad.name || "Unnamed TAD"}</span>
                                <span className="text-sm text-text-muted">{tadTags(tad).length} tag{tadTags(tad).length === 1 ? "" : "s"} · {tad.drawing?.name || "No drawing file"}</span>
                            </button>
                        </li>)}
                </ul>
                {selectedTad
                    ? <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-main-background-2 p-5">
                        {isEditing && <div role="tablist" aria-label="TAD details" className="grid grid-cols-3 border-b border-line">
                            {editorTabs.map((tab, index) =>
                                <button key={tab} type="button" role="tab" aria-selected={editorTab === tab}
                                    onClick={() => setEditorTab(tab)}
                                    className={`border-b-2 px-2 py-3 text-center text-sm font-semibold transition-colors sm:text-base ${editorTab === tab ? "border-brand-green text-brand-blue" : "border-transparent text-text-muted hover:text-brand-blue"}`}>
                                    <span className="mr-1.5 text-xs text-text-muted">{index + 1}.</span>{tab}
                                </button>)}
                        </div>}
                        {isEditing && <fieldset className="flex min-w-0 flex-col gap-5 border-0 p-0">
                        {editorTab === "General Info" && <>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>TAD name</span>
                                <input className={formStyles.input} value={selectedTad.name}
                                    onChange={e => update({ name: e.target.value })} />
                            </label>
                            <div />
                        </div>
                            <section className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-text">Tags</h3>
                                    <button type="button" className={formStyles.ghostButton} onClick={addTag}>+ Add tag</button>
                                </div>
                                {tadTags(selectedTad).map(tag =>
                                    <div key={tag.id} className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Tag number</span>
                                            <input className={formStyles.input} value={tag.tagNumber} onChange={e => updateTag(tag.id, { tagNumber: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Installation status</span>
                                            <select className={formStyles.input} value={tag.installationStatus} onChange={e => updateTag(tag.id, { installationStatus: e.target.value as TadTag["installationStatus"] })}>
                                                {["Installed", "Spare", "Not installed", "Removed"].map(status => <option key={status}>{status}</option>)}</select></label>
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Operational status</span>
                                            <select className={formStyles.input} value={tag.operationalStatus} onChange={e => updateTag(tag.id, { operationalStatus: e.target.value as TadTag["operationalStatus"] })}>
                                                {["Active", "Inactive", "Unknown"].map(status => <option key={status}>{status}</option>)}</select></label>
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Install date</span>
                                            <input type="date" className={formStyles.input} value={tag.installDate} onChange={e => updateTag(tag.id, { installDate: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Last maintenance</span>
                                            <input type="date" className={formStyles.input} value={tag.lastMaintenanceDate} onChange={e => updateTag(tag.id, { lastMaintenanceDate: e.target.value })} /></label>
                                        <label className="flex flex-col gap-1"><span className={formStyles.label}>Maintenance cycle</span>
                                            {(() => { const cycle = maintenanceCycleParts(tag.maintenanceCycle); return <div className="grid grid-cols-[minmax(0,1fr)_minmax(6rem,1fr)] gap-2">
                                                <input type="number" min="1" step="1" className={formStyles.input} value={cycle.amount}
                                                    onChange={e => updateTag(tag.id, { maintenanceCycle: `${e.target.value} ${cycle.unit}` })} />
                                                <select className={formStyles.input} value={cycle.unit} onChange={e => updateTag(tag.id, { maintenanceCycle: `${cycle.amount} ${e.target.value}` })}>
                                                    <option value="week">{Number(cycle.amount) === 1 ? "week" : "weeks"}</option>
                                                    <option value="month">{Number(cycle.amount) === 1 ? "month" : "months"}</option>
                                                    <option value="year">{Number(cycle.amount) === 1 ? "year" : "years"}</option>
                                                </select>
                                            </div> })()}</label>
                                        <div className="sm:col-span-2 xl:col-span-3 flex justify-end">
                                            <button type="button" className="text-sm font-semibold text-red-500" onClick={() => removeTag(tag.id)}>Remove tag</button>
                                        </div>
                                    </div>)}
                            </section>
                        </> }

                        {editorTab === "Parts Info" && <section className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-text">Parts list</h3>
                                <button className={formStyles.ghostButton} onClick={addPart} disabled={!isEditing}>+ Add part</button>
                            </div>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                                <input type="checkbox" className={formStyles.checkbox} checked={showLocation}
                                    onChange={e => setShowLocation(e.target.checked)} />
                                Track warehouse location
                            </label>
                            {selectedTad.parts.length === 0
                                ? <p className="text-sm text-text-muted">No parts recorded yet.</p>
                                : <div className="flex flex-col gap-3">
                                    {selectedTad.parts.map((part, index) =>
                                        <div key={part.id} className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-2 xl:grid-cols-3">
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Part number</span>
                                                <input className={formStyles.input} value={part.partNumber}
                                                    onChange={e => updatePart(part.id, { partNumber: e.target.value })} />
                                            </label>
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Customer number</span>
                                                <input className={formStyles.input} value={part.customerNumber ?? ""}
                                                    onChange={e => updatePart(part.id, { customerNumber: e.target.value })} />
                                            </label>
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Description</span>
                                                <input className={formStyles.input} value={part.description}
                                                    onChange={e => updatePart(part.id, { description: e.target.value })} />
                                            </label>
                                            {showLocation && <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Warehouse location</span>
                                                <input className={formStyles.input} value={part.location ?? ""}
                                                    onChange={e => updatePart(part.id, { location: e.target.value })} />
                                            </label>}
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>TAD item number</span>
                                                <input className={formStyles.input} value={part.tadItemNum}
                                                    onChange={e => updatePart(part.id, { tadItemNum: e.target.value })} />
                                            </label>
                                            {([
                                                ["Qty per valve", "qtyPerValve"],
                                                ["Qty used", "qtyUsed"],
                                                ["Qty in stock", "qtyInStock"],
                                                ["Qty needed", "qtyNeeded"],
                                                ["Qty to buy", "qtyToBuy"],
                                                ["Delivery (weeks)", "deliveryWeeks"],
                                            ] as const).map(([label, key]) =>
                                                <label key={key} className="flex flex-col gap-1">
                                                    <span className={formStyles.label}>{label}</span>
                                                    <input type="number" min="0" step="1" className={formStyles.input} value={part[key]}
                                                        onChange={e => updatePart(part.id, { [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                                                </label>)}
                                            <div className="flex items-end justify-end">
                                                <button className={formStyles.ghostButton} aria-label={`Remove part ${index + 1}`}
                                                    onClick={() => removePart(part.id)}>Remove</button>
                                            </div>
                                        </div>)}
                                </div>}
                        </section>}

                        {editorTab === "Image Upload" && <section className="flex flex-col gap-3">
                            <h3 className="font-semibold text-text">TAD drawing</h3>
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line px-4 py-5 text-center transition-colors hover:border-brand-green">
                                <span className="font-semibold text-brand-blue">{selectedTad.drawing ? "Replace drawing" : "Choose a drawing"}</span>
                                <span className="text-sm text-text-muted">Image or PDF files</span>
                                <input type="file" accept="image/*,.pdf,application/pdf" className="sr-only"
                                    onChange={e => { setDrawing(e.target.files?.[0]); e.target.value = "" }} />
                            </label>
                            {selectedTad.drawing &&
                                <div className="flex flex-col gap-2">
                                    <TadDrawingAttachment drawing={selectedTad.drawing}
                                        alt={`TAD drawing for ${selectedTad.name}`} />
                                    <button className={`${formStyles.ghostButton} self-start`}
                                        onClick={() => {
                                            if (selectedTad.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(selectedTad.drawing.url);
                                            update({ drawing: null });
                                        }}>Remove picture</button>
                                </div>}
                        </section>}
                        <div className="flex justify-between border-t border-line pt-4">
                            <button type="button" className={formStyles.ghostButton} disabled={editorTabIndex === 0}
                                onClick={() => setEditorTab(editorTabs[editorTabIndex - 1])}>Previous</button>
                            {editorTabIndex < editorTabs.length - 1 &&
                                <button type="button" className={formStyles.primaryButton}
                                    onClick={() => setEditorTab(editorTabs[editorTabIndex + 1])}>Continue</button>}
                        </div>
                        </fieldset>}

                        {!isEditing && <div className="flex flex-col gap-5">
                            <section>
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <h3 className="text-xl font-semibold text-text">{selectedTad.name || "Unnamed TAD"}</h3>
                                        <p className="text-sm text-text-muted">{selectedTad.tagNumber || "No tag number"}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-brand-light-green px-3 py-1 text-brand-green">{selectedTad.installationStatus}</span>
                                        <span className="rounded-full bg-main-background px-3 py-1 text-text-muted">{selectedTad.operationalStatus}</span>
                                    </div>
                                </div>
                                <div className="mb-3 flex items-center justify-between gap-2">
                                    <h4 className="font-semibold text-text">Tags</h4>
                                    <button className={formStyles.ghostButton} onClick={addTadAsset}>+ Add asset</button>
                                </div>
                                <div className="overflow-x-auto rounded border border-line">
                                    <table className="w-full border-collapse text-sm">
                                        <thead><tr className="bg-main-background text-left text-text-muted">
                                            {["Tag", "Install date", "Last maintenance", "Maintenance cycle"].map(label =>
                                                <th key={label} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{label}</th>)}
                                        </tr></thead>
                                        <tbody>{tadTags(selectedTad).map(tag =>
                                            <tr key={tag.id} className="border-b border-line last:border-0">
                                                <td className="whitespace-nowrap px-3 py-2 font-semibold text-text">{tag.tagNumber || "Unnamed tag"}</td>
                                                <td className="whitespace-nowrap px-3 py-2">{tag.installDate ? formatDate(tag.installDate) : "Not recorded"}</td>
                                                <td className="whitespace-nowrap px-3 py-2">{tag.lastMaintenanceDate ? formatDate(tag.lastMaintenanceDate) : "Not recorded"}</td>
                                                <td className="whitespace-nowrap px-3 py-2">                                                {formatMaintenanceCycle(tag.maintenanceCycle)}</td>
                                            </tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <section className="flex flex-col gap-3 border-t border-line pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h4 className="font-semibold text-text">Inventory linked to this drawing ({selectedTad.parts.length})</h4>
                                    <button className={formStyles.ghostButton} onClick={editTadInventory}>Edit inventory</button>
                                </div>
                                {selectedTad.parts.length === 0
                                    ? <p className="rounded border border-dashed border-line p-4 text-center text-sm text-text-muted">
                                        No inventory items are linked to this drawing yet.
                                    </p>
                                    : <div className="overflow-x-auto rounded border border-line">
                                        <table className="w-full border-collapse text-sm">
                                            <thead><tr className="bg-main-background text-left text-text-muted">
                                                {["Part #", "Description", "Location", "Qty / assembly", "In stock", "Needed", "To buy"].map(label =>
                                                    <th key={label} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{label}</th>)}
                                            </tr></thead>
                                            <tbody>
                                                {selectedTad.parts.map(part =>
                                                    <tr key={part.id} className="border-b border-line last:border-0">
                                                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-text">{part.partNumber || "—"}</td>
                                                        <td className="min-w-48 px-3 py-2">{part.description || "—"}</td>
                                                        <td className="whitespace-nowrap px-3 py-2">{part.location || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyPerValve}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyInStock}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyNeeded}</td>
                                                        <td className={`px-3 py-2 text-right tabular-nums ${part.qtyToBuy > 0 ? "font-bold text-red-500" : ""}`}>{part.qtyToBuy}</td>
                                                    </tr>)}
                                            </tbody>
                                        </table>
                                    </div>}
                            </section>
                            {selectedTad.drawing && <section className="flex flex-col gap-2 border-t border-line pt-4">
                                <h3 className="font-semibold text-text">Drawing</h3>
                                <TadDrawingAttachment drawing={selectedTad.drawing}
                                    alt={`TAD drawing for ${selectedTad.name}`} />
                            </section>}
                        </div>}

                        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                            {isEditing
                                ? <>
                                    <button className={formStyles.ghostButton} onClick={cancelEdit}>
                                        {isNewTad ? "Discard TAD" : "Cancel"}
                                    </button>
                                    <button className={formStyles.primaryButton} onClick={confirmTad}>
                                        {isNewTad ? "Confirm TAD" : "Confirm changes"}
                                    </button>
                                </>
                                : <>
                                    <button className={formStyles.ghostButton} onClick={beginEdit}>Edit TAD</button>
                                    <button className="rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
                                        onClick={() => setConfirmingDelete(true)}>
                                        Delete TAD
                                    </button>
                                </>}
                        </div>
                    </div>
                    : <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-text-muted">
                        Select a TAD to view and edit its details.
                    </div>}
            </div>}
        </section>

        <InventorySection
            tads={tads}
            selectedTadId={selectedTad?.id ?? ""}
            disabled={isEditing}
            onSelectTad={id => setSelectedId(id)}
            onAddPart={(tadId, part) => {
                const tad = tads.find(item => item.id === tadId)
                if (!tad) throw new Error(`Cannot add inventory to unknown TAD: ${tadId}`)
                onUpdateTad({ ...tad, parts: [...tad.parts, part] })
                setToast("Inventory item added.")
            }}
            onUpdatePart={(tadId, part) => {
                const tad = tads.find(item => item.id === tadId)
                if (!tad) throw new Error(`Cannot update inventory for unknown TAD: ${tadId}`)
                onUpdateTad({ ...tad, parts: tad.parts.map(existing => existing.id === part.id ? part : existing) })
                setToast("Inventory item updated.")
            }}
            onDeletePart={(tadId, partId) => {
                const tad = tads.find(item => item.id === tadId)
                if (!tad) throw new Error(`Cannot remove inventory from unknown TAD: ${tadId}`)
                onUpdateTad({ ...tad, parts: tad.parts.filter(part => part.id !== partId) })
                setToast("Inventory item removed.")
            }} />

        {confirmingDelete && selectedTad &&
            <Modal title="Delete TAD?" onClose={() => setConfirmingDelete(false)} footer={<>
                    <button className={formStyles.ghostButton} onClick={() => setConfirmingDelete(false)}>Cancel</button>
                    <button className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700 cursor-pointer"
                        onClick={deleteSelectedTad}>Delete permanently</button>
            </>}>
                    <p className="text-text">
                        Are you sure you want to permanently delete <strong>{selectedTad.name || "this TAD"}</strong>?
                        This action is permanent and cannot be undone.
                    </p>
            </Modal>}
        {toast &&
            <div role="status" aria-live="polite"
                className={`fixed right-5 top-5 z-50 rounded-lg bg-brand-green px-5 py-3 font-semibold text-white shadow-lg ${isToastExiting ? "toast-slide-out" : "toast-slide-in"}`}>
                {toast}
            </div>}
    </div>
}

export default PlantDetailView
import { Fragment, useEffect, useState } from 'react'
import { outageTypes, type Drawing, type Outage, type OutageType, type Plant, type Tad, type TadPart } from '../data/Data'
import { App } from "../components/Components"
import { Modal, formStyles } from '../components/Modal'

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
    tads,
    onAddOutage,
    onAddTad,
    onUpdateTad,
    onDeleteTad,
    onBack,
    backToTasks = false,
}: {
    plant: Plant,
    outages: Outage[],
    tads: Tad[],
    onAddOutage: (outage: Outage) => void,
    onAddTad: (tad: Tad) => void,
    onUpdateTad: (tad: Tad) => void,
    onDeleteTad: (id: string) => void,
    onBack: () => void,
    backToTasks?: boolean,
}): React.JSX.Element {

    /* State that holds the selected sidebar section */
    const [section, setSection] = useState<Section>("Outages");

    /* TAD to open when switching to Assets from an outage (null = none selected) */
    const [focusTadId, setFocusTadId] = useState<string | null>(null);

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

        {/* Top: back link and plant name, above the sidebar */}
        <App.Subtitle text={backToTasks ? "← Back to tasks" : "← All plants"} onClick={onBack}/>
        <App.Title text={plant.name} />
        <div className="border-b-2 border-brand-blue mb-6" />

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
                    tads={tads.filter(tad => tad.plant === plant.name)}
                    onAddOutage={onAddOutage}
                    onOpenTad={openTad} />}
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
function PlantOutages({ plant, outages, tads, onAddOutage, onOpenTad }: {
    plant: Plant,
    outages: Outage[],
    tads: Tad[],
    onAddOutage: (outage: Outage) => void,
    onOpenTad: (id: string) => void,
}): React.JSX.Element {
    const upcoming = upcomingOutages(plant, outages);

    /* Whether the Add outage popup is open */
    const [adding, setAdding] = useState(false);

    return <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl text-brand-blue">
                Upcoming Outages <span className="text-base font-normal text-text-muted">{upcoming.length}</span>
            </h2>
            <button className={formStyles.primaryButton} onClick={() => setAdding(true)}>+ Add outage</button>
        </div>

        {upcoming.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
                No upcoming outages scheduled. Click <b>+ Add outage</b> to schedule one.
            </p>
            : <ul className="flex flex-col gap-4">
                {upcoming.map((outage, index) =>
                    <li key={outage.id ?? `${outage.start}-${index}`}>
                        <OutageCard outage={outage} tads={tads} onOpenTad={onOpenTad} />
                    </li>)}
            </ul>}

        {adding &&
            <AddOutageModal
                plant={plant}
                tads={tads}
                onCreate={outage => { onAddOutage(outage); setAdding(false) }}
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
function OutageCard({ outage, tads, onOpenTad }: {
    outage: Outage,
    tads: Tad[],
    onOpenTad: (id: string) => void,
}): React.JSX.Element {
    /* Look up the outage's TADs (any that were deleted under Assets are skipped) */
    const outageTads = (outage.tadIds ?? [])
        .map(id => tads.find(tad => tad.id === id))
        .filter((tad): tad is Tad => Boolean(tad));
    const inProgress = outage.start <= todayString();

    return <article className="flex flex-col gap-4 rounded-lg border border-line bg-main-background-2 p-5">

        {/* Dates and type */}
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col">
                <span className="text-lg font-bold text-brand-blue" style={{ fontFamily: "var(--font-display)" }}>
                    {formatDate(outage.start)} – {formatDate(outage.end)}
                </span>
                <span className="text-sm text-text-muted">
                    {durationDays(outage.start, outage.end)} days{inProgress && " · in progress"}
                </span>
            </div>
            <OutageTypeBadge type={outage.type} />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Description</h3>
            <p className="whitespace-pre-line text-text">{outage.description}</p>
        </div>

        {/* Top Assembly Drawings (TADs) */}
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Top Assembly Drawings ({outageTads.length})
            </h3>
            {outageTads.length === 0
                ? <p className="text-sm text-text-muted">No TADs selected for this outage.</p>
                : <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
                    {outageTads.map(tad =>
                        <button key={tad.id}
                            onClick={() => onOpenTad(tad.id)}
                            title={`Open ${tad.name || "this TAD"} in Assets`}
                            className="group flex flex-col overflow-hidden rounded-lg border border-line bg-main-background text-left transition-colors hover:border-brand-green cursor-pointer">
                            <TadThumbnail tad={tad} className="h-24" />
                            <span className="flex flex-col border-t border-line px-2 py-1.5">
                                <span className="truncate text-sm font-semibold text-text group-hover:text-brand-green">{tad.name || "Unnamed TAD"}</span>
                                <span className="truncate text-xs text-text-muted">{tad.tagNumber || "No tag number"}</span>
                            </span>
                        </button>)}
                </div>}
        </div>
    </article>
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
    onCreate: (outage: Outage) => void,
    onClose: () => void,
}): React.JSX.Element {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [type, setType] = useState<OutageType>("Major");
    const [description, setDescription] = useState('');
    const [tadIds, setTadIds] = useState<string[]>([]);
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

        onCreate({
            id: `outage-${Date.now()}`,
            plant: plant.name,
            start,
            end,
            type,
            description: description.trim(),
            /* Keep the TADs in the same order they're listed under Assets */
            tadIds: tads.map(tad => tad.id).filter(id => tadIds.includes(id)),
        });
    }

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

            {/* Description */}
            <div className="flex flex-col gap-1">
                <label className={formStyles.label} htmlFor="outage-description">Description</label>
                <textarea id="outage-description" rows={4} className={formStyles.input + " resize-y"} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's being worked on, scope, affected units, contractors, notes..." />
            </div>

            {/* Pick existing TADs */}
            <fieldset className="flex flex-col gap-2">
                <legend className={formStyles.label + " mb-1"}>
                    Top Assembly Drawings <span className="text-text-muted">· {tadIds.length} of {tads.length} selected</span>
                </legend>

                {tads.length === 0
                    ? <p className="rounded-lg border border-dashed border-line p-5 text-center text-sm text-text-muted">
                        This plant doesn't have any TADs yet. Add them under <b>Assets</b>, then they'll show up here.
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
        <App.Subtitle text="Plant Info" />
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
 * A plant's Top Assembly Drawings and their editable parts lists
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
            nextMaintenanceDate: "",
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

    return <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="text-2xl text-brand-blue">Top Assembly Drawings</h2>
                <p className="mt-1 text-sm text-text-muted">{tads.length} TAD{tads.length === 1 ? "" : "s"} for this plant</p>
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
                                <span className="font-semibold text-brand-blue">{tad.name || "Unnamed TAD"}</span>
                                <span className="text-sm text-text-muted">{tad.tagNumber || "No tag number"} · {tad.installationStatus}</span>
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
                        {editorTab === "General Info" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>TAD name</span>
                                <input className={formStyles.input} value={selectedTad.name}
                                    onChange={e => update({ name: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Tag number (optional)</span>
                                <input className={formStyles.input} value={selectedTad.tagNumber}
                                    onChange={e => update({ tagNumber: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Installation status</span>
                                <select className={formStyles.input} value={selectedTad.installationStatus}
                                    onChange={e => update({ installationStatus: e.target.value as Tad["installationStatus"] })}>
                                    {["Installed", "Spare", "Not installed", "Removed"].map(status => <option key={status}>{status}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Operational status</span>
                                <select className={formStyles.input} value={selectedTad.operationalStatus}
                                    onChange={e => update({ operationalStatus: e.target.value as Tad["operationalStatus"] })}>
                                    {["Active", "Inactive", "Unknown"].map(status => <option key={status}>{status}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Install date</span>
                                <input type="date" className={formStyles.input} value={selectedTad.installDate}
                                    onChange={e => update({ installDate: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Last maintenance</span>
                                <input type="date" className={formStyles.input} value={selectedTad.lastMaintenanceDate}
                                    onChange={e => update({ lastMaintenanceDate: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1 sm:col-span-2">
                                <span className={formStyles.label}>Next maintenance due</span>
                                <input type="date" className={formStyles.input} value={selectedTad.nextMaintenanceDate}
                                    onChange={e => update({ nextMaintenanceDate: e.target.value })} />
                            </label>
                        </div>}

                        {editorTab === "Parts Info" && <section className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-brand-blue">Parts list</h3>
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
                            <h3 className="font-semibold text-brand-blue">TAD drawing</h3>
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
                                        <h3 className="text-xl font-semibold text-brand-blue">{selectedTad.name || "Unnamed TAD"}</h3>
                                        <p className="text-sm text-text-muted">{selectedTad.tagNumber || "No tag number"}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-brand-light-green px-3 py-1 text-brand-green">{selectedTad.installationStatus}</span>
                                        <span className="rounded-full bg-main-background px-3 py-1 text-text-muted">{selectedTad.operationalStatus}</span>
                                    </div>
                                </div>
                                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {[
                                        ["Install date", selectedTad.installDate ? formatDate(selectedTad.installDate) : "Not recorded"],
                                        ["Last maintenance", selectedTad.lastMaintenanceDate ? formatDate(selectedTad.lastMaintenanceDate) : "Not recorded"],
                                        ["Next maintenance", selectedTad.nextMaintenanceDate ? formatDate(selectedTad.nextMaintenanceDate) : "Not scheduled"],
                                    ].map(([label, value]) =>
                                        <div key={label} className="rounded border border-line bg-main-background px-3 py-2">
                                            <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
                                            <dd className="mt-1 font-medium text-text">{value}</dd>
                                        </div>)}
                                </dl>
                            </section>
                            <section className="flex flex-col gap-3 border-t border-line pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="font-semibold text-brand-blue">Parts ({selectedTad.parts.length})</h3>
                                    {selectedTad.parts.some(part => part.location) &&
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                                            <input type="checkbox" className={formStyles.checkbox} checked={showLocation}
                                                onChange={e => setShowLocation(e.target.checked)} />
                                            Warehouse location
                                        </label>}
                                </div>
                                {selectedTad.parts.length === 0
                                    ? <p className="rounded border border-dashed border-line p-5 text-center text-sm text-text-muted">No parts recorded.</p>
                                    : <div className="overflow-x-auto rounded border border-line">
                                        <table className="w-full border-collapse text-sm">
                                            <thead><tr className="bg-main-background text-left text-text-muted">
                                                {["Part #", "Customer #", "Description", ...(showLocation ? ["Location"] : []), "TAD item #", "Qty / valve", "Qty used", "In stock", "Qty needed", "Qty to buy", "Delivery (weeks)"].map(label =>
                                                    <th key={label} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{label}</th>)}
                                            </tr></thead>
                                            <tbody>
                                                {selectedTad.parts.map(part =>
                                                    <tr key={part.id} className="border-b border-line last:border-0">
                                                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-blue">{part.partNumber || "—"}</td>
                                                        <td className="whitespace-nowrap px-3 py-2">{part.customerNumber || "—"}</td>
                                                        <td className="min-w-48 px-3 py-2">{part.description || "—"}</td>
                                                        {showLocation && <td className="whitespace-nowrap px-3 py-2">{part.location || "—"}</td>}
                                                        <td className="whitespace-nowrap px-3 py-2">{part.tadItemNum || "—"}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyPerValve}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyUsed}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyInStock}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.qtyNeeded}</td>
                                                        <td className={`px-3 py-2 text-right tabular-nums ${part.qtyToBuy > 0 ? "font-bold text-red-500" : ""}`}>{part.qtyToBuy}</td>
                                                        <td className="px-3 py-2 text-right tabular-nums">{part.deliveryWeeks}</td>
                                                    </tr>)}
                                            </tbody>
                                        </table>
                                    </div>}
                            </section>
                            {selectedTad.drawing && <section className="flex flex-col gap-2 border-t border-line pt-4">
                                <h3 className="font-semibold text-brand-blue">Drawing</h3>
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
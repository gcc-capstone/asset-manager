import { Fragment, useEffect, useState } from 'react'
import db, { outageTypes, type Drawing, type Outage, type Plant, type Tda, type TdaPart } from '../data/Data'
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
    tdas,
    onAddOutage,
    onAddTda,
    onUpdateTda,
    onDeleteTda,
    onBack,
    backToTasks = false,
}: {
    plant: Plant,
    outages: Outage[],
    tdas: Tda[],
    onAddOutage: (outage: Outage) => void,
    onAddTda: (tda: Tda) => void,
    onUpdateTda: (tda: Tda) => void,
    onDeleteTda: (id: string) => void,
    onBack: () => void,
    backToTasks?: boolean,
}): React.JSX.Element {

    /* State that holds the selected sidebar section */
    const [section, setSection] = useState<Section>("Outages");

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
                        <button className="app-tab-button" onClick={() => setSection(name)}>
                            {name}
                        </button>
                    </div>
                )}
            </nav>

            {/* Right side: the selected section */}
            <div className="flex min-w-0 grow flex-col lg:px-6">
                {section === "Outages" && <PlantOutages plant={plant} outages={outages} onAddOutage={onAddOutage} />}
                {section === "Info" && <PlantInfo plant={plant} outages={outages} />}
                {section === "Assets" && <PlantAssets
                    plant={plant}
                    tdas={tdas.filter(tda => tda.plant === plant.name)}
                    onAddTda={onAddTda}
                    onUpdateTda={onUpdateTda}
                    onDeleteTda={onDeleteTda} />}
            </div>
        </div>
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Upcoming outages for a plant, each with its description and Top Assembly Drawings, plus an "Add outage" button
 */
function PlantOutages({ plant, outages, onAddOutage }: {
    plant: Plant,
    outages: Outage[],
    onAddOutage: (outage: Outage) => void,
}): React.JSX.Element {
    const upcoming = upcomingOutages(plant, outages);

    /* Whether the Add outage popup is open */
    const [adding, setAdding] = useState(false);

    /* The drawing open in the viewer popup (null = closed) */
    const [viewing, setViewing] = useState<Drawing | null>(null);

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
                        <OutageCard outage={outage} onViewDrawing={setViewing} />
                    </li>)}
            </ul>}

        {adding &&
            <AddOutageModal
                plant={plant}
                onCreate={outage => { onAddOutage(outage); setAdding(false) }}
                onClose={() => setAdding(false)} />}

        {viewing &&
            <DrawingViewer drawing={viewing} onClose={() => setViewing(null)} />}
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * One outage: dates, type, description, and its Top Assembly Drawings
 */
function OutageCard({ outage, onViewDrawing }: {
    outage: Outage,
    onViewDrawing: (drawing: Drawing) => void,
}): React.JSX.Element {
    const drawings = outage.drawings ?? [];
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm font-semibold text-text">
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                {outage.type}
            </span>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Description</h3>
            <p className="whitespace-pre-line text-text">{outage.description}</p>
        </div>

        {/* Top Assembly Drawings */}
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                Top Assembly Drawings ({drawings.length})
            </h3>
            {drawings.length === 0
                ? <p className="text-sm text-text-muted">No drawings attached.</p>
                : <div className="grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-3">
                    {drawings.map((drawing, index) =>
                        <button key={drawing.url + index} onClick={() => onViewDrawing(drawing)}
                            title={`View ${drawing.name}`}
                            className="group flex flex-col overflow-hidden rounded-lg border border-line bg-main-background text-left transition-colors hover:border-brand-green cursor-pointer">
                            {isPdf(drawing)
                                ? <span className="flex h-24 items-center justify-center text-2xl font-bold text-text-muted">PDF</span>
                                : <img src={drawing.url} alt="" className="h-24 w-full bg-white object-contain" />}
                            <span className="truncate border-t border-line px-2 py-1.5 text-xs text-text group-hover:text-brand-green">{drawing.name}</span>
                        </button>)}
                </div>}
        </div>
    </article>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Popup showing one drawing large (images inline, PDFs embedded with an "open in new tab" link)
 */
function DrawingViewer({ drawing, onClose }: { drawing: Drawing, onClose: () => void }): React.JSX.Element {
    return <Modal title={drawing.name} onClose={onClose} wide footer={<>
        <a href={drawing.url} target="_blank" rel="noreferrer" className={formStyles.ghostButton + " no-underline"}>Open in new tab</a>
        <button className={formStyles.primaryButton} onClick={onClose}>Close</button>
    </>}>
        {isPdf(drawing)
            ? <object data={drawing.url} type="application/pdf" className="h-[70vh] w-full rounded-lg bg-white">
                <p className="text-text-muted">This browser can't preview PDFs here. Use "Open in new tab".</p>
            </object>
            : <img src={drawing.url} alt={`Top Assembly Drawing: ${drawing.name}`}
                className="max-h-[70vh] w-full rounded-lg bg-white object-contain" />}
    </Modal>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Popup form for a new outage: dates, type, description, and Top Assembly Drawings (upload images/PDFs,
 * and optionally attach the plant's own TDA drawing if one is on file).
 */
function AddOutageModal({ plant, onCreate, onClose }: {
    plant: Plant,
    onCreate: (outage: Outage) => void,
    onClose: () => void,
}): React.JSX.Element {
    const plantDrawing = db.tdaDrawings[plant.name];

    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [type, setType] = useState(outageTypes[0]);
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [includePlantDrawing, setIncludePlantDrawing] = useState(Boolean(plantDrawing));
    const [error, setError] = useState('');

    /* Adds files picked in the file input (skips duplicates by name) */
    function addFiles(list: FileList | null) {
        if (!list) return;
        const picked = Array.from(list);
        setFiles(current => [...current, ...picked.filter(file => !current.some(existing => existing.name === file.name))]);
    }

    function create(e: React.FormEvent) {
        e.preventDefault();
        if (!start || !end) return setError('Pick a start and end date.');
        if (end < start) return setError('The end date must be on or after the start date.');
        if (end < todayString()) return setError('That outage has already ended. Only upcoming outages are listed here.');
        if (!description.trim()) return setError('Add a description of the outage.');

        /* Uploaded files get a temporary browser URL. Swap this for a real upload once there's a backend. */
        const drawings: Drawing[] = [
            ...(includePlantDrawing && plantDrawing ? [{ name: `${plant.name} TDA`, url: plantDrawing }] : []),
            ...files.map(file => ({ name: file.name, url: URL.createObjectURL(file) })),
        ];

        onCreate({
            id: `outage-${Date.now()}`,
            plant: plant.name,
            start,
            end,
            type,
            description: description.trim(),
            drawings,
        });
    }

    return <Modal title={`Add outage · ${plant.name}`} onClose={onClose} wide footer={<>
        {error && <span className="mr-auto text-sm text-red-500" role="alert">{error}</span>}
        <button className={formStyles.ghostButton} onClick={onClose}>Cancel</button>
        <button className={formStyles.primaryButton} type="submit" form="add-outage-form">Add outage</button>
    </>}>
        <form id="add-outage-form" onSubmit={create} className="flex flex-col gap-4">

            {/* Dates + type */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <div className="flex flex-col gap-1">
                    <label className={formStyles.label} htmlFor="outage-type">Type</label>
                    <select id="outage-type" className={formStyles.input} value={type} onChange={e => setType(e.target.value)}>
                        {outageTypes.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                </div>
            </div>
            {start && end && end >= start &&
                <p className="-mt-2 text-sm text-text-muted">{durationDays(start, end)} days</p>}

            {/* Description */}
            <div className="flex flex-col gap-1">
                <label className={formStyles.label} htmlFor="outage-description">Description</label>
                <textarea id="outage-description" rows={5} className={formStyles.input + " resize-y"} value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What's being worked on, scope, affected units, contractors, notes..." />
            </div>

            {/* Top Assembly Drawings */}
            <fieldset className="flex flex-col gap-2">
                <legend className={formStyles.label + " mb-1"}>Top Assembly Drawings</legend>

                {plantDrawing &&
                    <label className="flex cursor-pointer items-center gap-3 text-text">
                        <input type="checkbox" className={formStyles.checkbox} checked={includePlantDrawing}
                            onChange={e => setIncludePlantDrawing(e.target.checked)} />
                        Attach this plant's Top Assembly Drawing
                    </label>}

                <label htmlFor="outage-drawings"
                    className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line px-4 py-6 text-center transition-colors hover:border-brand-green">
                    <span className="font-semibold text-brand-blue">Choose drawing files</span>
                    <span className="text-sm text-text-muted">Images or PDFs · you can pick more than one</span>
                </label>
                <input id="outage-drawings" type="file" multiple accept="image/*,.pdf" className="sr-only"
                    onChange={e => { addFiles(e.target.files); e.target.value = '' }} />

                {files.length > 0 &&
                    <ul className="flex flex-col overflow-hidden rounded-lg border border-line">
                        {files.map((file, index) =>
                            <li key={file.name} className={`flex items-center gap-3 px-3 py-2 ${index > 0 ? 'border-t border-line' : ''}`}>
                                <span className="min-w-0 flex-1 truncate text-sm text-text">{file.name}</span>
                                <span className="shrink-0 text-xs text-text-muted">{Math.max(1, Math.round(file.size / 1024))} KB</span>
                                <button type="button" aria-label={`Remove ${file.name}`}
                                    onClick={() => setFiles(current => current.filter(f => f !== file))}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-base leading-none text-text-muted hover:text-red-500 cursor-pointer">
                                    ×
                                </button>
                            </li>)}
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
 * A plant's top assembly drawings and their editable parts lists
 */
function PlantAssets({ plant, tdas, onAddTda, onUpdateTda, onDeleteTda }: {
    plant: Plant,
    tdas: Tda[],
    onAddTda: (tda: Tda) => void,
    onUpdateTda: (tda: Tda) => void,
    onDeleteTda: (id: string) => void,
}): React.JSX.Element {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [draftTda, setDraftTda] = useState<Tda | null>(null);
    const [isNewTda, setIsNewTda] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [toast, setToast] = useState("");
    const [isToastExiting, setIsToastExiting] = useState(false);
    const [showLocation, setShowLocation] = useState(true);
    const [editorTab, setEditorTab] = useState<"General Info" | "Parts Info" | "Image Upload">("General Info");
    const editorTabs = ["General Info", "Parts Info", "Image Upload"] as const;
    const editorTabIndex = editorTabs.indexOf(editorTab);
    const selectedTda = draftTda?.id === selectedId
        ? draftTda
        : tdas.find(tda => tda.id === selectedId) ?? null;
    const visibleTdas = draftTda && isNewTda ? [...tdas, draftTda] : tdas;

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

    function addTda() {
        if (draftTda?.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(draftTda.drawing.url);
        const tda: Tda = {
            id: `tda-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            plant: plant.name,
            name: "New TDA",
            tagNumber: "",
            installationStatus: "Not installed",
            operationalStatus: "Unknown",
            installDate: "",
            lastMaintenanceDate: "",
            nextMaintenanceDate: "",
            drawing: null,
            parts: [],
        };
        setDraftTda(tda);
        setIsNewTda(true);
        setIsEditing(true);
        setEditorTab("General Info");
        setSelectedId(tda.id);
    }

    function update(patch: Partial<Tda>) {
        if (selectedTda && isEditing) setDraftTda({ ...selectedTda, ...patch });
    }

    function updatePart(partId: string, patch: Partial<TdaPart>) {
        if (selectedTda) {
            update({ parts: selectedTda.parts.map(part => part.id === partId ? { ...part, ...patch } : part) });
        }
    }

    function addPart() {
        if (!selectedTda) return;
        update({
            parts: [...selectedTda.parts, {
                id: `part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                partNumber: "",
                customerNumber: "",
                location: "",
                description: "",
                taItemNum: "",
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
        if (selectedTda) update({ parts: selectedTda.parts.filter(part => part.id !== partId) });
    }

    function setDrawing(file: File | undefined) {
        if (!file) return;
        update({ drawing: { name: file.name, url: URL.createObjectURL(file) } });
    }

    function beginEdit() {
        if (!selectedTda) return;
        setDraftTda({ ...selectedTda, parts: selectedTda.parts.map(part => ({ ...part })) });
        setIsNewTda(false);
        setIsEditing(true);
        setEditorTab("General Info");
    }

    function confirmTda() {
        if (!selectedTda || !isEditing) return;

        const savedTda = draftTda ?? selectedTda;
        const previousTda = tdas.find(tda => tda.id === savedTda.id);
        if (previousTda?.drawing?.url.startsWith("blob:")
            && previousTda.drawing.url !== savedTda.drawing?.url) {
            URL.revokeObjectURL(previousTda.drawing.url);
        }

        if (isNewTda) {
            onAddTda(savedTda);
            setToast("TDA added.");
        } else {
            onUpdateTda(savedTda);
            setToast("TDA changes saved.");
        }
        setDraftTda(null);
        setIsNewTda(false);
        setIsEditing(false);
    }

    function cancelEdit() {
        if (!selectedTda) return;
        const original = tdas.find(tda => tda.id === selectedTda.id);
        if (selectedTda.drawing?.url.startsWith("blob:")
            && selectedTda.drawing.url !== original?.drawing?.url) {
            URL.revokeObjectURL(selectedTda.drawing.url);
        }
        if (isNewTda) setSelectedId(null);
        setDraftTda(null);
        setIsNewTda(false);
        setIsEditing(false);
    }

    function deleteSelectedTda() {
        if (!selectedTda) return;
        if (selectedTda.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(selectedTda.drawing.url);
        onDeleteTda(selectedTda.id);
        setSelectedId(null);
        setConfirmingDelete(false);
    }

    return <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h2 className="text-2xl text-brand-blue">Top Assembly Drawings</h2>
                <p className="mt-1 text-sm text-text-muted">{tdas.length} TDA{tdas.length === 1 ? "" : "s"} for this plant</p>
            </div>
            <div className="flex flex-wrap gap-2">
                <button className={formStyles.ghostButton} disabled title="Excel export will be available once the spreadsheet format is defined.">
                    Export to Excel
                </button>
                <button className={formStyles.primaryButton} onClick={addTda} disabled={isEditing}>+ Add TDA</button>
            </div>
        </div>

        {visibleTdas.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
                No TDAs on file for this plant. Add one to record its details and parts.
            </p>
            : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.5fr)]">
                <ul className="flex flex-col gap-2">
                    {visibleTdas.map(tda =>
                        <li key={tda.id}>
                            <button disabled={isEditing && selectedId !== tda.id} onClick={() => {
                                if (selectedId === tda.id) return;
                                if (draftTda?.drawing?.url.startsWith("blob:")
                                    && draftTda.drawing.url !== tdas.find(item => item.id === draftTda.id)?.drawing?.url) {
                                    URL.revokeObjectURL(draftTda.drawing.url);
                                }
                                setDraftTda(null);
                                setIsNewTda(false);
                                setIsEditing(false);
                                setSelectedId(tda.id);
                            }}
                                className={`flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${selectedId === tda.id ? "border-brand-green bg-main-background-2" : "border-line hover:border-brand-blue"}`}>
                                <span className="font-semibold text-brand-blue">{tda.name || "Unnamed TDA"}</span>
                                <span className="text-sm text-text-muted">{tda.tagNumber || "No tag number"} · {tda.installationStatus}</span>
                            </button>
                        </li>)}
                </ul>
                {selectedTda
                    ? <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-main-background-2 p-5">
                        {isEditing && <div role="tablist" aria-label="TDA details" className="grid grid-cols-3 border-b border-line">
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
                                <span className={formStyles.label}>TDA name</span>
                                <input className={formStyles.input} value={selectedTda.name}
                                    onChange={e => update({ name: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Tag number (optional)</span>
                                <input className={formStyles.input} value={selectedTda.tagNumber}
                                    onChange={e => update({ tagNumber: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Installation status</span>
                                <select className={formStyles.input} value={selectedTda.installationStatus}
                                    onChange={e => update({ installationStatus: e.target.value as Tda["installationStatus"] })}>
                                    {["Installed", "Spare", "Not installed", "Removed"].map(status => <option key={status}>{status}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Operational status</span>
                                <select className={formStyles.input} value={selectedTda.operationalStatus}
                                    onChange={e => update({ operationalStatus: e.target.value as Tda["operationalStatus"] })}>
                                    {["Active", "Inactive", "Unknown"].map(status => <option key={status}>{status}</option>)}
                                </select>
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Install date</span>
                                <input type="date" className={formStyles.input} value={selectedTda.installDate}
                                    onChange={e => update({ installDate: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1">
                                <span className={formStyles.label}>Last maintenance</span>
                                <input type="date" className={formStyles.input} value={selectedTda.lastMaintenanceDate}
                                    onChange={e => update({ lastMaintenanceDate: e.target.value })} />
                            </label>
                            <label className="flex flex-col gap-1 sm:col-span-2">
                                <span className={formStyles.label}>Next maintenance due</span>
                                <input type="date" className={formStyles.input} value={selectedTda.nextMaintenanceDate}
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
                            {selectedTda.parts.length === 0
                                ? <p className="text-sm text-text-muted">No parts recorded yet.</p>
                                : <div className="flex flex-col gap-3">
                                    {selectedTda.parts.map((part, index) =>
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
                                                <span className={formStyles.label}>TA item number</span>
                                                <input className={formStyles.input} value={part.taItemNum}
                                                    onChange={e => updatePart(part.id, { taItemNum: e.target.value })} />
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
                            <h3 className="font-semibold text-brand-blue">TDA picture</h3>
                            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line px-4 py-5 text-center transition-colors hover:border-brand-green">
                                <span className="font-semibold text-brand-blue">{selectedTda.drawing ? "Replace drawing" : "Choose a picture"}</span>
                                <span className="text-sm text-text-muted">Image files</span>
                                <input type="file" accept="image/*" className="sr-only"
                                    onChange={e => { setDrawing(e.target.files?.[0]); e.target.value = "" }} />
                            </label>
                            {selectedTda.drawing &&
                                <div className="flex flex-col gap-2">
                                    <img src={selectedTda.drawing.url} alt={`TDA drawing for ${selectedTda.name}`}
                                        className="max-h-96 max-w-full self-start rounded-lg border-2 border-brand-blue bg-white object-contain" />
                                    <button className={`${formStyles.ghostButton} self-start`}
                                        onClick={() => {
                                            if (selectedTda.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(selectedTda.drawing.url);
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
                                        <h3 className="text-xl font-semibold text-brand-blue">{selectedTda.name || "Unnamed TDA"}</h3>
                                        <p className="text-sm text-text-muted">{selectedTda.tagNumber || "No tag number"}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-brand-light-green px-3 py-1 text-brand-green">{selectedTda.installationStatus}</span>
                                        <span className="rounded-full bg-main-background px-3 py-1 text-text-muted">{selectedTda.operationalStatus}</span>
                                    </div>
                                </div>
                                <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {[
                                        ["Install date", selectedTda.installDate ? formatDate(selectedTda.installDate) : "Not recorded"],
                                        ["Last maintenance", selectedTda.lastMaintenanceDate ? formatDate(selectedTda.lastMaintenanceDate) : "Not recorded"],
                                        ["Next maintenance", selectedTda.nextMaintenanceDate ? formatDate(selectedTda.nextMaintenanceDate) : "Not scheduled"],
                                    ].map(([label, value]) =>
                                        <div key={label} className="rounded border border-line bg-main-background px-3 py-2">
                                            <dt className="text-xs font-semibold uppercase text-text-muted">{label}</dt>
                                            <dd className="mt-1 font-medium text-text">{value}</dd>
                                        </div>)}
                                </dl>
                            </section>
                            <section className="flex flex-col gap-3 border-t border-line pt-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <h3 className="font-semibold text-brand-blue">Parts ({selectedTda.parts.length})</h3>
                                    {selectedTda.parts.some(part => part.location) &&
                                        <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                                            <input type="checkbox" className={formStyles.checkbox} checked={showLocation}
                                                onChange={e => setShowLocation(e.target.checked)} />
                                            Warehouse location
                                        </label>}
                                </div>
                                {selectedTda.parts.length === 0
                                    ? <p className="rounded border border-dashed border-line p-5 text-center text-sm text-text-muted">No parts recorded.</p>
                                    : <div className="overflow-x-auto rounded border border-line">
                                        <table className="w-full border-collapse text-sm">
                                            <thead><tr className="bg-main-background text-left text-text-muted">
                                                {["Part #", "Customer #", "Description", ...(showLocation ? ["Location"] : []), "TA item #", "Qty / valve", "Qty used", "In stock", "Qty needed", "Qty to buy", "Delivery (weeks)"].map(label =>
                                                    <th key={label} className="whitespace-nowrap border-b border-line px-3 py-2 font-semibold">{label}</th>)}
                                            </tr></thead>
                                            <tbody>
                                                {selectedTda.parts.map(part =>
                                                    <tr key={part.id} className="border-b border-line last:border-0">
                                                        <td className="whitespace-nowrap px-3 py-2 font-semibold text-brand-blue">{part.partNumber || "—"}</td>
                                                        <td className="whitespace-nowrap px-3 py-2">{part.customerNumber || "—"}</td>
                                                        <td className="min-w-48 px-3 py-2">{part.description || "—"}</td>
                                                        {showLocation && <td className="whitespace-nowrap px-3 py-2">{part.location || "—"}</td>}
                                                        <td className="whitespace-nowrap px-3 py-2">{part.taItemNum || "—"}</td>
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
                            {selectedTda.drawing && <section className="flex flex-col gap-2 border-t border-line pt-4">
                                <h3 className="font-semibold text-brand-blue">Drawing</h3>
                                <img src={selectedTda.drawing.url} alt={`TDA drawing for ${selectedTda.name}`}
                                    className="max-h-96 max-w-full self-start rounded border border-line bg-white object-contain" />
                            </section>}
                        </div>}

                        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
                            {isEditing
                                ? <>
                                    <button className={formStyles.ghostButton} onClick={cancelEdit}>
                                        {isNewTda ? "Discard TDA" : "Cancel"}
                                    </button>
                                    <button className={formStyles.primaryButton} onClick={confirmTda}>
                                        {isNewTda ? "Confirm TDA" : "Confirm changes"}
                                    </button>
                                </>
                                : <>
                                    <button className={formStyles.ghostButton} onClick={beginEdit}>Edit TDA</button>
                                    <button className="rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
                                        onClick={() => setConfirmingDelete(true)}>
                                        Delete TDA
                                    </button>
                                </>}
                        </div>
                    </div>
                    : <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-line p-6 text-center text-text-muted">
                        Select a TDA to view and edit its details.
                    </div>}
            </div>}
        {confirmingDelete && selectedTda &&
            <Modal title="Delete TDA?" onClose={() => setConfirmingDelete(false)} footer={<>
                    <button className={formStyles.ghostButton} onClick={() => setConfirmingDelete(false)}>Cancel</button>
                    <button className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white transition-colors hover:bg-red-700 cursor-pointer"
                        onClick={deleteSelectedTda}>Delete permanently</button>
            </>}>
                    <p className="text-text">
                        Are you sure you want to permanently delete <strong>{selectedTda.name || "this TDA"}</strong>?
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
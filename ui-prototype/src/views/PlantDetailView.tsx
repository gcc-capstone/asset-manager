import { Fragment, useState } from 'react'
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
 * The plant's Top Assembly Drawing (TDA), or a placeholder if there isn't one yet
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
    const selectedTda = tdas.find(tda => tda.id === selectedId) ?? null;

    function addTda() {
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
        onAddTda(tda);
        setSelectedId(tda.id);
    }

    function update(patch: Partial<Tda>) {
        if (selectedTda) onUpdateTda({ ...selectedTda, ...patch });
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
                name: "",
                installedQuantity: 0,
                spareQuantity: 0,
            }],
        });
    }

    function removePart(partId: string) {
        if (selectedTda) update({ parts: selectedTda.parts.filter(part => part.id !== partId) });
    }

    function setDrawing(file: File | undefined) {
        if (!file) return;
        if (selectedTda?.drawing?.url.startsWith("blob:")) URL.revokeObjectURL(selectedTda.drawing.url);
        update({ drawing: { name: file.name, url: URL.createObjectURL(file) } });
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
                <button className={formStyles.primaryButton} onClick={addTda}>+ Add TDA</button>
            </div>
        </div>

        {tdas.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
                No TDAs on file for this plant. Add one to record its details and parts.
            </p>
            : <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(14rem,0.7fr)_minmax(0,1.5fr)]">
                <ul className="flex flex-col gap-2">
                    {tdas.map(tda =>
                        <li key={tda.id}>
                            <button onClick={() => setSelectedId(tda.id)}
                                className={`flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${selectedId === tda.id ? "border-brand-green bg-main-background-2" : "border-line hover:border-brand-blue"}`}>
                                <span className="font-semibold text-brand-blue">{tda.name || "Unnamed TDA"}</span>
                                <span className="text-sm text-text-muted">{tda.tagNumber || "No tag number"} · {tda.installationStatus}</span>
                            </button>
                        </li>)}
                </ul>
                {selectedTda
                    ? <div className="flex min-w-0 flex-col gap-5 rounded-lg border border-line bg-main-background-2 p-5">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        </div>

                        <section className="flex flex-col gap-3 border-t border-line pt-4">
                            <div className="flex items-center justify-between gap-3">
                                <h3 className="font-semibold text-brand-blue">Parts list</h3>
                                <button className={formStyles.ghostButton} onClick={addPart}>+ Add part</button>
                            </div>
                            {selectedTda.parts.length === 0
                                ? <p className="text-sm text-text-muted">No parts recorded yet.</p>
                                : <div className="flex flex-col gap-3">
                                    {selectedTda.parts.map((part, index) =>
                                        <div key={part.id} className="grid grid-cols-1 gap-2 rounded-lg border border-line p-3 sm:grid-cols-2">
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Part number</span>
                                                <input className={formStyles.input} value={part.partNumber}
                                                    onChange={e => updatePart(part.id, { partNumber: e.target.value })} />
                                            </label>
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Part name</span>
                                                <input className={formStyles.input} value={part.name}
                                                    onChange={e => updatePart(part.id, { name: e.target.value })} />
                                            </label>
                                            <label className="flex flex-col gap-1">
                                                <span className={formStyles.label}>Installed quantity</span>
                                                <input type="number" min="0" step="1" className={formStyles.input} value={part.installedQuantity}
                                                    onChange={e => updatePart(part.id, { installedQuantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                                            </label>
                                            <div className="flex items-end gap-2">
                                                <label className="flex flex-1 flex-col gap-1">
                                                    <span className={formStyles.label}>Spare quantity</span>
                                                    <input type="number" min="0" step="1" className={formStyles.input} value={part.spareQuantity}
                                                        onChange={e => updatePart(part.id, { spareQuantity: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} />
                                                </label>
                                                <button className={formStyles.ghostButton} aria-label={`Remove part ${index + 1}`}
                                                    onClick={() => removePart(part.id)}>Remove</button>
                                            </div>
                                        </div>)}
                                </div>}
                        </section>

                        <section className="flex flex-col gap-3 border-t border-line pt-4">
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
                        </section>

                        <div className="flex justify-end border-t border-line pt-4">
                            <button className="rounded-lg border border-red-500 px-4 py-2 font-semibold text-red-500 transition-colors hover:bg-red-500 hover:text-white cursor-pointer"
                                onClick={() => setConfirmingDelete(true)}>
                                Delete TDA
                            </button>
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
    </div>
}

export default PlantDetailView
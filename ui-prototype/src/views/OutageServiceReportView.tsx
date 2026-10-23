import { useState } from "react"
import type { Outage, Plant, Tad } from "../data/Data"
import { App } from "../components/Components"
import { formStyles } from "../components/Modal"

type UsedAsset = {
    id: string,
    tadId: string,
    workPerformed: string,
}

type ServicePart = {
    id: string,
    tadId: string,
    partId: string,
    quantity: string,
}

function OutageServiceReportView({ plant, outage, tads, onBack, onReportSubmitted }: {
    plant: Plant,
    outage: Outage,
    tads: Tad[],
    onBack: () => void,
    onReportSubmitted: () => void,
}): React.JSX.Element {
    const [saved, setSaved] = useState(false)
    const [plantName, setPlantName] = useState(plant.name)
    const [site, setSite] = useState(`${plant.county} County`)
    const [outageDescription, setOutageDescription] = useState(outage.description)
    const [outageStart, setOutageStart] = useState(outage.start)
    const [outageEnd, setOutageEnd] = useState(outage.end)
    const [customer, setCustomer] = useState("")
    const [technician, setTechnician] = useState("")
    const [technicianEmail, setTechnicianEmail] = useState("")
    const [customerContact, setCustomerContact] = useState("")
    const [contactPhone, setContactPhone] = useState("")
    const [contactEmail, setContactEmail] = useState("")
    const [notes, setNotes] = useState("")
    const [assets, setAssets] = useState<UsedAsset[]>([])
    const [parts, setParts] = useState<ServicePart[]>([])
    const [images, setImages] = useState<File[]>([])

    function updateAsset(id: string, patch: Partial<Omit<UsedAsset, "id">>) {
        setAssets(current => current.map(asset => asset.id === id ? { ...asset, ...patch } : asset))
        setSaved(false)
    }

    function updatePart(id: string, patch: Partial<Omit<ServicePart, "id">>) {
        setParts(current => current.map(part => part.id === id ? { ...part, ...patch } : part))
        setSaved(false)
    }

    function input(label: string, value: string, onChange: (value: string) => void, type = "text") {
        return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-brand-blue">
            {label}
            <input className={formStyles.input} type={type} value={value}
                onChange={event => { onChange(event.target.value); setSaved(false) }} />
        </label>
    }

    function select(label: string, value: string, onChange: (value: string) => void, options: { value: string, label: string }[]) {
        return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-brand-blue">
            {label}
            <select className={formStyles.input} value={value}
                onChange={event => { onChange(event.target.value); setSaved(false) }}>
                <option value="">Select {label.toLowerCase()}</option>
                {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
        </label>
    }

    const assetOptions = tads.map(tad => ({
        value: tad.id,
        label: `${tad.name} · ${tad.tagNumber || "No tag number"}`,
    }))
    const partOptions = tads.flatMap(tad => tad.parts.map(part => ({
        value: `${tad.id}:${part.id}`,
        label: `${part.partNumber} · ${part.description} (${tad.tagNumber || tad.name})`,
    })))

    return <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header>
            <button type="button" className="mb-3 text-sm font-semibold text-brand-blue hover:text-brand-green" onClick={onBack}>
                ← Back to outage
            </button>
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-brand-green">DO1 · Contractor portal</p>
            <App.Title text="Service report" />
            <p className="app-label-text -mt-3 text-base opacity-75">Record work performed during this plant outage.</p>
        </header>

        <form className="flex flex-col gap-5" onSubmit={event => {
            event.preventDefault()
            setSaved(true)
            onReportSubmitted()
        }}>
            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-bold text-brand-blue">Report & assignment</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {input("Assigned plant", plantName, setPlantName)}
                    {input("Site / county", site, setSite)}
                    {input("Outage", outageDescription, setOutageDescription)}
                    {input("Outage start", outageStart, setOutageStart, "date")}
                    {input("Outage end", outageEnd, setOutageEnd, "date")}
                    {input("Customer / company name", customer, setCustomer)}
                </div>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-bold text-brand-blue">Technician & customer contacts</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {input("Lead technician", technician, setTechnician)}
                    {input("Technician email", technicianEmail, setTechnicianEmail, "email")}
                    {input("Customer contact", customerContact, setCustomerContact)}
                    {input("Contact phone", contactPhone, setContactPhone, "tel")}
                    {input("Contact email", contactEmail, setContactEmail, "email")}
                </div>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue">Assets used</h2>
                        <p className="text-sm text-text-muted">Choose assets from this plant's TADs.</p>
                    </div>
                    <button className={formStyles.ghostButton} type="button"
                        disabled={assetOptions.length === 0}
                        onClick={() => { setAssets(current => [...current, { id: crypto.randomUUID(), tadId: "", workPerformed: "" }]); setSaved(false) }}>
                        + Add asset
                    </button>
                </div>
                {tads.length === 0
                    ? <p className="text-sm text-text-muted">No TADs are available for this plant.</p>
                    : assets.length === 0
                        ? <p className="text-sm text-text-muted">No assets added yet.</p>
                        : <div className="flex flex-col gap-4">
                            {assets.map((asset, index) => {
                                const tad = tads.find(item => item.id === asset.tadId)
                                return <div key={asset.id} className="rounded-lg border border-brand-light-blue bg-main-background p-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-bold text-brand-blue">Asset {index + 1}</h3>
                                        <button className="text-sm font-bold text-red-700" type="button"
                                            onClick={() => { setAssets(current => current.filter(item => item.id !== asset.id)); setSaved(false) }}>
                                            Remove
                                        </button>
                                    </div>
                                    {select("Plant TAD / asset", asset.tadId, tadId => updateAsset(asset.id, { tadId }), assetOptions)}
                                    {tad && <p className="mt-2 text-sm text-text-muted">
                                        Tag: {tad.tagNumber || "Not recorded"} · {tad.installationStatus} · {tad.operationalStatus}
                                    </p>}
                                    <label className="mt-4 flex flex-col gap-1.5 text-sm font-bold text-brand-blue">
                                        Work performed
                                        <textarea className={`${formStyles.input} min-h-20 resize-y`} value={asset.workPerformed}
                                            onChange={event => updateAsset(asset.id, { workPerformed: event.target.value })}
                                            placeholder="Describe the work performed on this asset..." />
                                    </label>
                                </div>
                            })}
                        </div>}
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue">Parts serviced</h2>
                        <p className="text-sm text-text-muted">Choose inventory parts linked to this plant's TADs.</p>
                    </div>
                    <button className={formStyles.ghostButton} type="button"
                        disabled={partOptions.length === 0}
                        onClick={() => { setParts(current => [...current, { id: crypto.randomUUID(), tadId: "", partId: "", quantity: "" }]); setSaved(false) }}>
                        + Add part
                    </button>
                </div>
                {partOptions.length === 0
                    ? <p className="text-sm text-text-muted">No inventory parts are available on this plant's TADs.</p>
                    : parts.length === 0
                        ? <p className="text-sm text-text-muted">No parts added yet.</p>
                        : <div className="flex flex-col gap-4">
                            {parts.map((part, index) => {
                                const [tadId = "", partId = ""] = part.partId.split(":")
                                const tad = tads.find(item => item.id === tadId)
                                const inventoryPart = tad?.parts.find(item => item.id === partId)
                                return <div key={part.id} className="rounded-lg border border-brand-light-blue bg-main-background p-3">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-bold text-brand-blue">Part {index + 1}</h3>
                                        <button className="text-sm font-bold text-red-700" type="button"
                                            onClick={() => { setParts(current => current.filter(item => item.id !== part.id)); setSaved(false) }}>
                                            Remove
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <div className="sm:col-span-2">
                                            {select("TAD inventory part", part.partId, partId => updatePart(part.id, { partId }), partOptions)}
                                        </div>
                                        {input("Quantity serviced", part.quantity, quantity => updatePart(part.id, { quantity }), "number")}
                                        {inventoryPart && <div className="flex flex-col justify-center text-sm text-text-muted">
                                            <span>Part #: {inventoryPart.partNumber}</span>
                                            <span>{inventoryPart.description}</span>
                                            <span>Asset: {tad?.tagNumber || tad?.name}</span>
                                        </div>}
                                    </div>
                                </div>
                            })}
                        </div>}
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-3 text-xl font-bold text-brand-blue">Work notes</h2>
                <textarea className={`${formStyles.input} min-h-28 resize-y`} value={notes}
                    onChange={event => { setNotes(event.target.value); setSaved(false) }}
                    placeholder="Add notes about the service performed..." />
                <div className="mt-4 flex flex-col gap-3">
                    <label className="text-sm font-bold text-brand-blue" htmlFor="work-note-images">Attach images</label>
                    <input id="work-note-images" className={formStyles.input} type="file" accept="image/*" multiple
                        onChange={event => {
                            const selectedImages = Array.from(event.target.files ?? [])
                            if (selectedImages.length) {
                                setImages(current => [...current, ...selectedImages])
                                setSaved(false)
                            }
                            event.target.value = ""
                        }} />
                    {images.length > 0 && <ul className="flex flex-col gap-2">
                        {images.map((image, index) =>
                            <li key={`${image.name}-${image.lastModified}-${index}`}
                                className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm">
                                <span className="truncate text-text">{image.name}</span>
                                <button className="shrink-0 font-bold text-red-700" type="button"
                                    onClick={() => { setImages(current => current.filter((_, imageIndex) => imageIndex !== index)); setSaved(false) }}>
                                    Remove
                                </button>
                            </li>)}
                    </ul>}
                </div>
            </section>

            <div>
                <button className={`${formStyles.primaryButton} w-full sm:w-auto`} type="submit">Save service report</button>
                {saved && <p className="mt-2 text-sm font-bold text-brand-green" role="status">Report saved in this demo.</p>}
            </div>
        </form>
    </div>
}

export default OutageServiceReportView

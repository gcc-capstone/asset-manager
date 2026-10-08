import { useState } from 'react'
import { App } from '../components/Components'

type Asset = {
    name: string,
    tag: string,
    condition: string,
}

type Part = {
    id: string,
    name: string,
    assets: Asset[],
}

type Plant = {
    id: string,
    name: string,
    location: string,
}

const companyName = 'Buehler, LLC'

const plants: Plant[] = [
    { id: 'riverside', name: 'Riverside Power Plant', location: 'Beaver County, PA' },
    { id: 'north-ridge', name: 'North Ridge Energy Center', location: 'Lancaster County, PA' },
    { id: 'pine-creek', name: 'Pine Creek Generating Station', location: 'York County, PA' },
]

const initialParts: Record<string, Part[]> = {
    riverside: [
        {
            id: 'riverside-feedwater-pump',
            name: 'Feedwater Pump',
            assets: [
                { name: 'Pump Motor', tag: 'RIV-PMP-102', condition: 'Operational' },
                { name: 'Discharge Valve', tag: 'RIV-VLV-108', condition: 'Inspection due' },
            ],
        },
        {
            id: 'riverside-turbine',
            name: 'Steam Turbine',
            assets: [
                { name: 'High-Pressure Rotor', tag: 'RIV-TUR-201', condition: 'Operational' },
                { name: 'Bearing Assembly', tag: 'RIV-BRG-204', condition: 'Operational' },
            ],
        },
        { id: 'riverside-cooling-system', name: 'Cooling System', assets: [] },
    ],
    'north-ridge': [
        {
            id: 'north-ridge-generator',
            name: 'Generator',
            assets: [
                { name: 'Stator Assembly', tag: 'NRG-GEN-110', condition: 'Operational' },
                { name: 'Exciter', tag: 'NRG-EXC-112', condition: 'Maintenance scheduled' },
            ],
        },
        { id: 'north-ridge-boiler', name: 'Boiler Feed System', assets: [] },
    ],
    'pine-creek': [
        {
            id: 'pine-creek-condenser',
            name: 'Surface Condenser',
            assets: [
                { name: 'Tube Bundle', tag: 'PCG-CND-305', condition: 'Operational' },
            ],
        },
        { id: 'pine-creek-compressor', name: 'Air Compressor', assets: [] },
    ],
}

function CompaniesView(): React.JSX.Element {
    const [selectedPlantId, setSelectedPlantId] = useState<string | null>(null)
    const [partsByPlant, setPartsByPlant] = useState(initialParts)
    const [newPartName, setNewPartName] = useState('')
    const [editingPartId, setEditingPartId] = useState<string | null>(null)
    const [editedPartName, setEditedPartName] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const selectedPlant = plants.find((plant) => plant.id === selectedPlantId)
    const parts = selectedPlantId ? partsByPlant[selectedPlantId] ?? [] : []

    function addPart(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const name = newPartName.trim()
        if (!name) {
            setErrorMessage('Enter a part name before adding it.')
            return
        }
        if (!selectedPlantId) return

        setPartsByPlant((currentParts) => ({
            ...currentParts,
            [selectedPlantId]: [
                ...(currentParts[selectedPlantId] ?? []),
                { id: crypto.randomUUID(), name, assets: [] },
            ],
        }))
        setNewPartName('')
        setErrorMessage('')
    }

    function savePart(event: React.FormEvent<HTMLFormElement>, partId: string) {
        event.preventDefault()
        const name = editedPartName.trim()
        if (!name) {
            setErrorMessage('A part name cannot be empty.')
            return
        }
        if (!selectedPlantId) return

        setPartsByPlant((currentParts) => ({
            ...currentParts,
            [selectedPlantId]: (currentParts[selectedPlantId] ?? []).map((part) =>
                part.id === partId ? { ...part, name } : part
            ),
        }))
        setEditingPartId(null)
        setErrorMessage('')
    }

    function removePart(partId: string) {
        if (!selectedPlantId) return

        setPartsByPlant((currentParts) => ({
            ...currentParts,
            [selectedPlantId]: (currentParts[selectedPlantId] ?? []).filter((part) => part.id !== partId),
        }))
    }

    return <div className="flex w-full flex-col gap-6">
        <App.Title text="Companies" />

        <section className="rounded-lg border-2 border-brand-blue bg-main-background-2 p-5">
            <div className="flex items-start gap-4">
                <div className="rounded-lg bg-brand-light-green p-3">
                    <App.Icon.Company />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-brand-blue">{companyName}</h2>
                    <p className="app-label-text mt-1">Power generation · 3 plants</p>
                </div>
            </div>

            {!selectedPlant
                ? <div className="mt-6 flex flex-col gap-3">
                    <App.Subtitle text="Plants" />
                    {plants.map((plant) =>
                        <button
                            key={plant.id}
                            className="flex items-center justify-between rounded-lg border border-brand-blue px-4 py-3 text-left transition-colors hover:bg-brand-light-green"
                            onClick={() => {
                                setSelectedPlantId(plant.id)
                                setErrorMessage('')
                            }}>
                            <span className="flex items-center gap-3">
                                <App.Icon.ModernHome />
                                <span>
                                    <span className="block text-lg font-bold text-brand-blue">{plant.name}</span>
                                    <span className="app-label-text opacity-70">{plant.location}</span>
                                </span>
                            </span>
                            <span className="text-xl text-brand-blue" aria-hidden="true">›</span>
                        </button>
                    )}
                </div>
                : <div className="mt-6 flex flex-col gap-5">
                    <button
                        className="app-label-text app-hover-text w-fit cursor-pointer"
                        onClick={() => {
                            setSelectedPlantId(null)
                            setEditingPartId(null)
                            setErrorMessage('')
                        }}>
                        ← All plants
                    </button>
                    <div>
                        <h3 className="text-2xl font-bold text-brand-blue">{selectedPlant.name}</h3>
                        <p className="app-label-text opacity-70">{selectedPlant.location}</p>
                    </div>
                    <div className="border-b-2 border-brand-blue" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <App.Subtitle text="Parts" />
                            <span className="app-label-text opacity-70">{parts.length} {parts.length === 1 ? 'part' : 'parts'}</span>
                        </div>

                        <form className="flex flex-wrap items-start gap-3" onSubmit={addPart}>
                            <label className="sr-only" htmlFor="new-part-name">New part name</label>
                            <input
                                id="new-part-name"
                                className="min-w-56 flex-1 rounded-lg border border-brand-blue bg-main-background px-4 py-2 text-lg text-brand-blue focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-green"
                                placeholder="Add a part..."
                                value={newPartName}
                                onChange={(event) => {
                                    setNewPartName(event.target.value)
                                    setErrorMessage('')
                                }}
                            />
                            <button
                                className="rounded-lg bg-brand-blue px-5 py-2 text-lg font-bold text-white transition-colors hover:bg-brand-green"
                                type="submit">
                                Add part
                            </button>
                        </form>
                        {errorMessage && <p className="text-sm text-red-700" role="alert">{errorMessage}</p>}

                        {parts.length === 0
                            ? <p className="app-label-text rounded-lg border border-dashed border-brand-blue p-5 text-center">
                                No parts listed for this plant yet.
                            </p>
                            : <div className="flex flex-col gap-3">
                                {parts.map((part) =>
                                    <article key={part.id} className="rounded-lg border border-brand-blue p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            {editingPartId === part.id
                                                ? <form
                                                    className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                                                    onSubmit={(event) => savePart(event, part.id)}>
                                                    <label className="sr-only" htmlFor={`edit-part-${part.id}`}>Part name</label>
                                                    <input
                                                        id={`edit-part-${part.id}`}
                                                        className="min-w-40 flex-1 rounded-lg border border-brand-blue bg-main-background px-3 py-2 text-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-green"
                                                        value={editedPartName}
                                                        onChange={(event) => {
                                                            setEditedPartName(event.target.value)
                                                            setErrorMessage('')
                                                        }}
                                                        autoFocus
                                                    />
                                                    <button className="app-label-text font-bold app-hover-text" type="submit">Save</button>
                                                    <button
                                                        className="app-label-text opacity-70 hover:opacity-100"
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingPartId(null)
                                                            setErrorMessage('')
                                                        }}>
                                                        Cancel
                                                    </button>
                                                </form>
                                                : <h4 className="text-lg font-bold text-brand-blue">{part.name}</h4>}
                                            {editingPartId !== part.id &&
                                                <div className="flex items-center gap-4">
                                                    <button
                                                        className="app-label-text app-hover-text text-base"
                                                        onClick={() => {
                                                            setEditingPartId(part.id)
                                                            setEditedPartName(part.name)
                                                            setErrorMessage('')
                                                        }}>
                                                        Edit
                                                    </button>
                                                    <button
                                                        className="text-base text-red-700 transition-colors hover:text-red-900"
                                                        onClick={() => removePart(part.id)}>
                                                        Remove
                                                    </button>
                                                </div>}
                                        </div>
                                        {errorMessage && editingPartId === part.id &&
                                            <p className="mt-2 text-sm text-red-700" role="alert">{errorMessage}</p>}

                                        <details className="mt-3 border-t border-brand-light-blue pt-3">
                                            <summary className="cursor-pointer text-brand-blue hover:text-brand-green">
                                                Assets <span className="opacity-70">({part.assets.length})</span>
                                            </summary>
                                            {part.assets.length === 0
                                                ? <p className="app-label-text mt-3 text-base opacity-70">No assets assigned.</p>
                                                : <ul className="mt-3 flex flex-col gap-2">
                                                    {part.assets.map((asset) =>
                                                        <li key={asset.tag} className="flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-md bg-brand-light-green px-3 py-2">
                                                            <span className="text-brand-blue">{asset.name} <span className="opacity-60">· {asset.tag}</span></span>
                                                            <span className="app-label-text text-base opacity-70">{asset.condition}</span>
                                                        </li>
                                                    )}
                                                </ul>}
                                        </details>
                                    </article>
                                )}
                            </div>}
                    </div>
                </div>}
        </section>
    </div>
}

export default CompaniesView

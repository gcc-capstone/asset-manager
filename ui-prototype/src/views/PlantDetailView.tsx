import { Fragment, useState } from 'react'
import db, { type Plant } from '../data/Data'
import { App } from "../components/Components"

/** The sections listed in the left sidebar when a plant is open */
type Section = "Outages" | "Info" | "Assets"

/** Formats a "YYYY-MM-DD" date as e.g. "Oct 26, 2026" (parsed as local time so it doesn't shift a day) */
function formatDate(date: string): string {
    return new Date(date + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/** Returns a plant's outages that haven't ended yet, soonest first */
function upcomingOutages(plant: Plant) {
    const today = new Date().toLocaleDateString("en-CA") // "YYYY-MM-DD" in local time
    return db.outages
        .filter((outage) => outage.plant === plant.name && outage.end >= today)
        .sort((a, b) => a.start.localeCompare(b.start))
}

/** ----------------------------------------------------------------------------------------------------------------
 * Shows one plant: a left sidebar with Outages, Info and Assets, and the selected section on the right.
 */
function PlantDetailView({ plant, onBack }: { plant: Plant, onBack: () => void }): React.JSX.Element {

    /* State that holds the selected sidebar section */
    const [section, setSection] = useState<Section>("Outages");

    const sections: [Section, () => React.JSX.Element][] = [
        ["Outages", App.Icon.Calendar],
        ["Info", App.Icon.Company],
        ["Assets", App.Icon.PowerPlants],
    ];

    return <>
        {/* Left side: sections for this plant (same styling as the main sidebar) */}
        <nav className="flex flex-col gap-4 pr-10">
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
        <div className="flex flex-col grow px-6 py-4">
            <span className="app-label-text app-hover-text cursor-pointer pb-2" onClick={onBack}>
                ← All plants
            </span>
            <App.Title text={plant.name} />

            {section === "Outages" && <PlantOutages plant={plant} />}
            {section === "Info" && <PlantInfo plant={plant} />}
            {section === "Assets" && <PlantAssets plant={plant} />}
        </div>
    </>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Table of upcoming outages for a plant
 */
function PlantOutages({ plant }: { plant: Plant }): React.JSX.Element {
    const outages = upcomingOutages(plant);

    return <div className="flex flex-col gap-4">
        <App.Subtitle text="Upcoming Outages" />

        {outages.length === 0
            ? <span className="app-label-text">No upcoming outages scheduled.</span>
            : <table className="border-1 border-brand-blue text-brand-blue">
                <thead>
                    <tr className="text-xl border-b-2 border-brand-blue">
                        {["Start", "End", "Type", "Description"].map((heading) =>
                            <th key={heading} className="px-4 py-2 text-left">{heading}</th>
                        )}
                    </tr>
                </thead>
                <tbody>
                    {outages.map((outage) =>
                        <tr key={outage.start + outage.description} className="border-b-1 border-brand-blue text-lg">
                            <td className="px-4 py-2 font-bold">{formatDate(outage.start)}</td>
                            <td className="px-4 py-2">{formatDate(outage.end)}</td>
                            <td className="px-4 py-2"><span className="text-red-600">⊛</span> {outage.type}</td>
                            <td className="px-4 py-2">{outage.description}</td>
                        </tr>
                    )}
                </tbody>
            </table>}
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * General information about a plant
 */
function PlantInfo({ plant }: { plant: Plant }): React.JSX.Element {
    const outages = upcomingOutages(plant);

    const rows: [string, string][] = [
        ["Name", plant.name],
        ["County", `${plant.county} County`],
        ["Upcoming outages", `${outages.length}`],
        ["Next outage", outages.length ? `${formatDate(outages[0].start)} (${outages[0].type})` : "None scheduled"],
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
 * The plant's TDA drawing, or a placeholder if there isn't one yet
 */
function PlantAssets({ plant }: { plant: Plant }): React.JSX.Element {
    const drawing = db.tdaDrawings[plant.name];

    return <div className="flex flex-col gap-4">
        <App.Subtitle text="TDA Drawing" />
        {drawing
            ? <img src={drawing} alt={`TDA drawing for ${plant.name}`}
                className="max-w-full border-2 border-brand-blue rounded-lg bg-white" />
            : <div className="flex items-center justify-center h-96 border-2 border-dashed border-brand-blue rounded-lg app-label-text">
                No TDA drawing on file for this plant
            </div>}
    </div>
}

export default PlantDetailView
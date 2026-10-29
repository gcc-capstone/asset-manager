
import drawing2043631 from "./RE__TDA_drawings/204363-1-FK_B.pdf?url"
import drawing2043632 from "./RE__TDA_drawings/204363-2-TA_B.pdf?url"
import drawing2043633 from "./RE__TDA_drawings/204363-3-FK_B.pdf?url"
import drawing2043634 from "./RE__TDA_drawings/204363-4-TA_B.pdf?url"
import drawing2043635 from "./RE__TDA_drawings/204363-5-FK_B.pdf?url"
import drawing2043636 from "./RE__TDA_drawings/204363-6-TA_B.pdf?url"
import drawing8002891 from "./RE__TDA_drawings/800289-1_D.pdf?url"
import drawing8002894 from "./RE__TDA_drawings/800289-4_C.pdf?url"
import { buildOutageFollowUpTasks } from "./Recurrence"

/** A Top Assembly Drawing (TAD) file. `url` is an image or PDF path (e.g. "/tad/limerick-u1.png") or an uploaded file's URL. */
export type Drawing = {
    name: string,
    url: string,
}

export type TadPart = {
    id: string,
    partNumber: string,
    customerNumber?: string,
    location?: string,
    description: string,
    tadItemNum: string,
    qtyPerValve: number,
    qtyUsed: number,
    qtyInStock: number,
    qtyNeeded: number,
    qtyToBuy: number,
    deliveryWeeks: number,
}

export type TadTag = {
    id: string,
    tagNumber: string,
    installationStatus: "Installed" | "Spare" | "Not installed" | "Removed",
    operationalStatus: "Active" | "Inactive" | "Unknown",
    installDate: string,
    lastMaintenanceDate: string,
    maintenanceCycle: string,
}

export type Tad = {
    id: string,
    plant: string,
    name: string,
    tagNumber: string,
    installationStatus: "Installed" | "Spare" | "Not installed" | "Removed",
    operationalStatus: "Active" | "Inactive" | "Unknown",
    installDate: string,
    lastMaintenanceDate: string,
    maintenanceCycle: string,
    tags?: TadTag[],
    drawing: Drawing | null,
    parts: TadPart[],
}

/** A scheduled outage at a plant. Dates are "YYYY-MM-DD". */
export type Outage = {
    id?: string,
    plant: string,
    start: string,
    end: string,
    type: OutageType,
    description: string,
    /* IDs of the plant's Top Assembly Drawings (TADs) this outage covers */
    tadIds?: string[],
    /* Repeating outages: every occurrence shares a seriesId and repeats every N months */
    seriesId?: string,
    repeatEveryMonths?: number,
    /* Last allowed start date for the series, or null for "never" (limited to 5 years ahead) */
    repeatUntil?: string | null,
    /* Optional flag with custom text, e.g. "Waiting on parts" (shown on the outage and the calendar) */
    flag?: string,
    /* Whether the bill of materials has been sent for this outage */
    billOfMaterialsSent?: boolean,
}

/** The outage types you can pick when adding an outage */
export const outageTypes = ["Major", "Minor"] as const

/** "Major" or "Minor" */
export type OutageType = typeof outageTypes[number]

/* A scheduled task */
export type Task = {
    /* Optional unique id (tasks created from an outage have one; several can share a title) */
    id?: string,
    /* The outage this task was created for, if any */
    outageId?: string,
    title: string,
    completed: boolean | undefined,
    plant: string,
    assignee: string | undefined,
    dueDate: string,
    category: string,
    description: string | undefined
}

export function dateOffsetFromToday(offset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
}

export const db = {

    plants: [
        {
            name: "Beaver Valley Nuclear Generating Station",
            county: "Beaver",
        },
        {
            name: "Limerick Generating Station",
            county: "Montgomery",
        },
        {
            name: "Peach Bottom Nuclear Generating Station",
            county: "York",
        },
        {
            name: "Susquehanna Steam Electric Station",
            county: "Luzerne",
        },
        {
            name: "Brunner Island Steam Electric Station",
            county: "York",
        },
        {
            name: "Colver Power Project",
            county: "Cambria",
        },
        {
            name: "Conemaugh Generating Station",
            county: "Indiana",
        },
        {
            name: "Ebensburg Power	Cambria",
            county: "Cambria",
        },
        {
            name: "Foster Wheeler Mt Carmel Cogen",
            county: "Northumberland",
        },
        {
            name: "John B Rich Power Station",
            county: "Schuylkill",
        },
        {
            name: "Keystone Generating Station",
            county: "Armstrong",
        },
        {
            name: "Northampton Generating Company",
            county: "Northampton",
        },
        {
            name: "Panther Creek",
            county: "Carbon",
        },
        {
            name: "Scrubgrass Generating Plant",
            county: "Venango",
        },
        {
            name: "Seward",
            county: "Indiana",
        },
        {
            name: "Spring Grove Facility",
            county: "York",
        },
        {
            name: "St Nicholas Cogen Plant",
            county: "Schuylkill",
        },
        {
            name: "Westwood Generation",
            county: "Schuylkill",
        },
        {
            name: "Wheelabrator Frackville",
            county: "Schuylkill",
        }
    ],

    /* Scheduled outages, matched to plants by name */
    outages: [
        { id: "outage-beaver-unit-1", plant: "Beaver Valley Nuclear Generating Station", start: "2026-10-26", end: "2026-11-20", type: "Major", description: "Unit 1 refueling outage", flag: "Waiting on parts" },
        { id: "outage-beaver-unit-2", plant: "Beaver Valley Nuclear Generating Station", start: "2027-04-12", end: "2027-05-07", type: "Major", description: "Unit 2 refueling outage" },
        { id: "outage-limerick-condenser", plant: "Limerick Generating Station", start: "2026-11-09", end: "2026-11-13", type: "Minor", description: "Condenser tube inspection" },
        { id: "outage-limerick-unit-2", plant: "Limerick Generating Station", start: "2027-03-15", end: "2027-04-09", type: "Major", description: "Unit 2 refueling outage" },
        { id: "outage-peach-bottom-feedwater", plant: "Peach Bottom Nuclear Generating Station", start: "2026-10-19", end: "2026-10-23", type: "Minor", description: "Feedwater pump overhaul" },
        { id: "outage-susquehanna-unit-1", plant: "Susquehanna Steam Electric Station", start: "2027-02-01", end: "2027-03-05", type: "Major", description: "Unit 1 refueling outage" },
        { id: "outage-keystone-boiler", plant: "Keystone Generating Station", start: "2026-12-07", end: "2026-12-18", type: "Minor", description: "Boiler tube repair" },
        { id: "outage-conemaugh-scrubber", plant: "Conemaugh Generating Station", start: "2027-01-11", end: "2027-01-29", type: "Minor", description: "Scrubber maintenance" },
    ] as Outage[],

    tasks: [
        {
            outageId: "outage-beaver-unit-1",
            title: "Review inspection report",
            plant: "Beaver Valley Nuclear Generating Station",
            assignee: "John Doe",
            dueDate: dateOffsetFromToday(3),
            category: "Inspection",
            description: `Review the inspection report for Beaver Valley Nuclear Generating Station.
            Confirm that all items to be replaced in the next outage have been documented.`
        },
        {
            outageId: "outage-limerick-condenser",
            title: "Approve maintenance work order",
            assignee: "John Doe",
            plant: "Limerick Generating Station",
            dueDate: dateOffsetFromToday(6),
            category: "Maintenance"
        },
        {
            outageId: "outage-peach-bottom-feedwater",
            title: "Confirm contractor schedule",
            assignee: "John Doe",
            plant: "Peach Bottom Nuclear Generating Station",
            dueDate: dateOffsetFromToday(10),
            category: "Scheduling"
        },
        {
            outageId: "outage-susquehanna-unit-1",
            title: "Update equipment records",
            assignee: "John Doe",
            plant: "Susquehanna Steam Electric Station",
            dueDate: dateOffsetFromToday(18),
            category: "Records"
        },
        {
            outageId: "outage-keystone-boiler",
            title: "Submit outage documentation",
            assignee: "John Doe",
            plant: "Keystone Generating Station",
            dueDate: dateOffsetFromToday(-1),
            category: "Documentation"
        },
        {
            outageId: "outage-conemaugh-scrubber",
            title: "Complete safety checklist",
            assignee: "John Doe",
            plant: "Conemaugh Generating Station",
            dueDate: dateOffsetFromToday(-4),
            category: "Safety"
        },
        {
            title: "Schedule pump inspection",
            assignee: "John Doe",
            plant: "Brunner Island Steam Electric Station",
            dueDate: dateOffsetFromToday(-9),
            category: "Inspection"
        },
        {
            title: "File contractor visit notes",
            assignee: "John Doe",
            plant: "Scrubgrass Generating Plant",
            dueDate: dateOffsetFromToday(-16),
            category: "Contractor visit"
        },
    ] as Task[]
}

db.tasks.push(...db.outages.flatMap(outage =>
    buildOutageFollowUpTasks(outage, dateOffsetFromToday(0))
))

const suppliedDrawings: Drawing[] = [
    { name: "204363-1-FK_B.pdf", url: drawing2043631 },
    { name: "204363-2-TA_B.pdf", url: drawing2043632 },
    { name: "204363-3-FK_B.pdf", url: drawing2043633 },
    { name: "204363-4-TA_B.pdf", url: drawing2043634 },
    { name: "204363-5-FK_B.pdf", url: drawing2043635 },
    { name: "204363-6-TA_B.pdf", url: drawing2043636 },
    { name: "800289-1_D.pdf", url: drawing8002891 },
    { name: "800289-4_C.pdf", url: drawing8002894 },
]

const dummyPartCatalog: Omit<TadPart, "id">[] = [
    {
        partNumber: "GSK-204363",
        customerNumber: "BU-11042",
        location: "Upper bonnet",
        description: "Spiral-wound bonnet gasket",
        tadItemNum: "1",
        qtyPerValve: 1,
        qtyUsed: 2,
        qtyInStock: 1,
        qtyNeeded: 2,
        qtyToBuy: 1,
        deliveryWeeks: 4,
    },
    {
        partNumber: "STEM-800289",
        customerNumber: "BU-23817",
        location: "Drive assembly",
        description: "Stainless steel valve stem",
        tadItemNum: "2",
        qtyPerValve: 1,
        qtyUsed: 1,
        qtyInStock: 2,
        qtyNeeded: 1,
        qtyToBuy: 0,
        deliveryWeeks: 8,
    },
    {
        partNumber: "PACK-67120",
        customerNumber: "BU-09436",
        location: "Packing gland",
        description: "Graphite packing set",
        tadItemNum: "3",
        qtyPerValve: 5,
        qtyUsed: 10,
        qtyInStock: 5,
        qtyNeeded: 10,
        qtyToBuy: 5,
        deliveryWeeks: 3,
    },
    {
        partNumber: "SEAT-44018",
        customerNumber: "BU-32106",
        location: "Valve body",
        description: "Hard-faced replacement seat",
        tadItemNum: "4",
        qtyPerValve: 1,
        qtyUsed: 0,
        qtyInStock: 1,
        qtyNeeded: 1,
        qtyToBuy: 0,
        deliveryWeeks: 12,
    },
]

/** Seeded prototype TADs; supplied drawings are reused to cover every plant. */
export const seededTads: Tad[] = db.plants.flatMap((plant, plantIndex) => {
    const drawingCount = plantIndex < 10 ? 2 : 1

    return Array.from({ length: drawingCount }, (_, drawingIndex) => {
        const drawing = suppliedDrawings[(plantIndex * 3 + drawingIndex * 4) % suppliedDrawings.length]
        const id = `seed-tad-${plantIndex + 1}-${drawingIndex + 1}`

        return {
            id,
            plant: plant.name,
            name: `${plant.name} - ${drawing.name.replace(/\.pdf$/i, "")}`,
            tagNumber: `TAD-${String(plantIndex + 1).padStart(2, "0")}-${drawingIndex + 1}`,
            installationStatus: ["Installed", "Spare", "Not installed", "Removed"][plantIndex % 4] as Tad["installationStatus"],
            operationalStatus: ["Active", "Active", "Inactive", "Unknown"][plantIndex % 4] as Tad["operationalStatus"],
            installDate: `${2016 + plantIndex % 7}-${String(1 + plantIndex % 12).padStart(2, "0")}-15`,
            lastMaintenanceDate: `202${plantIndex % 5}-${String(1 + (plantIndex + drawingIndex) % 12).padStart(2, "0")}-10`,
            maintenanceCycle: `${1 + (plantIndex + drawingIndex) % 12} months`,
            tags: Array.from({ length: 2 }, (_, tagIndex) => ({
                id: `${id}-tag-${tagIndex + 1}`,
                tagNumber: `${tagIndex === 0 ? "TAD" : "TAG"}-${String(plantIndex + 1).padStart(2, "0")}-${drawingIndex + 1}-${tagIndex + 1}`,
                installationStatus: ["Installed", "Spare", "Not installed", "Removed"][plantIndex % 4] as TadTag["installationStatus"],
                operationalStatus: ["Active", "Active", "Inactive", "Unknown"][(plantIndex + tagIndex) % 4] as TadTag["operationalStatus"],
                installDate: `${2016 + (plantIndex + tagIndex) % 7}-${String(1 + plantIndex % 12).padStart(2, "0")}-15`,
                lastMaintenanceDate: `202${(plantIndex + tagIndex) % 5}-${String(1 + (plantIndex + drawingIndex + tagIndex) % 12).padStart(2, "0")}-10`,
                maintenanceCycle: `${1 + (plantIndex + drawingIndex + tagIndex) % 12} months`,
            })),
            drawing: { ...drawing },
            parts: [0, 1].map((partIndex) => {
                const part = dummyPartCatalog[(plantIndex + drawingIndex + partIndex) % dummyPartCatalog.length]
                return { ...part, id: `${id}-part-${partIndex + 1}` }
            }),
        }
    })
})

export function replaceTasks(tasks: Task[]): void {
    db.tasks = tasks;
}

/** One plant from the list above */
export type Plant = typeof db.plants[number]

export default db;
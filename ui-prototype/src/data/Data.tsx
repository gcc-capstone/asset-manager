
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

export type Tad = {
    id: string,
    plant: string,
    name: string,
    tagNumber: string,
    installationStatus: "Installed" | "Spare" | "Not installed" | "Removed",
    operationalStatus: "Active" | "Inactive" | "Unknown",
    installDate: string,
    lastMaintenanceDate: string,
    nextMaintenanceDate: string,
    drawing: Drawing | null,
    parts: TadPart[],
}

/** A scheduled outage at a plant. Dates are "YYYY-MM-DD". */
export type Outage = {
    id?: string,
    plant: string,
    start: string,
    end: string,
    type: string,
    description: string,
    /* Top Assembly Drawings for the equipment this outage covers */
    drawings?: Drawing[],
}

/** The outage types you can pick when adding an outage */
export const outageTypes = ["Refueling", "Maintenance", "Inspection", "Forced"]

/* A scheduled task */
export type Task = {
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
        { plant: "Beaver Valley Nuclear Generating Station", start: "2026-10-26", end: "2026-11-20", type: "Refueling", description: "Unit 1 refueling outage" },
        { plant: "Beaver Valley Nuclear Generating Station", start: "2027-04-12", end: "2027-05-07", type: "Refueling", description: "Unit 2 refueling outage" },
        { plant: "Limerick Generating Station", start: "2026-11-09", end: "2026-11-13", type: "Maintenance", description: "Condenser tube inspection" },
        { plant: "Limerick Generating Station", start: "2027-03-15", end: "2027-04-09", type: "Refueling", description: "Unit 2 refueling outage" },
        { plant: "Peach Bottom Nuclear Generating Station", start: "2026-10-19", end: "2026-10-23", type: "Maintenance", description: "Feedwater pump overhaul" },
        { plant: "Susquehanna Steam Electric Station", start: "2027-02-01", end: "2027-03-05", type: "Refueling", description: "Unit 1 refueling outage" },
        { plant: "Keystone Generating Station", start: "2026-12-07", end: "2026-12-18", type: "Maintenance", description: "Boiler tube repair" },
        { plant: "Conemaugh Generating Station", start: "2027-01-11", end: "2027-01-29", type: "Maintenance", description: "Scrubber maintenance" },
    ] as Outage[],

    /* TAD drawing image paths, keyed by plant name. Put the images in /public, e.g. "/tad/limerick.png" */
    tadDrawings: {} as Record<string, string>,

    tasks: [
        {
            title: "Review inspection report",
            plant: "Beaver Valley Nuclear Generating Station",
            assignee: "John Doe",
            dueDate: dateOffsetFromToday(3),
            category: "Inspection",
            description: `Review the inspection report for Beaver Valley Nuclear Generating Station.
            Confirm that all items to be replaced in the next outage have been documented.`
        },
        {
            title: "Approve maintenance work order",
            assignee: "John Doe",
            plant: "Limerick Generating Station",
            dueDate: dateOffsetFromToday(6),
            category: "Maintenance"
        },
        {
            title: "Confirm contractor schedule",
            assignee: "John Doe",
            plant: "Peach Bottom Nuclear Generating Station",
            dueDate: dateOffsetFromToday(10),
            category: "Scheduling"
        },
        {
            title: "Update equipment records",
            assignee: "John Doe",
            plant: "Susquehanna Steam Electric Station",
            dueDate: dateOffsetFromToday(18),
            category: "Records"
        },
        {
            title: "Submit outage documentation",
            assignee: "John Doe",
            plant: "Keystone Generating Station",
            dueDate: dateOffsetFromToday(-1),
            category: "Documentation"
        },
        {
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

export function replaceTasks(tasks: Task[]): void {
    db.tasks = tasks;
}

/** One plant from the list above */
export type Plant = typeof db.plants[number]

export default db;
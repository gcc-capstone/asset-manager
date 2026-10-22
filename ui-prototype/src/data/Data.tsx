
/** A Top Assembly Drawing (TDA) file. `url` is an image or PDF path (e.g. "/tda/limerick-u1.png") or an uploaded file's URL. */
export type Drawing = {
    name: string,
    url: string,
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

/**
 * One line of a plant's Bill of Materials (BOM): a part needed per valve.
 * `customerNumber` and `location` are customer-specific, so they are optional.
 */
export type BomItem = {
    partNumber: string,
    customerNumber?: string,
    /* Where the part is shelved in the warehouse */
    location?: string,
    description: string,
    taItemNum: string,
    qtyPerValve: number,
    /* Already used on completed valves */
    qtyUsed: number,
    qtyInStock: number,
    /* Supplier lead time */
    deliveryWeeks: number,
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

/* Base parts for the dummy BOM data: [part number, description, TA item number, qty per valve, delivery weeks] */
const bomParts: [string, string, string, number, number][] = [
    ["VB-2040-CS", "Valve body, 4in Class 300, carbon steel", "TA-500101", 1, 14],
    ["BN-2041-CS", "Bonnet, bolted, carbon steel", "TA-500102", 1, 12],
    ["ST-1120-17", "Stem, 17-4PH stainless", "TA-500140", 1, 8],
    ["SR-3305-SS", "Seat ring, 316SS, stellite faced", "TA-500188", 2, 10],
    ["GK-0710-SW", "Spiral wound gasket, 4in Class 300", "TA-500230", 2, 3],
    ["SD-0450-B7", "Stud, B7, 3/4in x 4.5in", "TA-500255", 8, 2],
    ["NT-0451-2H", "Heavy hex nut, 2H, 3/4in", "TA-500256", 16, 2],
    ["PK-0920-GR", "Graphite packing ring set", "TA-500301", 1, 5],
    ["OR-0112-VT", "O-ring, Viton, 2.5in ID", "TA-500344", 3, 1],
    ["AC-7700-PN", "Pneumatic actuator, spring return", "TA-500420", 1, 20],
    ["HW-2200-DI", "Handwheel, ductile iron, 12in", "TA-500466", 1, 6],
    ["YK-3100-SS", "Yoke nut, stainless", "TA-500490", 1, 9],
]

/**
 * Builds dummy BOM data for one plant. The numbers vary a little by `seed` so each plant looks different.
 * Pass `aisle = null` for a customer that doesn't track warehouse locations.
 */
function buildBom(customerPrefix: string, aisle: string | null, seed: number): BomItem[] {
    return bomParts.map(([partNumber, description, taItemNum, qtyPerValve, deliveryWeeks], i) => ({
        partNumber,
        description,
        taItemNum,
        qtyPerValve,
        deliveryWeeks,
        customerNumber: `${customerPrefix}-${1000 + i * 7 + seed}`,
        location: aisle ? `${aisle}-${String(1 + (i % 5)).padStart(2, "0")}-${String(1 + ((i + seed) % 6)).padStart(2, "0")}` : undefined,
        qtyUsed: qtyPerValve * ((i + seed) % 4),
        qtyInStock: (i * 5 + seed * 3) % 9 === 0 ? 0 : qtyPerValve * (2 + ((i + seed) % 7)),
    }))
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

    /* TDA drawing image paths, keyed by plant name. Put the images in /public, e.g. "/tda/limerick.png" */
    tdaDrawings: {} as Record<string, string>,

    /* Bill of Materials lines, keyed by plant name. Plants without an entry show an empty state. */
    bom: {
        "Beaver Valley Nuclear Generating Station": buildBom("BV", "A", 1),
        "Limerick Generating Station": buildBom("LG", "B", 2),
        "Peach Bottom Nuclear Generating Station": buildBom("PB", "C", 3),
        "Susquehanna Steam Electric Station": buildBom("SS", null, 4),
    } as Record<string, BomItem[]>,


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
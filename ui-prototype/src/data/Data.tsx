
/** A scheduled outage at a plant. Dates are "YYYY-MM-DD". */
export type Outage = {
    plant: string,
    start: string,
    end: string,
    type: string,
    description: string,
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

}

/** One plant from the list above */
export type Plant = typeof db.plants[number]

export default db;
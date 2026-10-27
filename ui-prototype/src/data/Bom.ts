import { type Outage, type Tad, type TadPart } from "./Data"

/** One line of a Bill of Materials: a part and the TAD it belongs to */
export type BomLine = { tad: Tad, part: TadPart }

/** Every part of the given TADs, in TAD order then TAD item number */
export function bomLines(tads: Tad[]): BomLine[] {
    return tads.flatMap(tad => [...tad.parts]
        .sort((a, b) => a.tadItemNum.localeCompare(b.tadItemNum, undefined, { numeric: true }))
        .map(part => ({ tad, part })))
}

/** Totals shown under the table and in the email: how many lines, and how many parts still need to be bought */
export function bomTotals(lines: BomLine[]): { lines: number, needed: number, toBuy: number, linesToBuy: number } {
    return {
        lines: lines.length,
        needed: lines.reduce((sum, { part }) => sum + part.qtyNeeded, 0),
        toBuy: lines.reduce((sum, { part }) => sum + part.qtyToBuy, 0),
        linesToBuy: lines.filter(({ part }) => part.qtyToBuy > 0).length,
    }
}

/** Column headings and values, shared by the on-screen table and the CSV so they always match */
export const BOM_COLUMNS: { label: string, value: (line: BomLine) => string | number, numeric?: boolean }[] = [
    { label: "TAD", value: ({ tad }) => tad.tagNumber || tad.name },
    { label: "Item #", value: ({ part }) => part.tadItemNum },
    { label: "Part #", value: ({ part }) => part.partNumber },
    { label: "Customer #", value: ({ part }) => part.customerNumber ?? "" },
    { label: "Description", value: ({ part }) => part.description },
    { label: "Location", value: ({ part }) => part.location ?? "" },
    { label: "Qty / assembly", value: ({ part }) => part.qtyPerValve, numeric: true },
    { label: "Needed", value: ({ part }) => part.qtyNeeded, numeric: true },
    { label: "In stock", value: ({ part }) => part.qtyInStock, numeric: true },
    { label: "To buy", value: ({ part }) => part.qtyToBuy, numeric: true },
    { label: "Lead time (weeks)", value: ({ part }) => part.deliveryWeeks, numeric: true },
]

/** Quotes a CSV cell if it contains a comma, quote or line break */
function csvCell(value: string | number): string {
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Short title used for the file name, email subject and popup, e.g. "Limerick Generating Station – Mar 2027 Major outage" */
export function bomTitle(outage: Outage): string {
    const [year, month, day] = outage.start.split("-").map(Number)
    const when = new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    return `${outage.plant} – ${when} ${outage.type} outage`
}

/** File name like "BOM_Limerick-Generating-Station_2027-03-01.csv" */
export function bomFileName(outage: Outage): string {
    const plant = outage.plant.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "")
    return `BOM_${plant}_${outage.start}.csv`
}

/**
 * The Bill of Materials as CSV text: a few heading rows (plant, outage, TADs), a blank row, then one row per part
 * and a totals row. Opens in Excel.
 */
export function bomCsv(outage: Outage, tads: Tad[]): string {
    const lines = bomLines(tads)
    const totals = bomTotals(lines)
    const rows: (string | number)[][] = [
        ["Bill of Materials"],
        ["Plant", outage.plant],
        ["Outage", `${outage.start} to ${outage.end}`, outage.type],
        ["Description", outage.description],
        ["TADs", tads.map(tad => tad.tagNumber || tad.name).join("; ")],
        [],
        BOM_COLUMNS.map(column => column.label),
        ...lines.map(line => BOM_COLUMNS.map(column => column.value(line))),
        [],
        ["Totals", "", "", "", `${totals.lines} parts`, "", "", totals.needed, "", totals.toBuy, ""],
    ]
    return rows.map(row => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
}

/** Downloads text as a file. The byte-order mark makes Excel read accents and symbols (e.g. "–") correctly. */
export function downloadCsv(fileName: string, csv: string): void {
    const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
}

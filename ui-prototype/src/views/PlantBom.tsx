import { useMemo, useState } from 'react'
import db, { type BomItem, type Plant } from '../data/Data'
import { formStyles } from '../components/Modal'

/**
 * Calculation rules (change these if the business logic differs):
 *   qtyNeeded = max(0, qtyPerValve * valves - qtyUsed)   the remaining requirement
 *   qtyToBuy  = max(0, qtyNeeded - qtyInStock)
 */

/** ok = fully covered by stock, partial = some stock but still short, order = nothing in stock and some needed */
type Status = "ok" | "partial" | "order"

type SortKey = "partNumber" | "customerNumber" | "location" | "description" | "taItemNum"
    | "qtyPerValve" | "qtyUsed" | "qtyInStock" | "qtyNeeded" | "qtyToBuy" | "deliveryWeeks"

/** A BOM line plus its calculated fields */
type BomRow = BomItem & { qtyNeeded: number, qtyToBuy: number, status: Status }

type Column = { key: SortKey, label: string, numeric?: boolean }

const statusLabel: Record<Status, string> = { ok: "Covered", partial: "Partial", order: "Order" }

const statusStyle: Record<Status, string> = {
    ok: "bg-brand-light-green text-brand-green",
    partial: "bg-ui-accent/20 text-ui-accent",
    order: "bg-red-500/15 text-red-500",
}

/** Columns in display order. Customer # and Location only show when toggled on. */
const allColumns: Column[] = [
    { key: "partNumber", label: "Part #" },
    { key: "customerNumber", label: "Customer #" },
    { key: "location", label: "Location" },
    { key: "description", label: "Description" },
    { key: "taItemNum", label: "TA Item #" },
    { key: "qtyPerValve", label: "Qty / Valve", numeric: true },
    { key: "qtyUsed", label: "Qty Used", numeric: true },
    { key: "qtyInStock", label: "In Stock", numeric: true },
    { key: "qtyNeeded", label: "Qty Needed", numeric: true },
    { key: "qtyToBuy", label: "Qty to Buy", numeric: true },
    { key: "deliveryWeeks", label: "Delivery (wks)", numeric: true },
]

/** Columns that get a total in the footer row */
const totalKeys: SortKey[] = ["qtyUsed", "qtyInStock", "qtyNeeded", "qtyToBuy"]

/** Fills in the calculated fields for one BOM line */
function toRow(item: BomItem, valves: number): BomRow {
    const qtyNeeded = Math.max(0, item.qtyPerValve * valves - item.qtyUsed)
    const qtyToBuy = Math.max(0, qtyNeeded - item.qtyInStock)
    const status: Status = qtyToBuy === 0 ? "ok" : item.qtyInStock > 0 ? "partial" : "order"
    return { ...item, qtyNeeded, qtyToBuy, status }
}

/** Formats a Date as e.g. "Oct 26, 2026" */
function formatDate(date: Date): string {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

/** Wraps a value in quotes for CSV when it contains a comma, quote or newline */
function csvCell(value: string | number | undefined): string {
    const text = String(value ?? "")
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** ----------------------------------------------------------------------------------------------------------------
 * The Bill of Materials for a plant: parts needed per valve, what's in stock, and what still has to be bought.
 */
function PlantBom({ plant }: { plant: Plant }): React.JSX.Element {
    const items = useMemo(() => db.bom[plant.name] ?? [], [plant.name])

    /* How many valves the current order covers (drives qty needed and qty to buy) */
    const [valves, setValves] = useState(8)

    /* Customer-specific columns: on by default only if this customer has that data */
    const [showCustomerNum, setShowCustomerNum] = useState(items.some(item => item.customerNumber))
    const [showLocation, setShowLocation] = useState(items.some(item => item.location))

    const [search, setSearch] = useState("")
    const [filter, setFilter] = useState<"all" | "buy" | Status>("all")
    const [sort, setSort] = useState<{ key: SortKey, dir: 1 | -1 }>({ key: "partNumber", dir: 1 })

    const rows = useMemo(() => items.map(item => toRow(item, valves)), [items, valves])

    const columns = allColumns.filter(column =>
        (column.key !== "customerNumber" || showCustomerNum) && (column.key !== "location" || showLocation))

    const visible = useMemo(() => {
        const query = search.trim().toLowerCase()
        return rows
            .filter(row => {
                if (filter === "buy" && row.qtyToBuy === 0) return false
                if (filter !== "all" && filter !== "buy" && row.status !== filter) return false
                if (!query) return true
                return [row.partNumber, row.customerNumber, row.location, row.description, row.taItemNum]
                    .some(field => field?.toLowerCase().includes(query))
            })
            .sort((a, b) => {
                const left = a[sort.key] ?? "", right = b[sort.key] ?? ""
                const order = typeof left === "number" && typeof right === "number"
                    ? left - right
                    : String(left).localeCompare(String(right))
                return order * sort.dir
            })
    }, [rows, search, filter, sort])

    /* Summary numbers for the cards (always for the whole BOM, not just the filtered rows) */
    const toBuy = rows.filter(row => row.qtyToBuy > 0)
    const longestLeadWeeks = toBuy.reduce((max, row) => Math.max(max, row.deliveryWeeks), 0)
    const readyDate = new Date()
    readyDate.setDate(readyDate.getDate() + longestLeadWeeks * 7)

    const cards: { label: string, value: string, note?: string, warn?: boolean }[] = [
        { label: "Line items", value: `${rows.length}` },
        { label: "Fully covered", value: `${rows.filter(row => row.status === "ok").length}` },
        { label: "Lines to buy", value: `${toBuy.length}`, note: `${toBuy.reduce((sum, row) => sum + row.qtyToBuy, 0)} units`, warn: toBuy.length > 0 },
        { label: "Longest lead time", value: `${longestLeadWeeks} wks`, note: longestLeadWeeks ? `Parts in by ~${formatDate(readyDate)}` : "Nothing to order" },
    ]

    function toggleSort(key: SortKey) {
        setSort(current => current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: 1 })
    }

    /* Downloads the rows currently shown (with the current columns) as a CSV file */
    function exportCsv() {
        const lines = [
            [...columns.map(column => column.label), "Status"].join(","),
            ...visible.map(row => [...columns.map(column => csvCell(row[column.key])), statusLabel[row.status]].join(",")),
        ]
        const link = document.createElement("a")
        link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }))
        link.download = `BOM - ${plant.name}.csv`
        link.click()
        URL.revokeObjectURL(link.href)
    }

    if (items.length === 0)
        return <p className="rounded-lg border border-dashed border-line p-8 text-center text-text-muted">
            No Bill of Materials on file for this plant yet.
        </p>

    return <div className="flex flex-col gap-4">

        {/* Summary cards */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(10rem,1fr))] gap-3">
            {cards.map(card =>
                <div key={card.label}
                    className={`flex flex-col rounded-lg border p-3 ${card.warn ? "border-ui-accent bg-ui-accent/10" : "border-line bg-main-background-2"}`}>
                    <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">{card.label}</span>
                    <span className="text-2xl font-bold text-text" style={{ fontFamily: "var(--font-display)" }}>{card.value}</span>
                    {card.note && <span className="text-sm text-text-muted">{card.note}</span>}
                </div>)}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-text-muted">
                Valves in order
                <input type="number" min={1} value={valves} className={formStyles.input + " !w-20"}
                    onChange={e => setValves(Math.max(1, Number(e.target.value) || 1))} />
            </label>
            <input type="search" placeholder="Search part #, description, TA #..." value={search}
                className={formStyles.input + " !w-auto min-w-52 flex-1"} onChange={e => setSearch(e.target.value)} />
            <select className={formStyles.input + " !w-auto"} value={filter} aria-label="Filter by status"
                onChange={e => setFilter(e.target.value as typeof filter)}>
                <option value="all">All items</option>
                <option value="buy">Needs purchase</option>
                <option value="order">Out of stock</option>
                <option value="partial">Partial stock</option>
                <option value="ok">Covered</option>
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input type="checkbox" className={formStyles.checkbox} checked={showCustomerNum}
                    onChange={e => setShowCustomerNum(e.target.checked)} />
                Customer #
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
                <input type="checkbox" className={formStyles.checkbox} checked={showLocation}
                    onChange={e => setShowLocation(e.target.checked)} />
                Warehouse location
            </label>
            <button className={formStyles.ghostButton} onClick={exportCsv}>Export CSV</button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-line bg-main-background-2">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="bg-main-background">
                        {columns.map(column =>
                            <th key={column.key} onClick={() => toggleSort(column.key)}
                                className={`cursor-pointer select-none whitespace-nowrap border-b border-line px-3 py-2 font-semibold text-text-muted hover:text-brand-green ${column.numeric ? "text-right" : "text-left"}`}>
                                {column.label}{sort.key === column.key && (sort.dir === 1 ? " ▲" : " ▼")}
                            </th>)}
                        <th className="whitespace-nowrap border-b border-line px-3 py-2 text-left font-semibold text-text-muted">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.length === 0 &&
                        <tr><td colSpan={columns.length + 1} className="p-6 text-center text-text-muted">No items match your filters.</td></tr>}
                    {visible.map(row =>
                        <tr key={row.partNumber} className="border-b border-line last:border-b-0">
                            {columns.map(column =>
                                <td key={column.key}
                                    className={`px-3 py-2 text-text ${column.numeric ? "text-right tabular-nums" : column.key === "description" ? "" : "whitespace-nowrap"} ${column.key === "qtyToBuy" && row.qtyToBuy > 0 ? "font-bold text-red-500" : ""}`}>
                                    {row[column.key] ?? "—"}
                                </td>)}
                            <td className="px-3 py-2">
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusStyle[row.status]}`}>
                                    {statusLabel[row.status]}
                                </span>
                            </td>
                        </tr>)}
                </tbody>
                <tfoot>
                    <tr className="bg-main-background font-semibold text-text">
                        {columns.map((column, index) =>
                            <td key={column.key} className={`border-t border-line px-3 py-2 ${column.numeric ? "text-right tabular-nums" : ""}`}>
                                {index === 0
                                    ? "Totals (shown rows)"
                                    : totalKeys.includes(column.key) ? visible.reduce((sum, row) => sum + (row[column.key] as number), 0) : ""}
                            </td>)}
                        <td className="border-t border-line" />
                    </tr>
                </tfoot>
            </table>
        </div>
    </div>
}

export default PlantBom

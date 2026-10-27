import { useState } from "react"
import { type Outage, type Tad } from "../data/Data"
import { BOM_COLUMNS, bomCsv, bomFileName, bomLines, bomTitle, bomTotals, downloadCsv } from "../data/Bom"
import { Modal, formStyles } from "./Modal"

/** Loose email check: something@something.something */
const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/

/** Splits "a@x.com, b@y.com; c@z.com" into addresses */
function splitEmails(text: string): string[] {
    return text.split(/[,;\s]+/).map(email => email.trim()).filter(Boolean)
}

/** "2.4 KB" */
function fileSize(text: string): string {
    const bytes = new Blob([text]).size
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

/** ----------------------------------------------------------------------------------------------------------------
 * Bill of Materials for an outage: every part of the outage's TADs (pick which TADs to include), with
 * buttons to download it as a CSV (opens in Excel) or email it.
 * Email is a mock for the prototype: the form is checked and "sent", but nothing leaves the browser yet.
 * @param outage The outage the BOM is for
 * @param tads The TADs this outage covers
 * @param onSent Called with a confirmation message after the email is "sent"
 */
export function BomModal({ outage, tads, onSent, onClose }: {
    outage: Outage,
    tads: Tad[],
    onSent: (message: string) => void,
    onClose: () => void,
}): React.JSX.Element {
    /* Which TADs to include (all by default) */
    const [includedIds, setIncludedIds] = useState<string[]>(() => tads.map(tad => tad.id))
    /* "bom" shows the table; "email" shows the email form */
    const [step, setStep] = useState<"bom" | "email">("bom")

    const includedTads = tads.filter(tad => includedIds.includes(tad.id))
    const lines = bomLines(includedTads)
    const totals = bomTotals(lines)
    const title = bomTitle(outage)
    const fileName = bomFileName(outage)

    /* Email form */
    const [to, setTo] = useState("")
    const [cc, setCc] = useState("")
    const [subject, setSubject] = useState(`Bill of Materials – ${title}`)
    const [message, setMessage] = useState(() => [
        "Hello,",
        "",
        `Attached is the Bill of Materials for the ${outage.type.toLowerCase()} outage at ${outage.plant} (${outage.start} to ${outage.end}).`,
        "",
        "Thank you,",
    ].join("\n"))
    const [error, setError] = useState("")

    function toggleTad(id: string) {
        setIncludedIds(ids => ids.includes(id) ? ids.filter(other => other !== id) : [...ids, id])
    }

    function download() {
        downloadCsv(fileName, bomCsv(outage, includedTads))
    }

    function send(e: React.FormEvent) {
        e.preventDefault()
        const recipients = splitEmails(to)
        const copies = splitEmails(cc)
        const invalid = [...recipients, ...copies].filter(email => !EMAIL_PATTERN.test(email))
        if (recipients.length === 0) return setError("Enter at least one email address to send to.")
        if (invalid.length) return setError(`Check ${invalid.length === 1 ? "this address" : "these addresses"}: ${invalid.join(", ")}`)
        if (!subject.trim()) return setError("Enter a subject.")
        const who = recipients.length === 1 ? recipients[0] : `${recipients.length} recipients`
        onSent(`Bill of Materials emailed to ${who}.`)
    }

    const tadPicker = tads.length > 1 &&
        <fieldset className="flex flex-wrap items-center gap-2">
            <legend className={`${formStyles.label} mb-2`}>Include TADs</legend>
            {tads.map(tad =>
                <label key={tad.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${includedIds.includes(tad.id) ? "border-brand-green text-text" : "border-line text-text-muted"}`}>
                    <input type="checkbox" className={formStyles.checkbox}
                        checked={includedIds.includes(tad.id)} onChange={() => toggleTad(tad.id)} />
                    {tad.tagNumber || tad.name || "Unnamed TAD"}
                </label>)}
        </fieldset>

    if (step === "email") {
        return <Modal title="Email Bill of Materials" onClose={onClose}
            footer={<>
                <button type="button" className={formStyles.ghostButton} onClick={() => { setError(""); setStep("bom") }}>← Back</button>
                <button type="submit" form="bom-email-form" className={formStyles.primaryButton}>Send</button>
            </>}>
            <form id="bom-email-form" onSubmit={send} noValidate className="flex flex-col gap-3">
                <label className="flex flex-col gap-1">
                    <span className={formStyles.label}>To</span>
                    <input id="bom-email-to" type="text" inputMode="email" autoComplete="email" className={formStyles.input}
                        placeholder="name@company.com, another@company.com"
                        value={to} onChange={e => { setTo(e.target.value); setError("") }} autoFocus />
                </label>
                <label className="flex flex-col gap-1">
                    <span className={formStyles.label}>Cc <span className="text-text-muted">(optional)</span></span>
                    <input id="bom-email-cc" type="text" inputMode="email" className={formStyles.input}
                        value={cc} onChange={e => { setCc(e.target.value); setError("") }} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className={formStyles.label}>Subject</span>
                    <input id="bom-email-subject" className={formStyles.input} value={subject} onChange={e => setSubject(e.target.value)} />
                </label>
                <label className="flex flex-col gap-1">
                    <span className={formStyles.label}>Message</span>
                    <textarea id="bom-email-message" rows={6} className={formStyles.input} value={message} onChange={e => setMessage(e.target.value)} />
                </label>

                {/* The attachment */}
                <div className="flex items-center gap-3 rounded-lg border border-line bg-main-background px-3 py-2" aria-label="Attachment">
                    <svg className="h-5 w-5 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-semibold text-text">{fileName}</span>
                        <span className="text-xs text-text-muted">{fileSize(bomCsv(outage, includedTads))} · {totals.lines} parts from {includedTads.length} TAD{includedTads.length === 1 ? "" : "s"}</span>
                    </div>
                </div>

                {error && <p role="alert" className="text-sm font-semibold text-red-500">{error}</p>}
                <p className="text-xs text-text-muted">Prototype: the email isn't actually sent yet.</p>
            </form>
        </Modal>
    }

    return <Modal title="Bill of Materials" wide onClose={onClose}
        footer={<>
            <button type="button" className={formStyles.ghostButton} disabled={lines.length === 0} onClick={download}>Download CSV</button>
            <button type="button" className={formStyles.primaryButton} disabled={lines.length === 0} onClick={() => setStep("email")}>Email…</button>
        </>}>
        <p className="text-text">{title}</p>
        {tadPicker}

        {lines.length === 0
            ? <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-text-muted">
                {includedTads.length === 0 ? "Select at least one TAD." : "These TADs have no parts yet. Add parts under Assets."}
            </p>
            : <>
                <div className="overflow-x-auto rounded-lg border border-line">
                    <table className="w-full border-collapse text-sm">
                        <thead><tr className="bg-main-background text-left text-text-muted">
                            {BOM_COLUMNS.map(column =>
                                <th key={column.label} className={`whitespace-nowrap border-b border-line px-3 py-2 font-semibold ${column.numeric ? "text-right" : ""}`}>{column.label}</th>)}
                        </tr></thead>
                        <tbody>
                            {lines.map(line =>
                                <tr key={`${line.tad.id}-${line.part.id}`} className="border-b border-line last:border-0">
                                    {BOM_COLUMNS.map(column => {
                                        const value = column.value(line)
                                        const toBuy = column.label === "To buy" && Number(value) > 0
                                        return <td key={column.label}
                                            className={`px-3 py-2 ${column.numeric ? "text-right tabular-nums" : column.label === "Description" ? "min-w-48" : "whitespace-nowrap"} ${toBuy ? "font-bold text-red-500" : "text-text"}`}>
                                            {value === "" ? "—" : value}
                                        </td>
                                    })}
                                </tr>)}
                        </tbody>
                    </table>
                </div>
                <p className="text-sm text-text-muted">
                    {totals.lines} parts · {totals.needed} needed · <span className={totals.toBuy > 0 ? "font-semibold text-red-500" : ""}>{totals.toBuy} to buy</span>
                    {totals.linesToBuy > 0 && ` (${totals.linesToBuy} part number${totals.linesToBuy === 1 ? "" : "s"})`}
                </p>
            </>}
    </Modal>
}

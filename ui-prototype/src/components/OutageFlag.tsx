import { useState } from "react"
import { Modal, formStyles } from "./Modal"

/** Longest flag allowed, so it still fits on a card and in the calendar */
export const FLAG_MAX_LENGTH = 60

/** Small flag icon (inherits the text color) */
export function FlagIcon({ className = "h-4 w-4" }: { className?: string }): React.JSX.Element {
    return <svg className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M5 21V4h1.5v.4C8 3.8 9.6 3.6 11.2 4.2c1.9.7 3.6 1.1 6.3.2l1-.3v9.4l-.6.2c-3 1.1-5.1.6-7.1-.1-1.4-.5-2.7-.7-4.3-.1V21z" />
    </svg>
}

/** Amber pill showing an outage's flag text. With `onClick` it's a button (e.g. to edit the flag). */
export function FlagBadge({ text, onClick }: { text: string, onClick?: () => void }): React.JSX.Element {
    const className = "inline-flex max-w-full items-center gap-1.5 rounded-full border border-amber-500/60 bg-amber-400/15 px-3 py-1 text-sm font-semibold text-amber-700 dark:text-amber-300"
    const content = <>
        <FlagIcon className="h-3.5 w-3.5" />
        <span className="sr-only">Flagged: </span>
        <span className="truncate">{text}</span>
    </>
    return onClick
        ? <button type="button" onClick={onClick} title="Edit flag" aria-label={`Edit flag: ${text}`}
            className={`${className} transition-colors hover:border-amber-500 hover:bg-amber-400/25 cursor-pointer`}>{content}</button>
        : <span className={className} title={`Flagged: ${text}`}>{content}</span>
}

/** Small pill button to flag an outage that isn't flagged yet (sits next to the Major/Minor badge) */
export function AddFlagButton({ onClick }: { onClick: () => void }): React.JSX.Element {
    return <button type="button" onClick={onClick} title="Flag this outage"
        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-3 py-1 text-sm font-semibold text-text-muted transition-colors hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-300 cursor-pointer">
        <FlagIcon className="h-3.5 w-3.5" />Flag
    </button>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Popup to flag an outage with custom text (e.g. "Waiting on parts"), change the flag, or remove it.
 * @param initial The current flag text ("" if not flagged)
 * @param onSave Called with the new text, or "" to remove the flag
 */
export function FlagModal({ initial, onSave, onClose }: {
    initial: string,
    onSave: (text: string) => void,
    onClose: () => void,
}): React.JSX.Element {
    const [text, setText] = useState(initial)
    const [error, setError] = useState("")

    function save(e: React.FormEvent) {
        e.preventDefault()
        if (!text.trim()) return setError("Type a note for the flag, or use Remove flag.")
        onSave(text.trim())
    }

    return <Modal title={initial ? "Edit flag" : "Flag outage"} onClose={onClose} footer={<>
        {initial && <button type="button" className="mr-auto text-sm font-semibold text-red-500 hover:underline cursor-pointer" onClick={() => onSave("")}>Remove flag</button>}
        <button type="button" className={formStyles.ghostButton} onClick={onClose}>Cancel</button>
        <button type="submit" form="outage-flag-form" className={formStyles.primaryButton}>Save flag</button>
    </>}>
        <form id="outage-flag-form" onSubmit={save} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
                <span className={formStyles.label}>Flag text <span className="text-text-muted">· shown on the outage and the calendar</span></span>
                <input id="outage-flag-text" className={formStyles.input} value={text} maxLength={FLAG_MAX_LENGTH} autoFocus
                    placeholder="e.g. Waiting on parts"
                    onChange={e => { setText(e.target.value); setError("") }} />
            </label>
            <div className="flex justify-between text-xs text-text-muted">
                {error ? <span role="alert" className="font-semibold text-red-500">{error}</span> : <span />}
                <span>{text.length}/{FLAG_MAX_LENGTH}</span>
            </div>
        </form>
    </Modal>
}

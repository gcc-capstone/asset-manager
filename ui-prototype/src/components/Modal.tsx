import { useEffect, useRef } from 'react'

/** ----------------------------------------------------------------------------------------------------------------
 * A popup window. Uses the browser's <dialog>, so Escape closes it and focus stays inside while it's open.
 * Render it only while it should be open; it opens itself when it appears.
 */
export function Modal({ title, onClose, children, footer, wide = false }: {
    title: string,
    onClose: () => void,
    children: React.ReactNode,
    footer?: React.ReactNode,
    wide?: boolean,
}): React.JSX.Element {
    const ref = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const dialog = ref.current
        if (dialog && !dialog.open) dialog.showModal()
    }, [])

    return <dialog
        ref={ref}
        onClose={onClose}
        /* Clicking the dark backdrop (outside the box) closes it */
        onClick={e => { if (e.target === ref.current) onClose() }}
        aria-labelledby="modal-title"
        className={`m-auto ${wide ? 'w-[min(56rem,calc(100vw-2rem))]' : 'w-[min(34rem,calc(100vw-2rem))]'} max-h-[90vh] overflow-hidden rounded-xl border border-line bg-main-background-2 p-0 text-text shadow-2xl backdrop:bg-black/60`}>
        <div className="flex max-h-[90vh] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="modal-title" className="min-w-0 truncate text-xl text-brand-blue">{title}</h2>
                <button onClick={onClose} aria-label="Close"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl leading-none text-text-muted hover:text-text cursor-pointer">×</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                {children}
            </div>
            {footer &&
                <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                    {footer}
                </div>}
        </div>
    </dialog>
}

/** Shared Tailwind classes for form controls and buttons */
export const formStyles = {
    input: "w-full rounded-lg border border-line bg-main-background px-3 py-2 text-text placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-green",
    primaryButton: "rounded-lg bg-brand-blue px-4 py-2 font-bold text-main-background transition-colors hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue cursor-pointer",
    ghostButton: "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text cursor-pointer",
    checkbox: "h-4 w-4 shrink-0 rounded border-line bg-main-background text-brand-blue focus:ring-brand-green",
    label: "text-sm text-text-muted",
}
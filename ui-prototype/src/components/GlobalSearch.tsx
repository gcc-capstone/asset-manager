import { Fragment, useEffect, useId, useRef, useState } from "react"
import { type Plant, type Tad, type TadPart } from "../data/Data"
import { MagnifyingGlass } from "./Icons"

/** How many results to show per group (plants / TADs / parts) before asking the user to type more */
const MAX_PER_GROUP = 5

/** One clickable search result */
type Result =
    | { kind: "plant", key: string, plant: Plant }
    | { kind: "tad", key: string, tad: Tad }
    | { kind: "part", key: string, part: TadPart, tad: Tad }

type Group = { title: string, results: Result[], total: number }

/** True if any of the given fields contains the search text (case-insensitive) */
function matches(query: string, ...fields: (string | undefined)[]): boolean {
    return fields.some(field => field?.toLowerCase().includes(query))
}

/** Shows `text` with the part that matches the search in bold */
function Highlight({ text, query }: { text: string, query: string }): React.JSX.Element {
    const index = query ? text.toLowerCase().indexOf(query) : -1
    if (index < 0) return <>{text}</>
    return <>
        {text.slice(0, index)}
        <mark className="bg-transparent font-bold text-brand-green">{text.slice(index, index + query.length)}</mark>
        {text.slice(index + query.length)}
    </>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Header search. Shows as a magnifying-glass button; clicking it expands a search box that searches
 * plants (name, county), TADs (name, tag number) and parts (part number, customer number, description,
 * TAD item number) and shows grouped results in a dropdown.
 * Works with the mouse or the keyboard (↑ ↓ to move, Enter to open, Escape to close).
 * It shrinks back to the icon after a result is picked, on Escape, or when clicking elsewhere.
 * @param plants Every plant
 * @param tads Every TAD (with its parts)
 * @param onOpenPlant Called when a plant result is picked
 * @param onOpenTad Called when a TAD or part result is picked (parts open the TAD they belong to)
 */
export function GlobalSearch({ plants, tads, onOpenPlant, onOpenTad }: {
    plants: Plant[],
    tads: Tad[],
    onOpenPlant: (plant: Plant) => void,
    onOpenTad: (tad: Tad) => void,
}): React.JSX.Element {
    const [text, setText] = useState("")
    const [open, setOpen] = useState(false)
    /* Whether the search box is showing (false = just the icon) */
    const [expanded, setExpanded] = useState(false)
    /* Drives the slide-open animation: true one frame after the box appears */
    const [grown, setGrown] = useState(false)
    const iconButtonRef = useRef<HTMLButtonElement>(null)
    const [activeIndex, setActiveIndex] = useState(0)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listId = useId()

    const query = text.trim().toLowerCase()

    /* Build the three result groups */
    const groups: Group[] = []
    if (query) {
        const plantHits = plants
            .filter(plant => matches(query, plant.name, plant.county))
            .sort((a, b) => a.name.localeCompare(b.name))
        const tadHits = tads.filter(tad => matches(query, tad.name, tad.tagNumber))
        const partHits = tads.flatMap(tad => tad.parts
            .filter(part => matches(query, part.partNumber, part.customerNumber, part.description, part.tadItemNum))
            .map(part => ({ part, tad })))

        groups.push(
            { title: "Plants", total: plantHits.length, results: plantHits.slice(0, MAX_PER_GROUP).map(plant => ({ kind: "plant", key: `plant-${plant.name}`, plant })) },
            { title: "TADs", total: tadHits.length, results: tadHits.slice(0, MAX_PER_GROUP).map(tad => ({ kind: "tad", key: `tad-${tad.id}`, tad })) },
            { title: "Parts", total: partHits.length, results: partHits.slice(0, MAX_PER_GROUP).map(({ part, tad }) => ({ kind: "part", key: `part-${tad.id}-${part.id}`, part, tad })) },
        )
    }
    const visibleGroups = groups.filter(group => group.total > 0)
    const flat = visibleGroups.flatMap(group => group.results)
    const showDropdown = open && query.length > 0

    /* Keep the highlighted row inside the list when results change */
    useEffect(() => { setActiveIndex(0) }, [query])

    /* When the box opens: animate it wider and put the cursor in it */
    useEffect(() => {
        if (!expanded) return
        const frame = requestAnimationFrame(() => setGrown(true))
        inputRef.current?.focus()
        return () => cancelAnimationFrame(frame)
    }, [expanded])

    /* Shrink back to the icon when clicking anywhere outside the search */
    useEffect(() => {
        if (!expanded) return
        const onMouseDown = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) collapse()
        }
        document.addEventListener("mousedown", onMouseDown)
        return () => document.removeEventListener("mousedown", onMouseDown)
    }, [expanded])

    function expand() {
        setExpanded(true)
        setOpen(true)
    }

    /* Clears the search and goes back to just the icon */
    function collapse(returnFocus = false) {
        setText("")
        setOpen(false)
        setGrown(false)
        setExpanded(false)
        if (returnFocus) requestAnimationFrame(() => iconButtonRef.current?.focus())
    }

    function choose(result: Result) {
        if (result.kind === "plant") onOpenPlant(result.plant)
        else onOpenTad(result.tad)
        collapse()
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown" && flat.length) {
            e.preventDefault()
            setOpen(true)
            setActiveIndex(index => (index + 1) % flat.length)
        } else if (e.key === "ArrowUp" && flat.length) {
            e.preventDefault()
            setActiveIndex(index => (index - 1 + flat.length) % flat.length)
        } else if (e.key === "Enter" && showDropdown && flat[activeIndex]) {
            e.preventDefault()
            choose(flat[activeIndex])
        } else if (e.key === "Escape") {
            e.preventDefault()
            collapse(true)
        }
    }

    const optionId = (index: number) => `${listId}-option-${index}`
    let runningIndex = -1

    return <div ref={wrapperRef} className="relative h-11 w-11">
        {!expanded &&
            <button
                ref={iconButtonRef}
                type="button"
                onClick={expand}
                aria-label="Search plants, TADs and parts"
                title="Search"
                className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-main-background-2 cursor-pointer">
                <MagnifyingGlass />
            </button>}

        {expanded && <div
            className="absolute right-0 top-1/2 z-30 -translate-y-1/2 transition-[width] duration-200 ease-out"
            /* Full width is 25em, or on narrow screens whatever fits left of the account button (5.25rem = page margin + button + gap) */
            style={{ width: grown ? "min(25em, calc(100vw - 5.25rem))" : "2.75rem" }}>
            <label htmlFor={`${listId}-input`} className="sr-only">Search plants, TADs and parts</label>
            <input
                ref={inputRef}
                id={`${listId}-input`}
                type="search"
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={showDropdown && flat.length ? optionId(activeIndex) : undefined}
                autoComplete="off"
                placeholder="Search plants, TADs, parts..."
                value={text}
                onChange={e => { setText(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                className="w-full bg-main-background-2 text-brand-blue pl-4 pr-10 py-2 rounded-lg border border-brand-blue
                    focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent transition-all text-lg
                    [&::-webkit-search-cancel-button]:hidden" />
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <MagnifyingGlass />
            </div>

            {showDropdown &&
                <div id={listId} role="listbox" aria-label="Search results"
                    className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-lg border border-line bg-main-background-2 py-2 shadow-xl">
                    {flat.length === 0
                        ? <p className="px-4 py-3 text-text-muted">No plants, TADs or parts match "{text.trim()}".</p>
                        : visibleGroups.map(group =>
                            <Fragment key={group.title}>
                                <div className="flex items-baseline justify-between px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted" role="presentation">
                                    <span>{group.title}</span>
                                    <span>{group.total > group.results.length ? `${group.results.length} of ${group.total}` : group.total}</span>
                                </div>
                                {group.results.map(result => {
                                    runningIndex += 1
                                    const index = runningIndex
                                    const active = index === activeIndex
                                    return <div
                                        key={result.key}
                                        id={optionId(index)}
                                        role="option"
                                        aria-selected={active}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        onMouseDown={e => e.preventDefault() /* keep focus in the input */}
                                        onClick={() => choose(result)}
                                        className={`flex cursor-pointer flex-col px-4 py-2 ${active ? "bg-brand-light-blue" : ""}`}>
                                        {result.kind === "plant" && <>
                                            <span className="truncate font-semibold text-text"><Highlight text={result.plant.name} query={query} /></span>
                                            <span className="truncate text-sm text-text-muted"><Highlight text={`${result.plant.county} County`} query={query} /></span>
                                        </>}
                                        {result.kind === "tad" && <>
                                            <span className="truncate font-semibold text-text"><Highlight text={result.tad.name || "Unnamed TAD"} query={query} /></span>
                                            <span className="truncate text-sm text-text-muted">
                                                <Highlight text={result.tad.tagNumber || "No tag number"} query={query} /> · {result.tad.plant}
                                            </span>
                                        </>}
                                        {result.kind === "part" && <>
                                            <span className="truncate font-semibold text-text">
                                                <Highlight text={result.part.partNumber || "No part number"} query={query} />
                                                {result.part.description && <span className="font-normal text-text-muted"> · <Highlight text={result.part.description} query={query} /></span>}
                                            </span>
                                            <span className="truncate text-sm text-text-muted">In {result.tad.tagNumber || result.tad.name || "Unnamed TAD"} · {result.tad.plant}</span>
                                        </>}
                                    </div>
                                })}
                            </Fragment>)}
                    {flat.length > 0 && visibleGroups.some(group => group.total > group.results.length) &&
                        <p className="px-4 pb-1 pt-2 text-xs text-text-muted">Keep typing to narrow the results.</p>}
                </div>}
        </div>}
    </div>
}

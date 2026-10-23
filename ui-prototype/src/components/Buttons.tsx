import { LeftArrow as LeftArrowIcon, RightArrow as RightArrowIcon } from "./Icons"

/** ------------------------------------------------------------------------------------------------------------
 * Left arrow button
 */
export function LeftArrow({ onClick }: { onClick?: () => void }): React.JSX.Element {
    return <button type="button" aria-label="Previous month" onClick={onClick} className=
        "gap-2 px-4 py-2 text-brand-blue rounded-lg hover:text-brand-green transition-colors">
        <LeftArrowIcon />
    </button>
}

/** ------------------------------------------------------------------------------------------------------------
 * Right arrow button
 */
export function RightArrow({ onClick }: { onClick?: () => void }): React.JSX.Element {
    return <button type="button" aria-label="Next month" onClick={onClick} className=
        "items-center gap-2 px-4 py-2 text-brand-blue rounded-lg hover:text-brand-green transition-colors">
        <RightArrowIcon />
    </button>
}
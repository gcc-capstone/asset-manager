import { LeftArrow as LeftArrowIcon, RightArrow as RightArrowIcon } from "./Icons"

/** ------------------------------------------------------------------------------------------------------------
 * Left arrow button
 */
export function LeftArrow(): React.JSX.Element {
    return <button className=
        "gap-2 px-4 py-2 bg-main-background text-brand-blue rounded-lg hover:text-brand-green transition-colors">
        <LeftArrowIcon />
    </button>
}

/** ------------------------------------------------------------------------------------------------------------
 * Right arrow button
 */
export function RightArrow(): React.JSX.Element {
    return <button className=
        "items-center gap-2 px-4 py-2 bg-main-background text-brand-blue rounded-lg hover:text-brand-green transition-colors">
        <RightArrowIcon />
    </button>
}
/** ----------------------------------------------------------------------------------------------------------------
 * A component used to insert spacing or padding. It will adapt seamlessly based on its parent's flex direction.
 * @param p The number of units of padding (e.g. "20px", "1em")
 * @returns An instance of the React component
 */
export function Spacer({ p }: { p: string }): React.JSX.Element {
    return <div
        className="shrink-0"
        style={{ flexBasis: `${p}` }} />
}

/** ----------------------------------------------------------------------------------------------------------------
 * A component used to show a large title.
 * @param text The text for the title
 * @param onClick A function to execute if the text is clicked
 * @returns An instance of the React component
 */
export function Title({ text, onClick }: { text: string, onClick?: () => void }): React.JSX.Element {
    return <div
        className={`app-title ${onClick ? "app-hover-text" : ""}`}
        onClick={onClick}>{text}
    </div>
}

/** ----------------------------------------------------------------------------------------------------------------
 * A component used to show a subtitle.
 * @param text The text for the subtitle
 * @param onClick A function to execute if the text is clicked
 * @returns An instance of the React component
 */
export function Subtitle({ text, onClick }: { text: string, onClick?: () => void }): React.JSX.Element {
    return <span
        className={`app-subtitle ${onClick ? "app-hover-text" : ""}`}
        onClick={onClick}>{text}
    </span>
}
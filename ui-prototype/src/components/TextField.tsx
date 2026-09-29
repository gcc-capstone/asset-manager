type TextFieldProps = React.PropsWithChildren<{
    placeholder?: string,
    width?: string | number,
    height?: string | number
}>;

/** ----------------------------------------------------------------------------------------------------------------
 * A custom single-line input text field component.
 * @param placeholder the text to show before any text is entered
 * @param width The width of the text field
 * @param height The height of the text field
 * @returns An instance of the React component
 */
export function TextField({ placeholder = "", width = "", height = "", children }: TextFieldProps): React.JSX.Element {
    return <div className="relative">
        <input
            type="text"
            placeholder={placeholder}
            className={`bg-main-background-2 text-brand-blue pl-4 pr-10 py-2 rounded-lg border border-brand-blue
                            focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent
                            transition-all text-lg`}
            style={{
                width: width || undefined,
                height: height || undefined
            }}
        />
        {children}
    </div>;
}

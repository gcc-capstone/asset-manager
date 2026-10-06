import { useId } from "react";

interface CheckboxProps {
    color: string,
    text: string
};

/** ----------------------------------------------------------------------------------------------------------------
 * Represents a stylized checkbox.
 * @param color The color for the checkbox highlighting
 * @param text The text label for the checkbox
 * @returns An instance of the React component
 */
export function Checkbox({ color, text }: CheckboxProps): React.JSX.Element {
    const inputID = useId();
    return <div>
        <input type="checkbox" defaultChecked id={inputID}
            className={`h-5 w-5 rounded border-gray-300 text-${color} focus:ring-${color}`} />
        <label htmlFor={inputID} className="app-label-text app-hover-text">
            {text}
        </label>
    </div>
}

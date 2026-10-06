import { useState } from "react";


interface SliderProps {
    minValue?: number,
    maxValue?: number,
    defaultValue?: number,
    text?: string,
    onChange?: (value: number) => void
};

/** ----------------------------------------------------------------------------------------------------------------
 * A custom slider input component.
 * @param minValue The minimum value for the slider
 * @param maxValue The maximum value for the slider
 * @param text The text label to show beside the slider
 * @param onChange A function that receives the slider value when it is modified
 * @returns An instance of the React component
 */
export function Slider({
    minValue = 0,
    maxValue = 100,
    defaultValue = 50,
    text = "",
    onChange = (_: number) => { }
}: SliderProps): React.JSX.Element {

    const [value, setValue] = useState<number>(defaultValue);
    const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

    const changeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = Number(e.target.value);
        setValue(newValue);
        if (onChange) {
            onChange(newValue);
        }
    };

    return <div className="w-full max-w-sm flex flex-col gap-2">
        <div className="flex justify-between items-center text-brand-blue text-lg tracking-tight">
            <span>{text}</span>
        </div>

        <div className="relative w-full flex items-center">
            <span className="text-gray-400 text-lg pr-2">{minValue}</span>
            <input
                type="range"
                min={minValue}
                max={maxValue}
                value={value}
                onChange={changeHandler}
                className="w-full h-1.5 appearance-none rounded-full outline-none transition-all cursor-pointer
                        border border-brand-blue shadow-inner
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-7
                        [&::-webkit-slider-thumb]:h-7
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-main-background-2
                        [&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.05)]
                        [&::-webkit-slider-thumb]:border
                        [&::-webkit-slider-thumb]:border-gray-200/40
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:active:scale-95"
                style={{
                    backgroundImage: `linear-gradient(to right, #70be44 0%, #70be44 ${percentage}%,
                        #00000000 ${percentage}%, #00000000 100%)`
                } as React.CSSProperties}
            />
            <span className="text-gray-400 text-lg pl-2">{maxValue}</span>
        </div>
    </div>;
}
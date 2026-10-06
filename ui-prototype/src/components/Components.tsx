import * as Icons from "./Icons"
import * as Buttons from "./Buttons"
import { Slider as CustomSlider } from "./Slider"
import { TextField as CustomTextField } from "./TextField"
import { MainArea as CustomMainArea } from "./MainArea"
import { Checkbox as CustomCheckbox } from "./Checkbox"
import { Spacer as CustomSpacer, Title as CustomTitle, Subtitle as CustomSubtitle } from "./Titles"

/**
 * Namespace that defines a variety of reusable React components for the application.
 */
export namespace App {
    export const Icon = Icons;
    export const Button = Buttons;
    export const Spacer = CustomSpacer;
    export const Title = CustomTitle;
    export const Subtitle = CustomSubtitle;
    export const Checkbox = CustomCheckbox;
    export const MainArea = CustomMainArea;
    export const TextField = CustomTextField;
    export const Slider = CustomSlider;
}

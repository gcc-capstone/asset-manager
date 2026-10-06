import { App } from "../components/Components"


function SettingsView() {
    return <div className="flex flex-col gap-10 h-screen">

        <App.Title text="This is a title." />

        <App.Subtitle text="This is a subtitle." />

        <App.Checkbox text="This is a checkbox." color="brand-green" />

        <App.Subtitle text="Icons:"/>

        <div className="flex">
            <App.Icon.Calendar />
            <App.Icon.Company />
            <App.Icon.LeftArrow />
            <App.Icon.PowerPlants />
            <App.Icon.RightArrow />
            <App.Icon.Settings />
            <App.Icon.Star />
            <App.Icon.User/>
            <App.Icon.MagnifyingGlass/>
            <App.Icon.ModernHome/>
        </div>

        <App.TextField placeholder="This is a short text field..." width="50rem"/>

        <App.Slider text="This is a slider."/>
    </div>
}

export default SettingsView

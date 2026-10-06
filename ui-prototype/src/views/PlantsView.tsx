import db from '../data/Data'
import { App } from "../components/Components"

function PlantsView(): React.JSX.Element {

    return (
        <div className="grid no-select h-screen">
            {db.plants.map((plant) =>
                <div className="flex">
                    <App.Icon.ModernHome />
                    <App.Subtitle text={plant.name} onClick={() => { }} />
                </div>
            )}
        </div>)
}

export default PlantsView

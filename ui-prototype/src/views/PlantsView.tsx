import db, { type Plant } from '../data/Data'
import { App } from "../components/Components"

/** ----------------------------------------------------------------------------------------------------------------
 * Shows the list of plants, sorted alphabetically. Clicking one calls onSelect with that plant.
 */
function PlantsView({ onSelect }: { onSelect?: (plant: Plant) => void }): React.JSX.Element {

    /* Alphabetical by plant name (copied so the shared data isn't reordered) */
    const plants = [...db.plants].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="flex flex-col gap-4 no-select">
            <App.Title text="Plants" />
            {plants.map((plant) =>
                <div key={plant.name} className="flex items-center gap-2">
                    <App.Icon.ModernHome />
                    <App.Subtitle text={plant.name} onClick={() => onSelect?.(plant)} />
                    <span className="app-label-text opacity-60">· {plant.county} County</span>
                </div>
            )}
        </div>)
}

export default PlantsView
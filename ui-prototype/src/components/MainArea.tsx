import logo from "../assets/logo.png"
import darkLogo from "../assets/logo-dark.png"
import { TextField } from "./TextField"
import { MagnifyingGlass, User } from "./Icons"

/** ----------------------------------------------------------------------------------------------------------------
 * Defines the main content area for any page on the app, with header included. Shows which is selected
 */
type MainAreaProps = React.PropsWithChildren<{
    activeTab?: string,
    onTabSelect?: (tab: string) => void
}>

export function MainArea({ children, activeTab, onTabSelect }: MainAreaProps): React.JSX.Element {    return <>
        <header className="relative bg-main-background shadow-lg h-16 flex items-center justify-between px-6 border-b-2 border-brand-blue">

            <div className="flex items-center gap-10">
                <picture>
                    <source srcSet={darkLogo} media="(prefers-color-scheme: dark)" />
                    <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain" />
                </picture>

                {/* Header navigation links, to the right of the logo */}
                <nav className="flex items-center gap-8">
                    {["Admin", "Parts", "Plants", "Tasks"].map((label) =>
                        <button
                            key={label}
                            className={`app-header-link ${activeTab === label ? "border-brand-green" : ""}`}
                            onClick={() => onTabSelect?.(label)}>
                            {label}
                        </button>
                    )}
                </nav>
            </div>

            <TextField placeholder="Search..." width="25em">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MagnifyingGlass />
                </div>
            </TextField>

            <div className="group flex items-center gap-3 cursor-pointer z-10">
                <span className="font-medium text-xl text-brand-blue group-hover:text-brand-green group-hover:font-bold transition-colors">
                    <b>My Account</b>
                </span>
                <User />
            </div>
        </header >
        <main className="main-container flex">
            {children}
        </main>
    </>
    
}

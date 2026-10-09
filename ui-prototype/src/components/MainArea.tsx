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

export function MainArea({ children, activeTab, onTabSelect }: MainAreaProps): React.JSX.Element {

    /* The account button opens the Settings page */
    const settingsOpen = activeTab === "Settings";

    return <>
        <header className="app-shell-header relative bg-main-background shadow-lg h-16 flex items-center justify-between px-6 border-b-2 border-brand-blue">

            <div className="flex items-center gap-10 self-stretch">
                <picture className="flex items-center">
                    <source srcSet={darkLogo} media="(prefers-color-scheme: dark)" />
                    <img src={logo} alt="Company Logo" className="h-10 w-auto object-contain" />
                </picture>

                {/* Header navigation links, to the right of the logo. The current page gets a green underline. */}
                <nav className="app-shell-navigation flex items-stretch gap-8 self-stretch">
                    {["Admin", "Parts", "Plants", "Tasks"].map((label) =>
                        <button
                            key={label}
                            className="app-header-link"
                            aria-current={activeTab === label ? "page" : undefined}
                            onClick={() => onTabSelect?.(label)}>
                            {label}
                        </button>
                    )}
                </nav>
            </div>

            <div className="app-shell-search">
                <TextField placeholder="Search..." width="25em">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <MagnifyingGlass />
                    </div>
                </TextField>
            </div>

            {/* Account button: icon only, opens Settings */}
            <button
                className={`app-account-button group ${settingsOpen ? "app-account-button-active" : ""}`}
                aria-label="Account settings"
                aria-current={settingsOpen ? "page" : undefined}
                title="Account settings"
                onClick={() => onTabSelect?.("Settings")}>
                <User />
            </button>
        </header >
        <main className="main-container flex">
            {children}
        </main>
    </>

}
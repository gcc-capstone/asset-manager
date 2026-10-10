import { useEffect, useRef, useState } from 'react'
import db from '../data/Data'
import { App } from '../components/Components'

/** A user account, its roles (one or more), and the plants it has access to (matched to db.plants by name) */
type Account = {
    id: string,
    name: string,
    email: string,
    roles: string[],
    plants: string[],
}

/* Starting roles. Admins can add and remove roles from the Roles panel. */
const initialRoles: string[] = ['Admin', 'Territory Manager', 'Sales Engineer']

/* Sample accounts. Move these into data/Data.tsx (or load them from the backend) once accounts are real. */
const initialAccounts: Account[] = [
    { id: 'malvarez', name: 'Maria Alvarez', email: 'm.alvarez@example.com', roles: ['Admin', 'Territory Manager'], plants: ['Limerick Generating Station', 'Peach Bottom Nuclear Generating Station'] },
    { id: 'jokafor', name: 'James Okafor', email: 'j.okafor@example.com', roles: ['Territory Manager'], plants: ['Beaver Valley Nuclear Generating Station', 'Susquehanna Steam Electric Station', 'Keystone Generating Station'] },
    { id: 'tnguyen', name: 'Tina Nguyen', email: 't.nguyen@example.com', roles: ['Sales Engineer'], plants: ['Conemaugh Generating Station', 'Seward'] },
    { id: 'rpatel', name: 'Raj Patel', email: 'r.patel@example.com', roles: ['Sales Engineer', 'Territory Manager'], plants: ['Brunner Island Steam Electric Station'] },
    { id: 'dkim', name: 'Dana Kim', email: 'd.kim@example.com', roles: ['Territory Manager'], plants: [] },
]

/** Two-letter initials for the avatar circle */
function initials(name: string): string {
    return name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase()
}

/* Shared styling */
const inputClass = "w-full rounded-lg border border-line bg-main-background px-3 py-2 text-text placeholder:text-text-muted focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-green"
const primaryButtonClass = "rounded-lg bg-brand-blue px-4 py-2 font-bold text-main-background transition-colors hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-blue cursor-pointer"
const ghostButtonClass = "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:text-text cursor-pointer"
const dangerButtonClass = "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-text-muted transition-colors hover:border-red-500 hover:text-red-500 cursor-pointer"
const checkboxClass = "h-4 w-4 shrink-0 rounded border-line bg-main-background text-brand-blue focus:ring-brand-green"

/** ----------------------------------------------------------------------------------------------------------------
 * A popup window. Uses the browser's <dialog>, so Escape closes it and focus stays inside while it's open.
 * Render it only while it should be open; it opens itself when it appears.
 */
function Modal({ title, onClose, children, footer }: {
    title: string,
    onClose: () => void,
    children: React.ReactNode,
    footer: React.ReactNode,
}): React.JSX.Element {
    const ref = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const dialog = ref.current
        if (dialog && !dialog.open) dialog.showModal()
    }, [])

    return <dialog
        ref={ref}
        onClose={onClose}
        /* Clicking the dark backdrop (outside the box) closes it */
        onClick={e => { if (e.target === ref.current) onClose() }}
        aria-labelledby="modal-title"
        className="m-auto w-[min(34rem,calc(100vw-2rem))] max-h-[85vh] overflow-hidden rounded-xl border border-line bg-main-background-2 p-0 text-text shadow-2xl backdrop:bg-black/60">
        <div className="flex max-h-[85vh] flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 id="modal-title" className="text-xl text-brand-blue">{title}</h2>
                <button onClick={onClose} aria-label="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-text-muted hover:text-text cursor-pointer">×</button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                {children}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3">
                {footer}
            </div>
        </div>
    </dialog>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Popup with a checklist (optionally searchable). Changes only apply when Save is clicked.
 */
function ChecklistModal({ title, options, initial, minSelected = 0, searchPlaceholder, onSave, onClose }: {
    title: string,
    options: { value: string, label: string, detail?: string }[],
    initial: string[],
    minSelected?: number,
    searchPlaceholder?: string,
    onSave: (values: string[]) => void,
    onClose: () => void,
}): React.JSX.Element {
    const [draft, setDraft] = useState<string[]>(initial)
    const [query, setQuery] = useState('')

    const q = query.trim().toLowerCase()
    const visible = options.filter(option => !q || `${option.label} ${option.detail ?? ''}`.toLowerCase().includes(q))
    const tooFew = draft.length < minSelected

    const toggle = (value: string) =>
        setDraft(current => current.includes(value) ? current.filter(v => v !== value) : [...current, value])

    return <Modal title={title} onClose={onClose} footer={<>
        {tooFew && <span className="mr-auto text-sm text-red-500">Pick at least {minSelected}.</span>}
        <button className={ghostButtonClass} onClick={onClose}>Cancel</button>
        <button className={primaryButtonClass} disabled={tooFew}
            onClick={() => { onSave(options.map(o => o.value).filter(v => draft.includes(v))); onClose() }}>
            Save
        </button>
    </>}>
        {searchPlaceholder &&
            <>
                <label className="sr-only" htmlFor="checklist-search">{searchPlaceholder}</label>
                <input id="checklist-search" type="search" autoFocus placeholder={searchPlaceholder}
                    value={query} onChange={e => setQuery(e.target.value)} className={inputClass} />
            </>}

        <div className="flex items-center justify-between text-sm text-text-muted">
            <span>{draft.length} of {options.length} selected</span>
            {draft.length > 0 &&
                <button className="hover:text-text cursor-pointer" onClick={() => setDraft([])}>Clear all</button>}
        </div>

        <ul className="flex flex-col">
            {visible.map(option =>
                <li key={option.value}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-main-background">
                        <input type="checkbox" className={checkboxClass}
                            checked={draft.includes(option.value)} onChange={() => toggle(option.value)} />
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        {option.detail && <span className="shrink-0 text-sm text-text-muted">{option.detail}</span>}
                    </label>
                </li>)}
            {visible.length === 0 && <li className="px-2 py-3 text-text-muted">Nothing matches "{query}".</li>}
        </ul>
    </Modal>
}

/** ----------------------------------------------------------------------------------------------------------------
 * Admin tab: manage accounts (add / remove), each account's roles and plant access, and the list of roles.
 */
function AdminView(): React.JSX.Element {

    /* ----- Data ----- */
    const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
    const [roles, setRoles] = useState<string[]>(initialRoles)

    /* ----- Sidebar ----- */
    const [selectedId, setSelectedId] = useState<string | null>(initialAccounts[0]?.id ?? null)
    const [search, setSearch] = useState('')
    const [rolesOpen, setRolesOpen] = useState(false)
    const [newRoleName, setNewRoleName] = useState('')
    const [roleError, setRoleError] = useState('')

    /* ----- Which popup is open ----- */
    const [popup, setPopup] = useState<null | 'roles' | 'plants' | 'newAccount'>(null)

    /* ----- New account popup fields ----- */
    const [newName, setNewName] = useState('')
    const [newEmail, setNewEmail] = useState('')
    const [newRoles, setNewRoles] = useState<string[]>([])
    const [accountError, setAccountError] = useState('')

    /* ----- Delete confirmation ----- */
    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const selected = accounts.find(account => account.id === selectedId) ?? null

    /* Sidebar list, filtered by name, email or role */
    const query = search.trim().toLowerCase()
    const visibleAccounts = accounts.filter(account =>
        !query || `${account.name} ${account.email} ${account.roles.join(' ')}`.toLowerCase().includes(query))

    /* How many accounts have each role */
    const roleCount = (role: string) => accounts.filter(account => account.roles.includes(role)).length

    /* Looks up a plant's county for display */
    const countyOf = (plantName: string) => db.plants.find(plant => plant.name === plantName)?.county

    /* ======================================== Accounts ======================================== */

    function selectAccount(id: string) {
        setSelectedId(id)
        setConfirmingDelete(false)
    }

    /* Changes the selected account */
    function updateSelected(change: (account: Account) => Account) {
        if (!selected) return
        setAccounts(current => current.map(account => account.id === selected.id ? change(account) : account))
    }

    function openNewAccount() {
        setNewName('')
        setNewEmail('')
        setNewRoles(roles[0] ? [roles[0]] : [])
        setAccountError('')
        setPopup('newAccount')
    }

    function createAccount(e: React.FormEvent) {
        e.preventDefault()
        const name = newName.trim()
        const email = newEmail.trim().toLowerCase()

        if (!name) return setAccountError('Enter a name.')
        if (!/^\S+@\S+\.\S+$/.test(email)) return setAccountError('Enter a valid email address.')
        if (accounts.some(account => account.email.toLowerCase() === email)) return setAccountError('An account with that email already exists.')
        if (newRoles.length === 0) return setAccountError('Pick at least one role.')

        const account: Account = { id: `acct-${Date.now()}`, name, email, roles: newRoles, plants: [] }
        setAccounts(current => [...current, account])
        setSearch('')
        selectAccount(account.id)
        setPopup(null)
    }

    function deleteSelectedAccount() {
        if (!selected) return
        const remaining = accounts.filter(account => account.id !== selected.id)
        setAccounts(remaining)
        setConfirmingDelete(false)
        setSelectedId(remaining[0]?.id ?? null)
    }

    /* ======================================== Roles list ======================================== */

    function addRole(e: React.FormEvent) {
        e.preventDefault()
        const role = newRoleName.trim()
        if (!role) return
        if (roles.some(existing => existing.toLowerCase() === role.toLowerCase())) return setRoleError(`"${role}" already exists.`)
        setRoles(current => [...current, role])
        setNewRoleName('')
        setRoleError('')
    }

    /* Deletes a role and takes it off every account that has it.
       Blocked if that would leave an account with no roles at all. */
    function removeRole(role: string) {
        const wouldBeEmpty = accounts.filter(account => account.roles.length === 1 && account.roles[0] === role)
        if (wouldBeEmpty.length > 0) {
            const names = wouldBeEmpty.map(account => account.name).join(', ')
            return setRoleError(`"${role}" is the only role for ${names}. Give ${wouldBeEmpty.length === 1 ? 'them' : 'each of them'} another role first.`)
        }
        setRoles(current => current.filter(existing => existing !== role))
        setAccounts(current => current.map(account => ({ ...account, roles: account.roles.filter(existing => existing !== role) })))
        setRoleError('')
    }

    return <div className="flex w-full flex-col gap-6 lg:flex-row lg:gap-8">

        {/* ==================== Left: accounts + roles ==================== */}
        <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-60">

            {/* ----- Accounts ----- */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl text-brand-blue">Accounts <span className="text-sm font-normal text-text-muted">{accounts.length}</span></h2>
                    <button onClick={openNewAccount} aria-label="New account" title="New account"
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue text-xl font-bold leading-none text-main-background transition-colors hover:bg-brand-green cursor-pointer">
                        +
                    </button>
                </div>

                <label className="sr-only" htmlFor="account-search">Search accounts</label>
                <input id="account-search" type="search" placeholder="Search..." value={search}
                    onChange={e => setSearch(e.target.value)} className={inputClass + " bg-main-background-2 py-1.5 text-sm"} />

                <nav aria-label="Accounts" className="flex flex-col gap-0.5">
                    {visibleAccounts.map(account => {
                        const isSelected = account.id === selected?.id
                        return <button
                            key={account.id}
                            onClick={() => selectAccount(account.id)}
                            aria-current={isSelected ? 'true' : undefined}
                            className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer
                                ${isSelected ? 'bg-main-background-2 ring-1 ring-line' : 'hover:bg-main-background-2'}`}>
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold
                                ${isSelected ? 'bg-brand-blue text-main-background' : 'border border-line text-text-muted'}`}>
                                {initials(account.name)}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col leading-tight">
                                <span className={`truncate text-sm font-semibold ${isSelected ? 'text-brand-blue' : 'text-text'}`}>{account.name}</span>
                                <span className="truncate text-xs text-text-muted">{account.roles.join(', ')}</span>
                            </span>
                            {isSelected && <span className="h-5 w-1 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />}
                        </button>
                    })}
                    {visibleAccounts.length === 0 &&
                        <p className="px-2 py-2 text-sm text-text-muted">
                            {accounts.length === 0 ? 'No accounts yet.' : `No accounts match "${search}".`}
                        </p>}
                </nav>
            </div>

            {/* ----- Roles (collapsible) ----- */}
            <div className="flex flex-col gap-2 border-t border-line pt-3">
                <button
                    onClick={() => setRolesOpen(open => !open)}
                    aria-expanded={rolesOpen}
                    aria-controls="roles-panel"
                    className="group flex w-full items-center gap-1.5 rounded-lg py-1 text-left cursor-pointer">
                    <svg className={`h-4 w-4 text-text-muted transition-transform ${rolesOpen ? 'rotate-90' : ''}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                    </svg>
                    <h2 className="flex-1 text-lg text-brand-blue transition-colors group-hover:text-brand-green">Roles</h2>
                    <span className="text-sm text-text-muted">{roles.length}</span>
                </button>

                {rolesOpen && <div id="roles-panel" className="flex flex-col gap-2">
                    <ul className="flex flex-col">
                        {roles.map(role =>
                            <li key={role} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-main-background-2">
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{role}</span>
                                <span className="text-xs text-text-muted">{roleCount(role)}</span>
                                <button
                                    onClick={() => removeRole(role)}
                                    aria-label={`Delete role ${role}`}
                                    title={roleCount(role) > 0 ? `Delete role (also takes it off ${roleCount(role)} ${roleCount(role) === 1 ? 'account' : 'accounts'})` : 'Delete role'}
                                    className="flex h-6 w-6 items-center justify-center rounded-md text-base leading-none text-text-muted transition-colors hover:text-red-500 cursor-pointer">
                                    ×
                                </button>
                            </li>)}
                    </ul>

                    <form onSubmit={addRole} className="flex gap-1.5">
                        <label className="sr-only" htmlFor="new-role">New role name</label>
                        <input id="new-role" className={inputClass + " bg-main-background-2 py-1.5 text-sm"} placeholder="New role..." value={newRoleName}
                            onChange={e => { setNewRoleName(e.target.value); setRoleError('') }} />
                        <button type="submit" disabled={!newRoleName.trim()} className={primaryButtonClass + " px-3 py-1.5 text-sm"}>Add</button>
                    </form>
                    {roleError && <p className="text-xs text-red-500" role="alert">{roleError}</p>}
                </div>}
            </div>
        </aside>

        {/* ==================== Right: selected account ==================== */}
        {!selected
            ? <section className="flex min-w-0 flex-1 items-center justify-center rounded-lg border border-dashed border-line p-10 text-center text-text-muted">
                Select an account, or create one with the + button.
            </section>

            : <section className="flex min-w-0 flex-1 flex-col gap-7" aria-labelledby="account-name">

                {/* Account header */}
                <div className="flex flex-wrap items-center gap-4 border-b border-line pb-5">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-blue text-xl font-bold text-main-background">
                        {initials(selected.name)}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                        <h1 id="account-name" className="text-3xl text-brand-blue">{selected.name}</h1>
                        <span className="text-text-muted">{selected.email}</span>
                    </div>

                    {/* Delete account (asks to confirm first) */}
                    {confirmingDelete
                        ? <div className="flex items-center gap-2" role="alert">
                            <span className="text-sm text-text">Delete this account?</span>
                            <button onClick={deleteSelectedAccount}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-red-700 cursor-pointer">
                                Delete
                            </button>
                            <button onClick={() => setConfirmingDelete(false)} className={ghostButtonClass}>Cancel</button>
                        </div>
                        : <button onClick={() => setConfirmingDelete(true)} className={dangerButtonClass}>Delete account</button>}
                </div>

                {/* Roles on this account */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xl text-text">Roles</h2>
                        <button className={ghostButtonClass} onClick={() => setPopup('roles')}>Edit</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {selected.roles.map(role =>
                            <span key={role} className="rounded-full border border-line bg-main-background-2 px-3 py-1 text-sm font-semibold text-text">{role}</span>)}
                    </div>
                </div>

                {/* Plant access */}
                <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-xl text-text">
                            Plant access <span className="text-base font-normal text-text-muted">{selected.plants.length}</span>
                        </h2>
                        <button className={ghostButtonClass} onClick={() => setPopup('plants')}>Edit</button>
                    </div>

                    {selected.plants.length === 0
                        ? <p className="rounded-lg border border-dashed border-line p-6 text-center text-text-muted">
                            {selected.name} doesn't have access to any plants yet. Click Edit to add some.
                        </p>
                        : <ul className="flex flex-col overflow-hidden rounded-lg border border-line bg-main-background-2">
                            {selected.plants.map((plantName, index) =>
                                <li key={plantName}
                                    className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-line' : ''}`}>
                                    <App.Icon.ModernHome />
                                    <span className="min-w-0 flex-1 font-semibold text-text">{plantName}</span>
                                    {countyOf(plantName) &&
                                        <span className="shrink-0 text-sm text-text-muted">{countyOf(plantName)} County</span>}
                                </li>
                            )}
                        </ul>}
                </div>
            </section>}

        {/* ==================== Popups ==================== */}

        {popup === 'roles' && selected &&
            <ChecklistModal
                title={`Roles for ${selected.name}`}
                options={roles.map(role => ({ value: role, label: role }))}
                initial={selected.roles}
                minSelected={1}
                onSave={values => updateSelected(account => ({ ...account, roles: values }))}
                onClose={() => setPopup(null)} />}

        {popup === 'plants' && selected &&
            <ChecklistModal
                title={`Plant access for ${selected.name}`}
                options={db.plants.map(plant => ({ value: plant.name, label: plant.name, detail: plant.county }))}
                initial={selected.plants}
                searchPlaceholder="Search plants..."
                onSave={values => updateSelected(account => ({ ...account, plants: values }))}
                onClose={() => setPopup(null)} />}

        {popup === 'newAccount' &&
            <Modal title="New account" onClose={() => setPopup(null)} footer={<>
                <button className={ghostButtonClass} onClick={() => setPopup(null)}>Cancel</button>
                <button className={primaryButtonClass} type="submit" form="new-account-form">Create account</button>
            </>}>
                <form id="new-account-form" onSubmit={createAccount} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-text-muted" htmlFor="new-account-name">Name</label>
                        <input id="new-account-name" className={inputClass} value={newName} autoFocus
                            onChange={e => setNewName(e.target.value)} placeholder="Full name" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-sm text-text-muted" htmlFor="new-account-email">Email</label>
                        <input id="new-account-email" type="email" className={inputClass} value={newEmail}
                            onChange={e => setNewEmail(e.target.value)} placeholder="name@company.com" />
                    </div>
                    <fieldset className="flex flex-col gap-1">
                        <legend className="mb-1 text-sm text-text-muted">Roles</legend>
                        {roles.map(role =>
                            <label key={role} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-main-background">
                                <input type="checkbox" className={checkboxClass} checked={newRoles.includes(role)}
                                    onChange={() => setNewRoles(current => current.includes(role) ? current.filter(r => r !== role) : [...current, role])} />
                                {role}
                            </label>)}
                    </fieldset>
                    <p className="text-sm text-text-muted">You can give them plant access after the account is created.</p>
                    {accountError && <p className="text-sm text-red-500" role="alert">{accountError}</p>}
                </form>
            </Modal>}
    </div>
}

export default AdminView
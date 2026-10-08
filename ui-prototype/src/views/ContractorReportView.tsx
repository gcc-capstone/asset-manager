import { useState } from 'react'
import { App } from '../components/Components'

type ReportFields = {
    contractorName: string,
    contractorCompany: string,
    plant: string,
    customer: string,
    site: string,
    unit: string,
    customerPo: string,
    opportunityNumber: string,
    workScope: string,
    leadTechnician: string,
    technicianPhone: string,
    technicianEmail: string,
    customerContact: string,
    contactPosition: string,
    contactPhone: string,
    contactEmail: string,
    workDate: string,
    startTime: string,
    endTime: string,
    breakHours: string,
    workType: string,
}

type Equipment = {
    id: string,
    application: string,
    assetTag: string,
    serial: string,
    brand: string,
    model: string,
    workPerformed: string,
}

type DailyLog = {
    id: string,
    date: string,
    assetTag: string,
    notes: string,
}

type UsedPart = {
    id: string,
    quantity: string,
    partNumber: string,
    description: string,
    application: string,
}

const currentDate = new Date()
const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`

const initialFields: ReportFields = {
    contractorName: 'Jordan Ellis',
    contractorCompany: 'Buehler Field Services',
    plant: 'Riverside Power Plant',
    customer: 'Riverside Energy',
    site: 'Beaver County, PA',
    unit: 'Unit 1',
    customerPo: 'PO-10482',
    opportunityNumber: 'OPP-26018',
    workScope: 'Repair and inspection',
    leadTechnician: 'Jordan Ellis',
    technicianPhone: '(555) 010-2048',
    technicianEmail: 'jordan.ellis@example.com',
    customerContact: 'Morgan Lee',
    contactPosition: 'Maintenance Supervisor',
    contactPhone: '(555) 010-1022',
    contactEmail: 'morgan.lee@example.com',
    workDate: today,
    startTime: '07:00',
    endTime: '16:30',
    breakHours: '0.5',
    workType: 'Repair',
}

const fieldClassName = 'w-full rounded-lg border border-brand-blue bg-main-background px-3 py-3 text-base text-brand-blue placeholder:text-brand-blue/50 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-green'

function FormField({
    label,
    value,
    onChange,
    type = 'text',
    placeholder,
}: {
    label: string,
    value: string,
    onChange: (value: string) => void,
    type?: string,
    placeholder?: string,
}): React.JSX.Element {
    return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-brand-blue">
        {label}
        <input
            className={fieldClassName}
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
        />
    </label>
}

function ContractorReportView(): React.JSX.Element {
    const [fields, setFields] = useState(initialFields)
    const [equipment, setEquipment] = useState<Equipment[]>([
        {
            id: 'equipment-1',
            application: 'Feedwater system',
            assetTag: 'RIV-PMP-102',
            serial: 'SN-24861',
            brand: 'Northstar',
            model: 'FW-400',
            workPerformed: '',
        },
    ])
    const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([
        { id: 'daily-log-1', date: today, assetTag: 'RIV-PMP-102', notes: '' },
    ])
    const [usedParts, setUsedParts] = useState<UsedPart[]>([
        { id: 'used-part-1', quantity: '', partNumber: '', description: '', application: '' },
    ])
    const [saved, setSaved] = useState(false)

    const updateField = (key: keyof ReportFields, value: string) => {
        setFields((current) => ({ ...current, [key]: value }))
        setSaved(false)
    }

    const startMinutes = fields.startTime ? Number(fields.startTime.slice(0, 2)) * 60 + Number(fields.startTime.slice(3, 5)) : 0
    const endMinutes = fields.endTime ? Number(fields.endTime.slice(0, 2)) * 60 + Number(fields.endTime.slice(3, 5)) : 0
    const shiftMinutes = endMinutes >= startMinutes ? endMinutes - startMinutes : endMinutes + 24 * 60 - startMinutes
    const totalHours = Math.max(0, shiftMinutes / 60 - (Number(fields.breakHours) || 0)).toFixed(1)

    function addDailyLog() {
        setDailyLogs((current) => [...current, { id: crypto.randomUUID(), date: fields.workDate, assetTag: equipment[0]?.assetTag ?? '', notes: '' }])
    }

    function updateDailyLog(id: string, key: keyof Omit<DailyLog, 'id'>, value: string) {
        setDailyLogs((current) => current.map((log) => log.id === id ? { ...log, [key]: value } : log))
    }

    function addUsedPart() {
        setUsedParts((current) => [...current, { id: crypto.randomUUID(), quantity: '', partNumber: '', description: '', application: '' }])
    }

    function updateUsedPart(id: string, key: keyof Omit<UsedPart, 'id'>, value: string) {
        setUsedParts((current) => current.map((part) => part.id === id ? { ...part, [key]: value } : part))
    }

    function updateEquipment(id: string, key: keyof Omit<Equipment, 'id'>, value: string) {
        setEquipment((current) => current.map((item) => item.id === id ? { ...item, [key]: value } : item))
    }

    function addEquipment() {
        setEquipment((current) => [...current, {
            id: crypto.randomUUID(),
            application: '',
            assetTag: '',
            serial: '',
            brand: '',
            model: '',
            workPerformed: '',
        }])
    }

    return <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header>
            <p className="mb-1 text-sm font-bold uppercase tracking-widest text-brand-green">Contractor portal</p>
            <App.Title text="Service report" />
            <p className="app-label-text -mt-3 text-base opacity-75">
                Record your on-site work, hours, equipment, and parts used.
            </p>
        </header>

        <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-brand-blue">Brand colors</h2>
            <p className="mb-3 text-sm text-brand-blue opacity-70">Colors used throughout this report screen</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                    ['Brand blue', '#005FA9', '#005FA9'],
                    ['Brand green', '#70BE44', '#70BE44'],
                    ['Light blue', '#DEE6ED', '#DEE6ED'],
                    ['Light green', '#E1EDDE', '#E1EDDE'],
                ].map(([name, hex, color]) =>
                    <div key={name} className="flex min-w-0 items-center gap-2 rounded-lg border border-brand-light-blue bg-main-background p-2">
                        <span className="h-8 w-8 shrink-0 rounded-md border border-black/10" style={{ backgroundColor: color }} />
                        <span className="min-w-0">
                            <span className="block truncate text-xs font-bold text-brand-blue">{name}</span>
                            <span className="block text-xs text-brand-blue opacity-70">{hex}</span>
                        </span>
                    </div>
                )}
            </div>
        </section>

        <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
                event.preventDefault()
                setSaved(true)
            }}>
            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-bold text-brand-blue">Report & assignment</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Contractor name" value={fields.contractorName} onChange={(value) => updateField('contractorName', value)} />
                    <FormField label="Contractor company" value={fields.contractorCompany} onChange={(value) => updateField('contractorCompany', value)} />
                    <FormField label="Assigned plant" value={fields.plant} onChange={(value) => updateField('plant', value)} />
                    <FormField label="Customer / company name" value={fields.customer} onChange={(value) => updateField('customer', value)} />
                    <FormField label="Site" value={fields.site} onChange={(value) => updateField('site', value)} />
                    <FormField label="Unit / train" value={fields.unit} onChange={(value) => updateField('unit', value)} />
                    <FormField label="Customer PO #" value={fields.customerPo} onChange={(value) => updateField('customerPo', value)} />
                    <FormField label="Opportunity #" value={fields.opportunityNumber} onChange={(value) => updateField('opportunityNumber', value)} />
                    <FormField label="Scope of work" value={fields.workScope} onChange={(value) => updateField('workScope', value)} />
                </div>
                <p className="mt-3 text-sm text-brand-blue opacity-70">
                    Assignment details are prefilled for this example and can be changed.
                </p>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-bold text-brand-blue">Technician & customer contacts</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Lead technician" value={fields.leadTechnician} onChange={(value) => updateField('leadTechnician', value)} />
                    <FormField label="Technician phone" value={fields.technicianPhone} onChange={(value) => updateField('technicianPhone', value)} type="tel" />
                    <FormField label="Technician email" value={fields.technicianEmail} onChange={(value) => updateField('technicianEmail', value)} type="email" />
                    <FormField label="Customer contact" value={fields.customerContact} onChange={(value) => updateField('customerContact', value)} />
                    <FormField label="Contact position" value={fields.contactPosition} onChange={(value) => updateField('contactPosition', value)} />
                    <FormField label="Contact phone" value={fields.contactPhone} onChange={(value) => updateField('contactPhone', value)} type="tel" />
                    <FormField label="Contact email" value={fields.contactEmail} onChange={(value) => updateField('contactEmail', value)} type="email" />
                </div>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <h2 className="mb-4 text-xl font-bold text-brand-blue">On-site time</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Date on site" value={fields.workDate} onChange={(value) => updateField('workDate', value)} type="date" />
                    <label className="flex min-w-0 flex-col gap-1.5 text-sm font-bold text-brand-blue">
                        Service type
                        <select
                            className={fieldClassName}
                            value={fields.workType}
                            onChange={(event) => updateField('workType', event.target.value)}>
                            {['Repair', 'Replacement', 'Installation', 'Inspection', 'Other'].map((workType) =>
                                <option key={workType}>{workType}</option>
                            )}
                        </select>
                    </label>
                    <FormField label="Arrival time" value={fields.startTime} onChange={(value) => updateField('startTime', value)} type="time" />
                    <FormField label="Departure time" value={fields.endTime} onChange={(value) => updateField('endTime', value)} type="time" />
                    <FormField label="Break (hours)" value={fields.breakHours} onChange={(value) => updateField('breakHours', value)} type="number" />
                    <div className="flex flex-col justify-center rounded-lg bg-brand-light-blue p-3">
                        <span className="text-sm font-bold text-brand-blue">Total on-site time</span>
                        <span className="text-2xl font-bold text-brand-blue">{totalHours} hours</span>
                        <span className="text-xs text-brand-blue opacity-70">Calculated from arrival, departure, and break</span>
                    </div>
                </div>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue">Equipment serviced</h2>
                        <p className="text-sm text-brand-blue opacity-70">Add an entry for each asset worked on.</p>
                    </div>
                    <button
                        className="rounded-lg border border-brand-blue px-3 py-2 text-sm font-bold text-brand-blue hover:bg-brand-light-blue"
                        type="button"
                        onClick={addEquipment}>
                        + Add equipment
                    </button>
                </div>
                {equipment.length === 0
                    ? <p className="rounded-lg border border-dashed border-brand-blue p-4 text-sm text-brand-blue opacity-70">
                        No equipment added yet.
                    </p>
                    : <div className="flex flex-col gap-4">
                        {equipment.map((item, index) =>
                            <div key={item.id} className="rounded-lg border border-brand-light-blue bg-main-background p-3">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-bold text-brand-blue">Equipment {index + 1}</h3>
                                    <button
                                        className="text-sm font-bold text-red-700"
                                        type="button"
                                        onClick={() => setEquipment((current) => current.filter((entry) => entry.id !== item.id))}>
                                        Remove
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <FormField label="Application / part" value={item.application} onChange={(value) => updateEquipment(item.id, 'application', value)} />
                                    <FormField label="Plant asset tag" value={item.assetTag} onChange={(value) => updateEquipment(item.id, 'assetTag', value)} />
                                    <FormField label="Serial #" value={item.serial} onChange={(value) => updateEquipment(item.id, 'serial', value)} />
                                    <FormField label="Brand" value={item.brand} onChange={(value) => updateEquipment(item.id, 'brand', value)} />
                                    <FormField label="Model" value={item.model} onChange={(value) => updateEquipment(item.id, 'model', value)} />
                                </div>
                                <label className="mt-4 flex flex-col gap-1.5 text-sm font-bold text-brand-blue">
                                    Work performed on this equipment
                                    <textarea
                                        className={`${fieldClassName} min-h-24 resize-y`}
                                        value={item.workPerformed}
                                        onChange={(event) => updateEquipment(item.id, 'workPerformed', event.target.value)}
                                        placeholder="Describe the repair, replacement, installation, inspection, and result..."
                                    />
                                </label>
                            </div>
                        )}
                    </div>}
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue">Daily work log</h2>
                        <p className="text-sm text-brand-blue opacity-70">Record work and equipment tags for each day on site.</p>
                    </div>
                    <button className="rounded-lg border border-brand-blue px-3 py-2 text-sm font-bold text-brand-blue hover:bg-brand-light-blue" type="button" onClick={addDailyLog}>
                        + Add day
                    </button>
                </div>
                <div className="flex flex-col gap-4">
                    {dailyLogs.map((log, index) =>
                        <div key={log.id} className="rounded-lg border border-brand-light-blue bg-main-background p-3">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-bold text-brand-blue">Day {index + 1}</h3>
                                {dailyLogs.length > 1 &&
                                    <button
                                        className="text-sm font-bold text-red-700"
                                        type="button"
                                        onClick={() => setDailyLogs((current) => current.filter((item) => item.id !== log.id))}>
                                        Remove
                                    </button>}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr]">
                                <FormField label="Date" value={log.date} onChange={(value) => updateDailyLog(log.id, 'date', value)} type="date" />
                                <FormField label="Asset tag" value={log.assetTag} onChange={(value) => updateDailyLog(log.id, 'assetTag', value)} />
                            </div>
                            <label className="mt-3 flex flex-col gap-1.5 text-sm font-bold text-brand-blue">
                                Daily log
                                <textarea
                                    className={`${fieldClassName} min-h-24 resize-y`}
                                    value={log.notes}
                                    onChange={(event) => updateDailyLog(log.id, 'notes', event.target.value)}
                                    placeholder="What work was done today?"
                                />
                            </label>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-xl border border-brand-blue bg-main-background-2 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-brand-blue">Parts used</h2>
                        <p className="text-sm text-brand-blue opacity-70">Add parts installed or replaced during the work.</p>
                    </div>
                    <button className="rounded-lg border border-brand-blue px-3 py-2 text-sm font-bold text-brand-blue hover:bg-brand-light-blue" type="button" onClick={addUsedPart}>
                        + Add part
                    </button>
                </div>
                <div className="flex flex-col gap-4">
                    {usedParts.map((part, index) =>
                        <div key={part.id} className="rounded-lg border border-brand-light-blue bg-main-background p-3">
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="font-bold text-brand-blue">Part {index + 1}</h3>
                                {usedParts.length > 1 &&
                                    <button
                                        className="text-sm font-bold text-red-700"
                                        type="button"
                                        onClick={() => setUsedParts((current) => current.filter((item) => item.id !== part.id))}>
                                        Remove
                                    </button>}
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <FormField label="Quantity" value={part.quantity} onChange={(value) => updateUsedPart(part.id, 'quantity', value)} type="number" />
                                <FormField label="Part #" value={part.partNumber} onChange={(value) => updateUsedPart(part.id, 'partNumber', value)} />
                                <FormField label="Description" value={part.description} onChange={(value) => updateUsedPart(part.id, 'description', value)} />
                                <FormField label="Application / asset tag" value={part.application} onChange={(value) => updateUsedPart(part.id, 'application', value)} />
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <div className="sticky bottom-0 -mx-4 border-t border-brand-blue bg-main-background/95 p-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
                <button
                    className="w-full rounded-lg bg-brand-blue px-5 py-3 text-base font-bold text-white transition-colors hover:bg-brand-green sm:w-auto"
                    type="submit">
                    Save service report
                </button>
                {saved && <p className="mt-2 text-sm font-bold text-brand-green" role="status">Report saved in this demo.</p>}
            </div>
        </form>
    </div>
}

export default ContractorReportView

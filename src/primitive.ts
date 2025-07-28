import { AnyObject }                      from '@itrocks/class-type'
import { KeyOf }                          from '@itrocks/class-type'
import { ObjectOrType }                   from '@itrocks/class-type'
import { precisionOf }                    from '@itrocks/precision'
import { setPropertyTypeTransformers }    from '@itrocks/transformer'
import { EDIT, HTML, INPUT, OUTPUT }      from '@itrocks/transformer'
import { READ, SAVE, SQL }                from '@itrocks/transformer'

const lfTab = '\n\t\t\t\t'

export type CoreDependencies = {
	displayOf:   (object: AnyObject, property: string) => string,
	fieldIdOf:   (property: string) => string,
	fieldNameOf: (property: string) => string,
	tr:          (text: string)     => string
}

export type Dependencies = CoreDependencies & {
	formatDate: (date: Date)   => string,
	parseDate:  (date: string) => Date,
}

const depends: Dependencies = {
	displayOf:   (_object, property) => property,
	formatDate:  date     => date.toString(),
	fieldIdOf:   property => property,
	fieldNameOf: property => property,
	parseDate:   date     => new Date(date),
	tr:          text     => text
}

// Bigint

export function initBigintHtmlTransformers()
{
	setPropertyTypeTransformers(BigInt, [
		{ format: HTML, direction: INPUT, transformer: (value: string) => BigInt(value) }
	])
}

// Boolean

function booleanEdit<T extends object>(value: boolean, type: ObjectOrType<T>, property: KeyOf<T>)
{
	const fieldId   = depends.fieldIdOf(property)
	const fieldName = depends.fieldNameOf(property)
	const label     = `<label for="${fieldId}">${depends.tr(depends.displayOf(type, property))}</label>`
	const name      = `id="${fieldId}" name="${fieldName}"`
	const hidden    = `<input name="${fieldName}" type="hidden" value="0">`
	const checked   = value ? 'checked ' : ''
	const checkbox  = `<input ${checked}${name} type="checkbox" value="1">`
	return label + lfTab + hidden + lfTab + checkbox
}

const booleanInput = (value: string) => !['', '0', 'false', 'no', depends.tr('false'), depends.tr('no')].includes(value)

export function initBooleanHtmlTransformers()
{
	setPropertyTypeTransformers(Boolean, [
		{ format: HTML, direction: EDIT,   transformer: booleanEdit },
		{ format: HTML, direction: INPUT,  transformer: booleanInput },
		{ format: HTML, direction: OUTPUT, transformer: (value: boolean) => value ? depends.tr('yes') : depends.tr('no') }
	])

}

export function initBooleanSqlTransformers()
{
	setPropertyTypeTransformers(Boolean, [
		{ format: SQL,  direction: READ,   transformer: (value: string)  => !!value },
		{ format: SQL,  direction: SAVE,   transformer: (value: boolean) => +value }
	])
}

// Date

function dateEdit<T extends object>(value: Date, type: ObjectOrType<T>, property: KeyOf<T>)
{
	const fieldId    = depends.fieldIdOf(property)
	const fieldName  = depends.fieldNameOf(property)
	const label      = `<label for="${fieldId}">${depends.tr(depends.displayOf(type, property))}</label>`
	const name       = `id="${fieldId}" name="${fieldName}"`
	const inputValue = value ? ` value="${depends.formatDate(value)}"` : ''
	const input      = `<input data-type="date" ${name}${inputValue}>`
	return label + lfTab + input
}

const dateInput  = (value: string) => depends.parseDate(value)
const dateOutput = (value: Date)   => value ? depends.formatDate(value) : ''

export function initDateHtmlTransformers()
{
	setPropertyTypeTransformers(Date, [
		{ format: HTML, direction: EDIT, transformer: dateEdit },
		{ format: HTML, direction: INPUT, transformer: dateInput },
		{ format: HTML, direction: OUTPUT, transformer: dateOutput }
	])
}

// Number

function numberEdit<T extends object>(value: number | undefined, type: ObjectOrType<T>, property: KeyOf<T>)
{
	const output     = numberOutput(value, type, property)
	const fieldId    = depends.fieldIdOf(property)
	const fieldName  = depends.fieldNameOf(property)
	const label      = `<label for="${fieldId}">${depends.tr(depends.displayOf(type, property))}</label>`
	const name       = `id="${fieldId}" name="${fieldName}"`
	const inputValue = (output !== undefined) ? ` value="${output}"` : ''
	const input      = `<input data-type="number" ${name}${inputValue}>`
	return label + lfTab + input
}

function numberInput(value: string)
{
	const number = (value === '') ? undefined : +(value.replace(/\s/g, '').replace(',', '.'))
	if (!Number.isNaN(number)) return number
	const endChar = value[value.length - 1].toUpperCase()
	if (endChar === 'K') return (+value.slice(0, -1)) * 1e3
	if (endChar === 'M') return (+value.slice(0, -1)) * 1e6
	if (endChar === 'G') return (+value.slice(0, -2)) * 1e9
	if (endChar === 'T') return (+value.slice(0, -2)) * 1e12
	if (endChar === 'P') return (+value.slice(0, -2)) * 1e15
	if ((endChar === 'D') && (value[value.length - 2] === 'M')) return (+value.slice(0, -2)) * 10**9
	return number
}

function numberOutput<T extends object>(value: number | undefined, object: ObjectOrType<T>, property: KeyOf<T>)
{
	if (value === undefined) return ''
	const precision = precisionOf(object, property)
	return value.toLocaleString('fr-FR', {
		minimumFractionDigits: precision.minimum,
		maximumFractionDigits: precision.maximum
	})
}

function numberRead(value: number | string)
{
	return (typeof value === 'string') ? +value : (value ?? undefined)
}

export function initNumberHtmlTransformers()
{
	setPropertyTypeTransformers(Number, [
		{ format: HTML, direction: EDIT,   transformer: numberEdit },
		{ format: HTML, direction: INPUT,  transformer: numberInput },
		{ format: HTML, direction: OUTPUT, transformer: numberOutput },
		{ format: SQL,  direction: READ,   transformer: numberRead }
	])
}

// default

function defaultEdit<T extends object>(value: any, type: ObjectOrType<T>, property: KeyOf<T>)
{
	const fieldId    = depends.fieldIdOf(property)
	const fieldName  = depends.fieldNameOf(property)
	const label      = `<label for="${fieldId}">${depends.tr(depends.displayOf(type, property))}</label>`
	const name       = `id="${fieldId}" name="${fieldName}"`
	const inputValue = value ? ` value="${value}"` : ''
	const input      = `<input ${name}${inputValue}>`
	return label + lfTab + input
}

export function initDefaultHtmlEditTransformers()
{
	setPropertyTypeTransformers(null, [{ format: HTML, direction: EDIT, transformer: defaultEdit }])
}

// all

export function initPrimitiveTransformers(dependencies: Partial<Dependencies> = {})
{
	setPrimitiveDependencies(dependencies)

	initBigintHtmlTransformers()
	initBooleanSqlTransformers()
	initBooleanHtmlTransformers()
	initDateHtmlTransformers()
	initNumberHtmlTransformers()

	initDefaultHtmlEditTransformers()
}

// Initialize dependencies required by all core primitive transformers except Date
export function setCorePrimitiveDependencies(dependencies: Partial<CoreDependencies>)
{
	Object.assign(depends, dependencies)
}

// Initialize dependencies required by all core primitive transformers, including Date
export function setPrimitiveDependencies(dependencies: Partial<Dependencies>)
{
	Object.assign(depends, dependencies)
}

import { baseType }                   from '@itrocks/class-type'
import { ObjectOrType }               from '@itrocks/class-type'
import { typeOf }                     from '@itrocks/class-type'
import { StringObject }               from '@itrocks/class-type'
import { Type }                       from '@itrocks/class-type'
import { representativeOf }           from '@itrocks/class-view'
import { ReflectProperty }            from '@itrocks/reflect'
import { dataSource }                 from '@itrocks/storage'
import { Entity }                     from '@itrocks/storage'
import { MayEntity }                  from '@itrocks/storage'
import { setPropertyTypeTransformer } from '@itrocks/transformer'
import { EDIT, HTML }                 from '@itrocks/transformer'
import { INPUT, OUTPUT, SAVE, SQL }   from '@itrocks/transformer'

const lfTab = '\n\t\t\t\t'

export type SqlDependencies = {
	ignoreTransformedValue: any
}

export type Dependencies = SqlDependencies & {
	displayOf:              <T extends object>(object: ObjectOrType<T>, property: keyof T) => string,
	fieldIdOf:              (property: keyof any) => string,
	fieldNameOf:            (property: keyof any) => string,
	representativeValueOf:  (object: object) => Promise<string>,
	routeOf:                (type: Type) => string,
	tr:                     (text: string) => string
}

const depends: Dependencies = {
	displayOf:              (_object, property) => property.toString(),
	fieldIdOf:              property => property.toString(),
	fieldNameOf:            property => property.toString(),
	ignoreTransformedValue: Symbol('ignoreTransformedValue'),
	representativeValueOf:  async object => baseType(typeOf(object)).name,
	routeOf:                type => '/' + baseType(type).name,
	tr:                     text => text
}

export function initStoreHtmlTransformers(target: Type)
{
	setPropertyTypeTransformer(target, HTML, EDIT,   storeEdit)
	setPropertyTypeTransformer(target, HTML, INPUT,  storeInput)
	setPropertyTypeTransformer(target, HTML, OUTPUT, storeOutput)
}

export function initStoreSqlTransformers(target: Type)
{
	setPropertyTypeTransformer(target, SQL, SAVE, storeSave)
}

export function initStoreTransformers(target: Type)
{
	initStoreHtmlTransformers(target)
	initStoreSqlTransformers(target)
}

export function setStoreDependencies(dependencies: Partial<Dependencies>)
{
	Object.assign(depends, dependencies)
}

export const setStoreHtmlDependencies = setStoreDependencies

export const setStoreSqlDependencies: (dependencies: Partial<SqlDependencies>) => void = setStoreDependencies

async function storeEdit<T extends object>(value: Entity | undefined, object: T, property: keyof T)
{
	const fieldName  = depends.fieldNameOf(property)
	const fieldId    = depends.fieldIdOf(property)
	const type       = new ReflectProperty(object, property).type.type as Type
	const textValue  = value ? await depends.representativeValueOf(value) : ''
	const fetch      = depends.routeOf(type) + '/summary'
	const label      = `<label for="${fieldId}">${depends.tr(depends.displayOf(object, property))}</label>`
	const name       = `id="${fieldId}" name="${fieldName}"`
	const inputValue = (textValue === '') ? '' : ` value="${textValue}"`
	const input      = `<input data-fetch="${fetch}" data-type="object" ${name}${inputValue}>`
	const inputId    = `<input id="${fieldId}-id" name="${fieldName}_id" type="hidden" value="${value?.id}">`
	return label + lfTab + inputId + input
}

function storeInput<T extends object>(
	value: MayEntity | string | undefined, object: T, property: keyof T, data: StringObject
) {
	const propertyId = (property.toString() + 'Id') as keyof T
	const fieldId    = depends.fieldNameOf(propertyId)
	const id         = +data[fieldId]
	if (id === ((propertyId in object) ? object[propertyId] : (value as Entity | undefined)?.id)) {
		return depends.ignoreTransformedValue
	}
	delete object[property]
	if (id) {
		Object.assign(object, { [propertyId]: id })
	}
	else if ((typeof value === 'object')) {
		Object.assign(object, { [property]: value })
	}
	else if ((typeof value === 'string') && (value !== '')) {
		const reflectProperty = new ReflectProperty(object, property)
		const newObject: any  = new (reflectProperty.type.type as Type)(value)
		const representative  = representativeOf(newObject)[0]
		if (representative && (newObject[representative] === undefined)) {
			newObject[representative] = value
		}
		Object.assign(object, { [property]: newObject })
	}
	return depends.ignoreTransformedValue
}

async function storeOutput(value: MayEntity | undefined)
{
	return value ? await depends.representativeValueOf(value) : ''
}

async function storeSave<T extends object>(value: MayEntity | undefined, _object: T, property: keyof T, record: any)
{
	const dao = dataSource()
	if (value && !dao.isObjectConnected(value)) {
		await dao.save(value)
	}
	const columnId   = property.toString() + '_id'
	const id         = (value && dao.isObjectConnected(value)) ? value.id : record[columnId]
	record[columnId] = id ?? null
	return depends.ignoreTransformedValue
}

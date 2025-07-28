import {AnyObject, baseType, KeyOf, typeOf} from '@itrocks/class-type'
import { StringObject }                     from '@itrocks/class-type'
import { Type }                             from '@itrocks/class-type'
import { ReflectProperty }                  from '@itrocks/reflect'
import { dataSource, Entity, MayEntity }    from '@itrocks/storage'
import { setPropertyTypeTransformer }       from '@itrocks/transformer'
import { EDIT, HTML }                       from '@itrocks/transformer'
import { INPUT, OUTPUT, SAVE, SQL }         from '@itrocks/transformer'

const lfTab = '\n\t\t\t\t'

export type SqlDependencies = {
	ignoreTransformedValue: any
}

export type Dependencies = SqlDependencies & {
	displayOf:              (object: AnyObject, property: string) => string,
	fieldIdOf:              (property: string) => string,
	fieldNameOf:            (property: string) => string,
	representativeValueOf:  (object: object) => string,
	routeOf:                (type: Type) => string,
	tr:                     (text: string) => string
}

const depends: Dependencies = {
	displayOf:              (_object, property) => property,
	fieldIdOf:              property => property,
	fieldNameOf:            property => property,
	ignoreTransformedValue: Symbol('ignoreTransformedValue'),
	representativeValueOf:  object => baseType(typeOf(object)).name,
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

function storeEdit<T extends object>(value: Entity | undefined, object: T, property: KeyOf<T>)
{
	const fieldName  = depends.fieldNameOf(property)
	const fieldId    = depends.fieldIdOf(property)
	const type       = new ReflectProperty(object, property).type.type as Type
	const textValue  = value ? depends.representativeValueOf(value) : ''
	const fetch      = depends.routeOf(type) + '/summary'
	const label      = `<label for="${fieldId}">${depends.tr(depends.displayOf(object, property))}</label>`
	const name       = `id="${fieldId}" name="${fieldName}"`
	const inputValue = (textValue === '') ? '' : ` value="${textValue}"`
	const input      = `<input data-fetch="${fetch}" data-type="object" ${name}${inputValue}>`
	const inputId    = `<input id="${fieldId}-id" name="${fieldName}_id" type="hidden" value="${value?.id}">`
	return label + lfTab + input + inputId
}

function storeInput<T extends AnyObject>(
	value: MayEntity | string | undefined, object: T, property: KeyOf<T>, data: StringObject
) {
	const propertyId = property + 'Id'
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
		Object.assign(object, { [property]: new (reflectProperty.type.type as Type)(value) })
	}
	return depends.ignoreTransformedValue
}

function storeOutput(value: MayEntity | undefined)
{
	return value ? depends.representativeValueOf(value) : ''
}

async function storeSave<T extends AnyObject>(
	value: MayEntity | undefined, _object: T, property: KeyOf<T>, record: AnyObject
) {
	const dao = dataSource()
	if (value && !dao.isObjectConnected(value)) {
		await dao.save(value)
	}
	const columnId   = property + '_id'
	const id         = (value && dao.isObjectConnected(value)) ? value.id : record[columnId]
	record[columnId] = id ?? null
	return depends.ignoreTransformedValue
}

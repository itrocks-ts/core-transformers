import {AnyObject, baseType, KeyOf, typeOf} from '@itrocks/class-type'
import { StringObject }                  from '@itrocks/class-type'
import { Type }                          from '@itrocks/class-type'
import { ReflectProperty }               from '@itrocks/reflect'
import { dataSource, Entity, MayEntity } from '@itrocks/storage'
import { setPropertyTypeTransformer }    from '@itrocks/transformer'
import { EDIT, HTML }                    from '@itrocks/transformer'
import { INPUT, OUTPUT, SAVE, SQL }      from '@itrocks/transformer'

const lfTab = '\n\t\t\t\t'

export type SqlDependencies = {
	ignoreTransformedValue: any
}

export type Dependencies = SqlDependencies & {
	displayOf:              (object: AnyObject, property: string) => string,
	representativeValueOf:  (object: object) => string,
	routeOf:                (type: Type) => string,
	tr:                     (text: string) => string
}

const depends: Dependencies = {
	displayOf:             (_object, property) => property,
	ignoreTransformedValue: Symbol('ignoreTransformedValue'),
	representativeValueOf: object => baseType(typeOf(object)).name,
	routeOf:               type => '/' + baseType(type).name,
	tr:                    text => text
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
	const propertyType   = new ReflectProperty(object, property).type as Type
	const representative = value ? depends.representativeValueOf(value) : ''
	const fetch          = depends.routeOf(propertyType) + '/summary'
	const label          = `<label for="${property}">${depends.tr(depends.displayOf(object, property))}</label>`
	const name           = `id="${property}" name="${property}"`
	const inputValue     = representative.length ? ` value="${representative}"` : ''
	const input          = `<input data-fetch="${fetch}" data-type="object" ${name}${inputValue}>`
	const input_id       = `<input id="${property}_id" name="${property}_id" type="hidden" value="${value?.id}">`
	return label + lfTab + input + input_id
}

function storeInput<T extends AnyObject>(
	value: MayEntity | undefined, object: T, property: KeyOf<T>, data: StringObject
) {
	const property_id = property + '_id'
	if (
		(property_id in data)
		&& (
			(property_id in object)
				? (data[property_id] !== object[property_id] + '')
				: (data[property_id] !== (value as Entity | undefined)?.id + '')
		)
	) {
		delete object[property]
		Object.assign(object, { [property_id]: +data[property_id] })
	}
	return depends.ignoreTransformedValue
}

function storeOutput(value: MayEntity | undefined)
{
	return value ? depends.representativeValueOf(value) : ''
}

async function storeSave<T extends AnyObject>(
	value: MayEntity | undefined, _object: T, property: KeyOf<T>, saveValues: AnyObject
) {
	const dao = dataSource()
	if (value && !dao.isObjectConnected(value)) {
		await dao.save(value)
	}
	const property_id       = property + '_id'
	const id                = (value && dao.isObjectConnected(value)) ? value.id : saveValues[property_id]
	saveValues[property_id] = id ?? null
	return depends.ignoreTransformedValue
}

import { componentOf, compositeOf }   from '@itrocks/composition'
import { dataSource, Entity }         from '@itrocks/storage'
import { Identifier, MayEntity }      from '@itrocks/storage'
import { AnyObject, baseType }        from '@itrocks/class-type'
import { KeyOf, Type, typeOf }        from '@itrocks/class-type'
import { CollectionType }             from '@itrocks/property-type'
import { ReflectClass }               from '@itrocks/reflect'
import { ReflectProperty }            from '@itrocks/reflect'
import { EDIT, HTML }                 from '@itrocks/transformer'
import { INPUT, OUTPUT, SAVE, SQL }   from '@itrocks/transformer'
import { setPropertyTypeTransformer } from '@itrocks/transformer'
import { HtmlContainer }              from './container'

export type Dependencies = {
	displayOf:              (object: AnyObject, property: string) => string,
	fieldNameOf:            (property: string) => string,
	fieldIdOf:              (property: string) => string,
	ignoreTransformedValue: any,
	representativeValueOf:  (object: object) => string,
	routeOf:                (type: Type) => string,
	tr:                     (text: string) => string
}

const depends: Dependencies = {
	displayOf:              (_object, property) => property,
	fieldNameOf:            property => property,
	fieldIdOf:              property => property,
	ignoreTransformedValue: Symbol('ignoreTransformedValue'),
	representativeValueOf:  object => baseType(typeOf(object)).name,
	routeOf:                type => '/' + baseType(type).name,
	tr:                     text => text
}

const areMayEntityEntries = (entries: [string, MayEntity | string][]): entries is [string, MayEntity][] =>
	(typeof entries[0]?.[1])[0] === 'o'

function collectionEdit<T extends object>(values: MayEntity[], object: T, property: KeyOf<T>)
{
	const fieldId      = depends.fieldIdOf(property)
	const fieldName    = depends.fieldNameOf(property)
	const propertyType = new ReflectProperty(object, property).collectionType
	const fetch        = depends.routeOf(propertyType.elementType.type as Type) + '/summary'
	const label        = `<label for="${fieldId}">${depends.tr(depends.displayOf(object, property))}</label>`
	const inputs       = []
	for (const object of values) {
		const attrValue = `value="${depends.representativeValueOf(object)}"`
		inputs.push('<li>' + (
			dataSource().isObjectConnected(object)
			? `<input id="${fieldId}.${object.id}" name="${fieldName}.${object.id}" ${attrValue}>`
			: `<input id="${fieldId}." name="${fieldName}." ${attrValue}>`
		) + '</li>')
	}
	return label + `<ul data-multiple-contained-auto-width data-fetch="${fetch}" data-type="objects">`
		+ inputs.join('')
		+ `<li><input id="${fieldId}" name="${fieldName}" placeholder="+"></li>`
		+ '</ul>'
}

function collectionInput<T extends AnyObject>(values: Record<string, MayEntity | string>, object: T, property: KeyOf<T>)
{
	const entries = Object.entries(values)
	if (areMayEntityEntries(entries)) {
		Object.assign(object, { [property]: entries.map(([id, value]) => dataSource().connectObject(value, +id)) })
	}
	else {
		delete object[property]
		Object.assign(object, { [property + 'Ids']: Object.keys(values).map(id => +id) })
	}
	return depends.ignoreTransformedValue
}

function collectionOutput<T extends object, PT extends object>(
	values: MayEntity<PT>[], object: T, property: KeyOf<T>, askFor: HtmlContainer
) {
	if (!values.length) {
		return ''
	}
	if (componentOf(object, property)) {
		const propertyType = new ReflectProperty(object, property).collectionType
		const type          = propertyType.elementType.type as Type
		const propertyClass = new ReflectClass(type)
		const properties    = propertyClass.propertyNames.filter(property => !compositeOf(type, property)) as KeyOf<PT>[]
		const html = []
		html.push('<table>')
		html.push('<tr>' + properties.map(property => '<th>' + depends.tr(property) + '</th>').join('') + '</tr>')
		html.push(...values.map(
			value => '<tr>' + properties.map(property => '<td>' + value[property] + '</td>').join('') + '</tr>'
		))
		html.push('</table>')
		return html.join('\n')
	}
	if (askFor?.container) {
		askFor.container = false
		return '<ul>' + values.map(object => '<li>' + depends.representativeValueOf(object) + '</li>').join('') + '</ul>'
	}
	return values.map(object => depends.representativeValueOf(object)).join(', ')
}

async function collectionSave<T extends AnyObject>(values: MayEntity[] | undefined, object: T, property: KeyOf<T>)
{
	const dao = dataSource()
	const newIdsPromise: Identifier[] = object[property + 'Ids']
		?? values?.map(async value => (dao.isObjectConnected(value) ? value : await dao.save(value)).id).sort()
		?? []
	const previousIdsPromise = dao.isObjectConnected(object)
		? await dao.readCollectionIds<T, MayEntity>(object, property)
		: []
	return async (object: Entity<T>) => {
		const previousIds = await Promise.all(previousIdsPromise)
		const newIds      = await Promise.all(newIdsPromise)
		for (const id of previousIds) {
			if (newIds.includes(id)) continue
			dao.deleteRelatedId(object, property, id)
		}
		for (const id of newIds) {
			if (previousIds.includes(id)) continue
			dao.insertRelatedId(object, property, id)
		}
	}
}

export function initCollectionHtmlTransformers(dependencies: Partial<Dependencies> = {})
{
	Object.assign(depends, dependencies)
	setPropertyTypeTransformer(CollectionType, HTML, EDIT,   collectionEdit)
	setPropertyTypeTransformer(CollectionType, HTML, INPUT,  collectionInput)
	setPropertyTypeTransformer(CollectionType, HTML, OUTPUT, collectionOutput)
}

export function initCollectionSqlTransformers()
{
	setPropertyTypeTransformer(CollectionType, SQL, SAVE, collectionSave)
}

export function initCollectionTransformers(dependencies: Partial<Dependencies> = {})
{
	initCollectionHtmlTransformers(dependencies)
	initCollectionSqlTransformers()
}

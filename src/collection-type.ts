import { componentOf }                from '@itrocks/composition'
import { compositeOf }                from '@itrocks/composition'
import { dataSource }                 from '@itrocks/storage'
import { MayEntity }                  from '@itrocks/storage'
import { baseType }                   from '@itrocks/class-type'
import { ObjectOrType }               from '@itrocks/class-type'
import { Type }                       from '@itrocks/class-type'
import { typeOf }                     from '@itrocks/class-type'
import { CollectionType }             from '@itrocks/property-type'
import { toField }                    from '@itrocks/rename'
import { ReflectClass }               from '@itrocks/reflect'
import { ReflectProperty }            from '@itrocks/reflect'
import { EDIT, HTML, INPUT, OUTPUT }  from '@itrocks/transformer'
import { setPropertyTypeTransformer } from '@itrocks/transformer'
import { HtmlContainer }              from './container'

export type Dependencies = {
	displayOf:              <T extends object>(object: ObjectOrType<T>, property: keyof T) => string,
	fieldNameOf:            (property: keyof any) => string,
	fieldIdOf:              (property: keyof any) => string,
	ignoreTransformedValue: any,
	propertyOutput:         <T extends object>(object: T, property: keyof T) => Promise<string>,
	representativeValueOf:  (object: object) => Promise<string>,
	routeOf:                (type: Type) => string,
	tr:                     (text: string) => string
}

const depends: Dependencies = {
	displayOf:              (_object, property) => property.toString(),
	fieldNameOf:            property => property.toString(),
	fieldIdOf:              property => property.toString(),
	ignoreTransformedValue: Symbol('ignoreTransformedValue'),
	propertyOutput:         async (object, property) => '' + await object[property],
	representativeValueOf:  async object => baseType(typeOf(object)).name,
	routeOf:                type => '/' + baseType(type).name,
	tr:                     text => text
}

const areMayEntity = (entries: (MayEntity | string)[]): entries is [string, MayEntity][] =>
	(typeof entries[0])[0] === 'o'

async function collectionEdit<T extends object, PT extends object>(
	values: MayEntity<PT>[], object: T, property: keyof T
) {
	const fieldId      = depends.fieldIdOf(property)
	const fieldName    = depends.fieldNameOf(property)
	const propertyType = new ReflectProperty(object, property).collectionType
	const fetch        = depends.routeOf(propertyType.elementType.type as Type) + '/summary'
	const label        = `<label for="${fieldId}">${depends.tr(depends.displayOf(object, property))}</label>`
	const inputs       = []
	if (componentOf(object, property)) {
		const propertyType  = new ReflectProperty(object, property).collectionType
		const type          = propertyType.elementType.type as Type<PT>
		const propertyClass = new ReflectClass(type)
		const properties    = propertyClass.propertyNames.filter(property => !compositeOf(type, property))
		const html = []
		html.push('<table>')
		if (values.length) {
			html.push(
				'<tr>'
				+ properties.map(property =>
					'<th>'
					+ depends.tr(depends.displayOf(type, property))
					+ '</th>'
				).join('')
				+ '</tr>')
		}
		else {
			html.push('<caption>' + depends.tr('Empty') + '</caption>')
		}
		html.push(...await Promise.all(values.map(
			async value =>
				'<tr>'
				+ (await Promise.all(properties.map(async property =>
					'<td>'
					+ (await depends.propertyOutput(value, property))
					+ '</td>'
				))).join('')
				+ '</tr>'
		)))
		html.push('</table>')
		return label + html.join('\n')
	}
	for (const object of values) {
		const attrValue = `value="${await depends.representativeValueOf(object)}"`
		const objectId  = dataSource().isObjectConnected(object) ? '' + object.id : ''
		inputs.push(
			'<li>'
			+ `<input id="${fieldId}-id.${objectId}" name="${fieldName}_id.${objectId}" type="hidden" value="${objectId}">`
			+ `<input name="${fieldName}.${objectId}" ${attrValue}>`
			+ '</li>'
		)
	}
	return label + `<ul data-multiple-contained-auto-width data-fetch="${fetch}" data-type="objects">`
		+ inputs.join('')
		+ '<li>'
		+ `<input id="${fieldId}-id" name="${fieldName}_id" type="hidden">`
		+ `<input name="${fieldName}" placeholder="+">`
		+ '</li>'
		+ '</ul>'
}

function collectionInput<T extends object>(
	values: Record<string, MayEntity | string>, object: T, property: keyof T, data: Record<string, any>
) {
	const entries = Object.values(values)
	if (areMayEntity(entries)) {
		return Object.values(values)
	}
	delete object[property]
	const data_property_id: Record<string, string> = data[toField(property) + '_id']
	Object.assign(object, {
		[property.toString() + 'Ids']: Object.keys(values).map(key => +data_property_id[key]).filter(value => value)
	})
	return depends.ignoreTransformedValue
}

async function collectionOutput<T extends object, PT extends object>(
	values: MayEntity<PT>[], object: T, property: keyof T, askFor: HtmlContainer
) {
	if (!values.length) {
		return ''
	}
	if (componentOf(object, property)) {
		const propertyType  = new ReflectProperty(object, property).collectionType
		const type          = propertyType.elementType.type as Type<PT>
		const propertyClass = new ReflectClass(type)
		const properties    = propertyClass.propertyNames.filter(property => !compositeOf(type, property))
		const html = []
		html.push('<table>')
		html.push(
			'<tr>'
			+ properties.map(property =>
				'<th>'
				+ depends.tr(depends.displayOf(type, property))
				+ '</th>'
			).join('')
			+ '</tr>')
		html.push(...await Promise.all(values.map(
			async value =>
				'<tr>'
				+ (await Promise.all(properties.map(async property =>
					'<td>'
					+ (await depends.propertyOutput(value, property))
					+ '</td>'
				))).join('')
				+ '</tr>'
		)))
		html.push('</table>')
		return html.join('\n')
	}
	if (askFor?.container) {
		askFor.container = false
		return '<ul>'
			+ (await Promise.all(values.map(async object =>
				'<li>'
				+ (await depends.representativeValueOf(object))
				+ '</li>'
			))).sort().join('')
			+ '</ul>'
	}
	return (await Promise.all(values.map(object => depends.representativeValueOf(object)))).sort().join(', ')
}

export function initCollectionHtmlTransformers(dependencies: Partial<Dependencies> = {})
{
	Object.assign(depends, dependencies)
	setPropertyTypeTransformer(CollectionType, HTML, EDIT,   collectionEdit)
	setPropertyTypeTransformer(CollectionType, HTML, INPUT,  collectionInput)
	setPropertyTypeTransformer(CollectionType, HTML, OUTPUT, collectionOutput)
}

export function initCollectionTransformers(dependencies: Partial<Dependencies> = {})
{
	initCollectionHtmlTransformers(dependencies)
}

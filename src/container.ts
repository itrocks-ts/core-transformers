import { HTML }                 from '@itrocks/transformer'
import { setFormatTransformer } from '@itrocks/transformer'

export class HtmlContainer {

	constructor(public mandatoryContainer: boolean, public container: boolean = true)
	{}

}

export function initContainerTransformers()
{
	setFormatTransformer(HTML, (value: any, askFor: HtmlContainer) => {
		if (!(askFor.container && askFor.mandatoryContainer)) {
			return value
		}
		if ((typeof(value) === 'object') && value.toString) {
			const valueString = value.toString()
			for (const propertyName in value) {
				const propertyValue = value[propertyName]
				if (((typeof propertyValue)[0] === 's') && (propertyValue === valueString)) {
					value[propertyName] = '<div>' + propertyValue + '</div>'
				}
			}
			return value
		}
		return '<div>' + value + '</div>'
	})
}

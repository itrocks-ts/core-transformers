import { HTML, setFormatTransformer } from '@itrocks/transformer'

export class HtmlContainer {

	constructor(public mandatoryContainer: boolean, public container: boolean = true)
	{}

}

export function initContainerTransformers()
{
	setFormatTransformer(HTML, (value: string, askFor: HtmlContainer) =>
		(askFor.container && askFor.mandatoryContainer) ? ('<div>' + value + '</div>') : value
	)
}

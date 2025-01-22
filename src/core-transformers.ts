import { Dependencies as CollectionTypeDependencies } from './collection-type'
import { initCollectionTransformers }                 from './collection-type'
import { initContainerTransformers }                  from './container'
import { Dependencies as PrimitiveDependencies }      from './primitive'
import { initPrimitiveTransformers }                  from './primitive'
import { Dependencies as StoreDependencies }          from './store'
import { setStoreDependencies }                       from './store'

export {
	HtmlContainer,
	initContainerTransformers
} from './container'

export {
	initCollectionHtmlTransformers,
	initCollectionSqlTransformers,
	initCollectionTransformers
} from './collection-type'

export {
	initBigintHtmlTransformers,
	initBooleanHtmlTransformers,
	initBooleanSqlTransformers,
	initDateHtmlTransformers,
	initDefaultHtmlEditTransformers,
	initNumberHtmlTransformers,
	initPrimitiveTransformers,
	setCorePrimitiveDependencies,
	setPrimitiveDependencies
} from './primitive'

export {
	initStoreHtmlTransformers,
	initStoreSqlTransformers,
	initStoreTransformers,
	setStoreDependencies,
	setStoreSqlDependencies,
	setStoreHtmlDependencies
} from './store'

type Dependencies = CollectionTypeDependencies & PrimitiveDependencies & StoreDependencies

export function initCoreTransformers(dependencies: Partial<Dependencies>)
{
	initCollectionTransformers(dependencies)
	initContainerTransformers()
	initPrimitiveTransformers(dependencies)
	setStoreDependencies(dependencies)
}

[![npm version](https://img.shields.io/npm/v/@itrocks/core-transformers?logo=npm)](https://www.npmjs.org/package/@itrocks/core-transformers)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/core-transformers)](https://www.npmjs.org/package/@itrocks/core-transformers)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/core-transformers?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/core-transformers)
[![issues](https://img.shields.io/github/issues/itrocks-ts/core-transformers)](https://github.com/itrocks-ts/core-transformers/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# core-transformers

Prefabricated HTML and SQL data transformers for it.rocks primitives and basic types.

*This documentation was written by an artificial intelligence and may contain errors or approximations.
It has not yet been fully reviewed by a human. If anything seems unclear or incomplete,
please feel free to contact the author of this package.*

## Installation

```bash
npm i @itrocks/core-transformers
```

`@itrocks/core-transformers` is usually installed together with the
it.rocks framework and the low‑level packages `@itrocks/transformer`,
`@itrocks/storage`, etc. It can also be used on its own in any
TypeScript/Node.js project where you need consistent HTML and SQL
conversions for primitive values, collections and stored entities.

## Usage

This package does not expose UI components directly. Instead, it
registers **transformers** into `@itrocks/transformer` so that all
primitives, collections and stored entities share the same HTML and SQL
behaviour across your application.

You normally call one of the provided initialisers once at application
startup, then use your usual transformation helpers (for example, those
provided by `@itrocks/transformer` or higher‑level view packages).

### Minimal example: initialise everything with default behaviour

```ts
import { initCoreTransformers } from '@itrocks/core-transformers'

// At application bootstrap
initCoreTransformers({})

// From this point, any use of the transformer engine for:
// - primitive types (boolean, number, bigint, Date, string),
// - collection properties (`CollectionType`),
// - stored entities (from `@itrocks/storage`),
// will benefit from the default HTML & SQL transformers configured by
// this package.
```

With this minimal setup, the framework knows how to:

- render HTML form controls for booleans, numbers, dates, text and
  collections,
- convert submitted data back to typed values,
- adapt booleans and related entities when reading/writing SQL.

### Example: customise dependencies and use containers

For a real‑world project you will usually configure a few
infrastructure‑specific helpers so that the generated HTML fits your
forms (IDs, names, translation, display labels, routes, …) and optionally
wrap lists into HTML containers.

```ts
import {
  HtmlContainer,
  initCoreTransformers,
  setCorePrimitiveDependencies,
  setStoreDependencies
} from '@itrocks/core-transformers'

// 1. Configure how labels, IDs, names and translations are built
setCorePrimitiveDependencies({
  displayOf:   (object, property) => /* human label for property */,
  fieldIdOf:   property            => `field-${property}`,
  fieldNameOf: property            => property,
  tr:          text                => translate(text)
})

setStoreDependencies({
  displayOf:             (object, property) => /* label for relations */,
  fieldIdOf:             property           => `field-${property}`,
  fieldNameOf:           property           => property,
  representativeValueOf: async object       => object.toString(),
  routeOf:               type               => `/api/${type.name.toLowerCase()}`,
  tr:                    text               => translate(text),
  ignoreTransformedValue: Symbol('ignore')
})

// 2. Register all transformers with the configured dependencies
initCoreTransformers({})

// 3. Later, when asking for HTML output you may request that lists of
//    stored entities are wrapped in containers:

import { HTML } from '@itrocks/transformer'

async function renderList(value: any, transform: Function) {
  const container = new HtmlContainer(true) // enforce container
  const html = await transform(value, HTML, container)
  return String(html)
}
```

The exact way you ask for a transformation (`transform` function,
pipeline, decorators, …) depends on how you use `@itrocks/transformer`
or higher‑level libraries, but once the initialisation code above has
run you get consistent behaviour across the whole application.

## API

All exports register or configure transformers in the global
`@itrocks/transformer` registry. They do not return values; their role is
to set up the transformation rules used elsewhere.

### Core initialiser

#### `initCoreTransformers(dependencies: Partial<Dependencies>): void`

Initialises all core transformers in one call:

- primitive transformers (booleans, numbers, bigints, dates, default
  text fields),
- collection transformers (`CollectionType`),
- store transformers for entities managed by `@itrocks/storage`,
- container transformer for HTML wrapping.

`dependencies` is a composite of the dependency types defined in the
sub‑modules `collection-type`, `primitive` and `store`. You usually pass
only the properties you want to override; everything else falls back to
reasonable defaults.

Call this once during application bootstrap.

### Primitive transformers

These functions configure transformers for primitive types and the
default behaviour when no specific type is matched.

All of them rely on the dependency helpers defined in
`setCorePrimitiveDependencies` / `setPrimitiveDependencies`.

#### `initPrimitiveTransformers(dependencies?: Partial<Dependencies>): void`

Registers all primitive HTML and SQL transformers at once.

You normally do not need to call it directly if you use
`initCoreTransformers`, but it can be useful in tests or very small
projects that only use primitive values.

#### `initBigintHtmlTransformers(): void`

Registers an HTML input transformer for JavaScript `BigInt` values.
Values coming from HTML inputs (strings) are converted to `BigInt`.

#### `initBooleanHtmlTransformers(): void`

Registers transformers for boolean values in HTML context:

- **EDIT**: outputs a label, a hidden `0` field and a checkbox set to
  `1` when checked.
- **INPUT**: converts variants of "false" (empty string, `0`, localized
  words for "false"/"no") to `false`, everything else to `true`.
- **OUTPUT**: displays a localized `"yes"` or `"no"` string.

#### `initBooleanSqlTransformers(): void`

Registers SQL transformers for booleans:

- **READ**: converts truthy SQL values to `true` / `false`.
- **SAVE**: stores booleans as `0` or `1`.

#### `initDateHtmlTransformers(): void`

Registers HTML transformers for `Date` values:

- **EDIT**: renders a `<label>` and an `<input data-type="date">` with
  a formatted value when present.
- **INPUT**: parses a string using your configured `parseDate` helper.
- **OUTPUT**: formats a `Date` using `formatDate` (or returns an empty
  string for `undefined`).

#### `initNumberHtmlTransformers(): void`

Registers transformers for numeric values:

- **EDIT**: renders a `<label>` and an `<input data-type="number">`.
- **INPUT**: accepts localized strings (spaces, comma as decimal
  separator) and compact suffixes such as `"10k"`, `"2M"`, `"1G"`, …
  and converts them to a `number | undefined`.
- **OUTPUT**: formats the number using the configured precision for the
  property (via `precisionOf`) and `fr-FR` locale.
- **READ (SQL)**: converts SQL values (`number | string`) to a
  JavaScript `number | undefined`.

#### `initDefaultHtmlEditTransformers(): void`

Registers a very generic HTML editor used as a fallback when no specific
primitive transformer applies. It renders a simple `<label>` and text
`<input>`.

#### `setCorePrimitiveDependencies(dependencies: Partial<CoreDependencies>): void`

Configures the dependencies shared by all primitive transformers except
`Date`:

- `displayOf(object, property)` – returns the label used in HTML
  `<label>` elements.
- `fieldIdOf(property)` – returns the HTML `id` attribute for a field.
- `fieldNameOf(property)` – returns the HTML `name` attribute for a
  field.
- `tr(text)` – translation function used for labels and boolean
  `"yes"/"no"` values.

You can call this before `initPrimitiveTransformers` or
`initCoreTransformers` to integrate these transformers with your own
view or i18n layer.

#### `setPrimitiveDependencies(dependencies: Partial<Dependencies>): void`

Extends `setCorePrimitiveDependencies` with the extra date helpers
required by the `Date` transformers:

- `formatDate(date: Date): string`
- `parseDate(text: string): Date`

Use this if you want to override both core helpers and date formatting
in one place.

### Collection transformers

Helpers dedicated to properties of type `CollectionType` from
`@itrocks/property-type`.

#### `initCollectionHtmlTransformers(dependencies?: Partial<Dependencies>): void`

Registers HTML transformers for collections of stored entities.

Generated HTML typically consists of:

- a `<label>` for the property,
- an unordered list (`<ul data-type="objects">`) of `<input>` elements
  representing the selected entities,
- hidden fields storing the internal IDs used to bind back to your
  entities.

Dependencies let you control labels, field names/IDs, how each entity is
turned into text (`representativeValueOf`), and how individual property
values are rendered inside a table (`propertyOutput`).

#### `initCollectionTransformers(dependencies?: Partial<Dependencies>): void`

Convenience wrapper that currently delegates to
`initCollectionHtmlTransformers`. Provided for symmetry and future
extensions.

### Container transformers

#### `class HtmlContainer`

Small helper object used as a hint when requesting HTML transformations.

- `mandatoryContainer: boolean` – if `true`, a container is required.
- `container: boolean = true` – whether the container is still desired
  for the current transformation; transformers can set it to `false`
  once they have produced their own container.

You typically instantiate `HtmlContainer` and pass it as the
"askFor"/options argument to your transformation function.

#### `initContainerTransformers(): void`

Registers a format transformer for `HTML` that wraps simple values into a
`<div>` when `HtmlContainer.mandatoryContainer` and
`HtmlContainer.container` are both `true`. For complex objects, it tries
to find the string property whose value matches `toString()` and wraps
only this property.

This is used internally by other transformers when you need HTML
containers for values.

### Store transformers

These helpers manage the HTML and SQL representations of entities
handled by `@itrocks/storage`.

#### `initStoreHtmlTransformers(target: Type): void`

Registers HTML transformers for a given entity `Type`:

- **EDIT**: renders an input field with auto‑completion / fetching of
  related entities plus a hidden field storing the selected ID.
- **INPUT**: updates the owning object from submitted form data,
  deciding whether to keep an existing relation, set an ID field
  (`propertyId`) or instantiate a new object.
- **OUTPUT**: displays the representative value of the related entity
  (`representativeValueOf`).

#### `initStoreSqlTransformers(target: Type): void`

Registers SQL save transformers for the given entity type. When saving,
it ensures that the related entity is persisted and that the foreign key
`<property>_id` is set on the SQL record.

#### `initStoreTransformers(target: Type): void`

Convenience helper that calls both `initStoreHtmlTransformers` and
`initStoreSqlTransformers` for the same type.

#### `setStoreDependencies(dependencies: Partial<Dependencies>): void`

Configures the helpers used by all store transformers:

- `displayOf(object, property)` – label for relation fields.
- `fieldIdOf(property)` / `fieldNameOf(property)` – build HTML IDs and
  names.
- `representativeValueOf(object)` – how to get a display string for an
  entity.
- `routeOf(type)` – route used to fetch summaries for auto‑completion.
- `tr(text)` – translation function.
- `ignoreTransformedValue` – sentinel value used internally to indicate
  that an input transformer chose not to alter the original value.

You should set these once, before initialising the store transformers.

#### `setStoreHtmlDependencies(dependencies: Partial<Dependencies>): void`

Alias of `setStoreDependencies`. Provided for readability when you only
care about the HTML side.

#### `setStoreSqlDependencies(dependencies: Partial<SqlDependencies>): void`

Alias specialised to the SQL‑related subset of dependencies. In
practice, this lets you override only `ignoreTransformedValue` when you
need a custom sentinel.

## Typical use cases

- **Unified form rendering** – ensure that all boolean, number, date and
  text fields across your entities share the same labels, IDs, names,
  translations and HTML controls.
- **Consistent SQL mapping** – centralise how booleans, numbers and
  relations are read from and written to SQL records.
- **Collection editing widgets** – provide a coherent HTML structure for
  one‑to‑many or many‑to‑many relations, including list display and
  inline tables for components.
- **Entity relation editors** – generate HTML inputs and auto‑complete
  widgets for relations handled by `@itrocks/storage`, with transparent
  synchronisation of foreign keys.
- **Framework integration** – plug the dependencies into your own
  routing, translation and display helpers so that the same configuration
  is reused across multiple projects.

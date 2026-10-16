import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const { Entry } = require('./fixture.cjs')
const { initStoreHtmlTransformers, setStoreDependencies, storeOutput } = require('@itrocks/core-transformers')
const { HTML, OUTPUT, resolveTransformer, setPropertyTypeTransformer } = require('@itrocks/transformer')

test('public standard output retains async representative callback and null handling', async () => {
	const seen = []
	setStoreDependencies({ representativeValueOf: async object => { seen.push(object); return object.name } })
	const object = { name: 'Paris' }
	assert.equal(await storeOutput(object), 'Paris')
	assert.equal(await storeOutput(undefined), '')
	assert.deepEqual(seen, [object])
	initStoreHtmlTransformers(String)
	assert.equal(resolveTransformer(Entry, 'name', HTML, OUTPUT), storeOutput)
	setPropertyTypeTransformer(String, HTML, OUTPUT, value => value)
})

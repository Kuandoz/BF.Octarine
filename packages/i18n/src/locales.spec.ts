import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { isPluralMessage, placeholders } from './format'
import type { Catalog } from './types'

const folder = fileURLToPath(new URL('../locales/', import.meta.url))
const read = (file: string) => JSON.parse(readFileSync(folder + file, 'utf8')) as Catalog

const languages = readdirSync(folder)
  .filter((file) => /^[a-z]{2,3}(-[a-z0-9]+)*\.json$/i.test(file))
  .map((file) => file.replace(/\.json$/, ''))
const english = read('en.json')
const descriptions = read('en.descriptions.json')

describe('locales', () => {
  it('ships English, Dutch, French and German', () => {
    expect(languages.sort()).toEqual(['de', 'en', 'fr', 'nl'])
  })

  it('describes every English key for translators', () => {
    expect(Object.keys(descriptions).sort()).toEqual(Object.keys(english).sort())
  })

  describe.each(languages)('%s', (language) => {
    const catalog = read(`${language}.json`)

    it('has exactly the English keys', () => {
      expect(Object.keys(catalog).sort()).toEqual(Object.keys(english).sort())
    })

    it('uses the same placeholders as English', () => {
      for (const [key, message] of Object.entries(catalog)) {
        expect([key, placeholders(message)]).toEqual([key, placeholders(english[key]!)])
      }
    })

    it('has only texts and plural messages, each with an "other" form', () => {
      for (const [key, message] of Object.entries(catalog)) {
        expect([key, typeof message === 'string' || isPluralMessage(message)]).toEqual([key, true])
      }
    })
  })
})

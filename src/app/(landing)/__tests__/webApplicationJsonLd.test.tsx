import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  buildWebApplicationJsonLd,
  serializeJsonLd,
} from '../utils/webApplicationJsonLd'
import { metadata } from '../metadata'

describe('home page WebApplication JSON-LD', () => {
  it('uses facts from the existing metadata', () => {
    const data = buildWebApplicationJsonLd()
    expect(data['@type']).toBe('WebApplication')
    expect(data.name).toBe('Kobo Note Up')
    expect(data.url).toBe('https://kobo-up.runawayup.com')
    expect(data.description).toBe(metadata.description)
    expect(data.offers.price).toBe('0')
  })

  it('has no rating or review', () => {
    const json = serializeJsonLd(buildWebApplicationJsonLd())
    expect(json).not.toContain('aggregateRating')
    expect(json).not.toContain('review')
  })

  it('escapes "<" so a value cannot close the script tag', () => {
    const json = serializeJsonLd({ name: '</script><b>x' })
    expect(json).not.toContain('<')
    expect(JSON.parse(json).name).toBe('</script><b>x')
  })

  it('renders exactly one parseable block', () => {
    const html = renderToStaticMarkup(
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(buildWebApplicationJsonLd()) }}
      />
    )
    const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []
    expect(blocks).toHaveLength(1)
    const body = blocks[0].replace(/<script[^>]*>|<\/script>/g, '')
    expect(JSON.parse(body)['@type']).toBe('WebApplication')
  })
})

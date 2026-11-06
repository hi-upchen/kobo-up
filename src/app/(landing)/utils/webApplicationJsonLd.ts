import { metadata } from '../metadata'

export interface WebApplicationJsonLd {
  '@context': 'https://schema.org'
  '@type': 'WebApplication'
  name: string
  url: string
  description: string
  applicationCategory: 'UtilitiesApplication'
  operatingSystem: 'Web browser'
  offers: {
    '@type': 'Offer'
    price: '0'
    priceCurrency: 'USD'
  }
}

const SITE_NAME = 'Kobo Note Up'
const SITE_URL = 'https://kobo-up.runawayup.com'

/**
 * Builds the schema.org WebApplication data for the free tool on the home page.
 *
 * The description comes from the page metadata so the two never drift apart.
 * The data has no rating or review fields because no real rating data exists.
 */
export function buildWebApplicationJsonLd(): WebApplicationJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: String(metadata.description),
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }
}

/**
 * Serializes the data for a script tag.
 *
 * It escapes "<" as <. Without this, a "</script>" inside a value
 * would close the tag early and let markup run on the page.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

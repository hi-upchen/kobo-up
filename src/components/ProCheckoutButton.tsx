'use client'

/**
 * Button that opens the Polar checkout for Kobo Note Up Pro in a new tab.
 * It sends one analytics event on click. A new tab keeps the current page open.
 */
import { pushToDataLayer } from '@/utils/gtm'

export const POLAR_CHECKOUT_URL =
  'https://buy.polar.sh/polar_cl_5eMJ17HtfEoaPQkYrBVQvfkDJQRckzohXpH933mYJ8O'

export function ProCheckoutButton({ location }: { location: string }) {
  return (
    <a
      href={POLAR_CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => pushToDataLayer({ event: 'pro_checkout_click', location })}
      className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500"
    >
      Get early-bird Pro: US$19 one-time
    </a>
  )
}

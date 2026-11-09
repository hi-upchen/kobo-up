'use client'

/**
 * Lets the buyer paste a Pro license key and activate it in this browser.
 * Once a key is active, it shows that Pro is on and offers a remove button.
 */
import { useState } from 'react'
import {
  activateInBrowser,
  removeLicenseFromBrowser,
  useHasProLicense,
  type LicenseFailure,
} from '@/lib/pro/licenseClient'
import { POLAR_CUSTOMER_PORTAL_URL } from '@/lib/pro/polarConfig'

const MESSAGES: Record<LicenseFailure, string> = {
  malformed_key: 'This does not look like a license key. It starts with KNUP- and comes from the Polar email.',
  invalid: 'This license key is not valid for Kobo Note Up Pro. Check the key in your Polar email.',
  limit_reached: 'This key is already active on 3 devices. Free a device in the Polar customer portal, then try again.',
  network: 'Could not reach the license server. Check your connection and try again.',
}

export function LicenseEntry() {
  const hasLicense = useHasProLicense()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<LicenseFailure | null>(null)

  if (hasLicense) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900 dark:border-green-900 dark:bg-zinc-800 dark:text-green-300">
        <p>Pro is active in this browser. Thank you.</p>
        <button
          type="button"
          onClick={removeLicenseFromBrowser}
          className="mt-2 underline hover:no-underline"
        >
          Remove the key from this browser
        </button>
      </div>
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const outcome = await activateInBrowser(value)
    setBusy(false)
    if (outcome.ok) setValue('')
    else setError(outcome.code)
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="pro-license-key" className="block text-sm font-medium text-gray-900 dark:text-zinc-100">
        License key
      </label>
      <div className="flex gap-2">
        <input
          id="pro-license-key"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="KNUP-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={busy || value.trim() === ''}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {busy ? 'Checking...' : 'Activate'}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {MESSAGES[error]}
          {error === 'limit_reached' && (
            <>
              {' '}
              <a href={POLAR_CUSTOMER_PORTAL_URL} target="_blank" rel="noopener noreferrer" className="underline">
                Open the customer portal
              </a>
            </>
          )}
        </p>
      )}
    </form>
  )
}

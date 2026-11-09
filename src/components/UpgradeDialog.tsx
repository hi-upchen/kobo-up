'use client'

/**
 * Dialog shown instead of a Pro-only export.
 * It names the limit, links to /pro and lets the buyer enter a license key.
 * It reports one pro_limit_shown event each time it opens.
 */
import { useEffect } from 'react'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from '@/components/dialog'
import { LicenseEntry } from '@/components/LicenseEntry'
import { FREE_BULK_EXPORT_LIMIT, type ProLimit } from '@/lib/pro/limits'
import { useHasProLicense } from '@/lib/pro/licenseClient'
import { pushToDataLayer } from '@/utils/gtm'

interface UpgradeDialogProps {
  /** Which limit was hit. Null keeps the dialog closed. */
  limit: ProLimit | null
  onClose: () => void
  /** Secondary action, for example exporting without handwriting. */
  alternative?: { label: string; onClick: () => void }
}

const TEXT: Record<ProLimit, { title: string; body: string }> = {
  bulk: {
    title: 'Bulk export of more than 10 books is a Pro feature',
    body: `Free export covers one book at a time, and up to ${FREE_BULK_EXPORT_LIMIT} books at once. Select ${FREE_BULK_EXPORT_LIMIT} books or fewer, or unlock Pro for the whole library.`,
  },
  handwriting: {
    title: 'Handwritten-note export is a Pro feature',
    body: 'Exporting handwritten (stylus) annotations needs a Pro license. Viewing them in the app stays free.',
  },
}

export function UpgradeDialog({ limit, onClose, alternative }: UpgradeDialogProps) {
  const hasLicense = useHasProLicense()

  useEffect(() => {
    if (limit) pushToDataLayer({ event: 'pro_limit_shown', limit })
  }, [limit])

  // A key entered in the dialog unlocks Pro at once, so the dialog closes.
  useEffect(() => {
    if (limit && hasLicense) onClose()
  }, [limit, hasLicense, onClose])

  if (!limit) return null
  return (
    <Dialog size="md" open onClose={onClose}>
      <DialogTitle>{TEXT[limit].title}</DialogTitle>
      <DialogDescription>{TEXT[limit].body}</DialogDescription>
      <DialogBody>
        <p className="mb-4 text-sm text-gray-700 dark:text-zinc-300">
          Pro is a one-time US$19 lifetime license.{' '}
          <a href="/pro" className="underline">See what Pro includes</a>. Already bought it? Enter the key from your Polar email.
        </p>
        <LicenseEntry />
      </DialogBody>
      <DialogActions>
        {alternative && (
          <button
            type="button"
            onClick={alternative.onClick}
            className="px-4 py-1.5 text-sm text-gray-700 underline dark:text-zinc-300"
          >
            {alternative.label}
          </button>
        )}
        <a
          href="/pro"
          className="px-4 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 transition-colors"
        >
          Get Pro
        </a>
        <button type="button" onClick={onClose} className="px-4 py-1.5 text-sm text-gray-700 dark:text-zinc-300">
          Close
        </button>
      </DialogActions>
    </Dialog>
  )
}

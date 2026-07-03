/**
 * Reusable Buy Me a Coffee donation prompt, rendered inline at fixed points
 * in the books list and the notes/highlights view. Every render site is
 * tracked separately (via the required `placement` prop) so the donation
 * funnel can be broken down by which touchpoint drove the click.
 */
import { Text } from '@/components/text'
import { pushToDataLayer } from '@/utils/gtm'

/** Identifies which page-level touchpoint rendered this donation card. */
export type DonationCardPlacement = 'donation_card_books' | 'donation_card_notes'

interface DonationCardProps {
  /** Where this card is rendered; recorded on the `donate_click` GTM event. */
  placement: DonationCardPlacement
}

export function DonationCard({ placement }: DonationCardProps) {
  /**
   * Records a `donate_click` event before the browser follows the Buy Me a
   * Coffee link. The link keeps its default `target="_blank"` navigation —
   * this only pushes to the dataLayer and does not call `preventDefault`.
   */
  const handleDonateClick = () => {
    pushToDataLayer({ event: 'donate_click', placement })
  }

  return (
    <div className="bg-indigo-50 dark:bg-indigo-800/30 p-8 rounded-lg border-t border-b border-gray-200 dark:border-gray-700 my-6">
      <div className="flex flex-col items-center gap-4 max-w-full px-4">
        <Text className="text-center text-wrap">
          Thank you for using Kobo Note Up! ☕📚
        </Text>
        <Text className="text-wrap text-center">
          If you find this tool helpful,
          please consider supporting it with a <b>donation</b>. <br />
          Your support keeps this tool running—thank you! 💙
        </Text>
        <a
          href="https://buymeacoffee.com/hi.upchen"
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleDonateClick}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black rounded-lg font-bold transition-all hover:scale-105 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" className="animate-bounce">
            <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
          </svg>
          Help Keep This Tool Running
        </a>
      </div>
    </div>
  )
}
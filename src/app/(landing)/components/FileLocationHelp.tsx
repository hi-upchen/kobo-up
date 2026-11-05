import React from 'react'
import { Strong, Text } from '@/components/text'
import { pushToDataLayer } from '@/utils/gtm'

/**
 * Expandable "Where is my file?" help shown next to the file picker.
 * It tells visitors where KoboReader.sqlite lives on macOS and Windows,
 * and how to show the hidden .kobo folder.
 *
 * Opening the block pushes a `file_location_help_open` event to the
 * dataLayer so the team can see how many visitors need the help.
 */
export function FileLocationHelp() {
  const handleToggle = (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) {
      pushToDataLayer({ event: 'file_location_help_open' })
    }
  }

  return (
    <details
      className="mt-4 rounded-lg border border-gray-200 p-4 text-left dark:border-gray-700"
      onToggle={handleToggle}
    >
      <summary className="cursor-pointer text-sm font-semibold">
        Where is my file?
      </summary>
      <div className="mt-3 space-y-3">
        <Text className="text-sm">
          Connect your Kobo to your computer with a USB cable. The file is{' '}
          <Strong>.kobo/KoboReader.sqlite</Strong> on the Kobo drive.
        </Text>
        <Text className="text-sm">
          <Strong>Mac:</Strong> the drive is usually{' '}
          <code>/Volumes/KOBOeReader</code>, so the file is{' '}
          <code>/Volumes/KOBOeReader/.kobo/KoboReader.sqlite</code>. The{' '}
          <code>.kobo</code> folder is hidden. In Finder, press{' '}
          <Strong>⌘+Shift+.</Strong> to show hidden files.
        </Text>
        <Text className="text-sm">
          <Strong>Windows:</Strong> the drive has its own letter, for example{' '}
          <code>E:\.kobo\KoboReader.sqlite</code>. The <code>.kobo</code>{' '}
          folder is hidden. In File Explorer, choose{' '}
          <Strong>View → Show → Hidden items</Strong> (Windows 11). On Windows
          10, choose View → Options → View, then &quot;Show hidden files,
          folders, and drives&quot;.
        </Text>
      </div>
    </details>
  )
}

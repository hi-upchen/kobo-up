/**
 * Chooses the one-line upload instruction shown above the folder/file picker
 * on the landing page, based on the browser's detected folder-picker support
 * level. This exists so the Firefox/Safari-specific guidance (select the
 * hidden `.kobo` folder, not the device root) is disclosed to the visitor
 * BEFORE they attempt the upload, instead of only appearing after a failed
 * attempt inside an error message.
 */

/**
 * The three folder-picker capability tiers the landing page detects at
 * mount time, mirrored from `src/app/(landing)/page.tsx`.
 *
 * - `directory-api`: Chrome/Edge — supports the File System Access API, so
 *   selecting the device's root folder works directly.
 * - `webkitdirectory`: Firefox/Safari — supports the older `webkitdirectory`
 *   input attribute, but cannot read a USB drive's root folder; the visitor
 *   must select the hidden `.kobo` folder instead.
 * - `file-only`: no folder-picker API at all — the visitor must locate and
 *   upload the `KoboReader.sqlite` file directly.
 */
export type FolderPickerSupport = 'directory-api' | 'webkitdirectory' | 'file-only'

/** A single upload instruction: the line of copy plus whether it should link to the troubleshooting guide. */
export interface UploadInstruction {
  /** The instruction text to render above the picker. */
  text: string
  /** Whether to show a link to the Kobo folder guide alongside this instruction. */
  showGuideLink: boolean
}

/**
 * Returns the upload instruction copy to show above the folder/file picker
 * for a given browser capability tier.
 *
 * @param supportLevel - The detected folder-picker support level.
 * @returns The instruction text and whether a guide link should accompany it.
 */
export function getUploadInstruction(supportLevel: FolderPickerSupport): UploadInstruction {
  if (supportLevel === 'directory-api') {
    return {
      text: "Connect your Kobo and select your Kobo's root folder",
      showGuideLink: false,
    }
  }

  // webkitdirectory and file-only browsers (Firefox, Safari) cannot open a
  // USB drive's root folder — they need to select the hidden .kobo folder
  // instead, so we surface that instruction plus a link to the full guide
  // before the visitor attempts the upload and hits the error.
  return {
    text: 'Connect your Kobo and select the .kobo folder inside your device (hidden — press ⌘+Shift+. on Mac or enable hidden files on Windows)',
    showGuideLink: true,
  }
}

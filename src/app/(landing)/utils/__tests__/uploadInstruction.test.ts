/**
 * Verifies that the landing page shows the correct upload instruction for
 * each browser folder-picker support tier — specifically that Firefox/Safari
 * (`webkitdirectory`) and no-folder-API browsers (`file-only`) are told to
 * select the hidden `.kobo` folder (with a guide link) BEFORE they attempt
 * the upload, rather than only learning this from a post-failure error
 * message. Chrome/Edge (`directory-api`) get the simpler root-folder
 * instruction with no guide link since the direct root-folder pick works.
 */
import { getUploadInstruction } from '../uploadInstruction'

describe('getUploadInstruction', () => {
  it('tells Chrome/Edge users to select the root folder, with no guide link', () => {
    const instruction = getUploadInstruction('directory-api')

    expect(instruction.text).toMatch(/root folder/i)
    expect(instruction.showGuideLink).toBe(false)
  })

  it('tells Firefox/Safari users to select the hidden .kobo folder, with a guide link', () => {
    const instruction = getUploadInstruction('webkitdirectory')

    expect(instruction.text).toMatch(/\.kobo folder/)
    expect(instruction.text).toMatch(/hidden/i)
    expect(instruction.showGuideLink).toBe(true)
  })

  it('tells file-only users to select the hidden .kobo folder too, with a guide link', () => {
    const instruction = getUploadInstruction('file-only')

    expect(instruction.text).toMatch(/\.kobo folder/)
    expect(instruction.showGuideLink).toBe(true)
  })
})

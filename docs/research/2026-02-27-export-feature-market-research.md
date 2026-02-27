# Export Feature Market Research: Notion Export vs PDF Annotation Export

**Date:** 2026-02-27
**Purpose:** Compare user demand for Notion export vs PDF annotation export to prioritize next feature.

---

## Executive Summary

Export to Notion has substantially more demonstrated user demand than PDF annotation export. However, Notion export has significant existing competition (Readwise, 4+ open-source tools), while PDF annotation export has zero clean solutions — making it an underserved niche.

Kobo Note Up already solves the #1 and #4 most common user complaints (sideloaded book export and stylus annotation export).

---

## Feature 1: Export to Notion

### Demand Level: HIGH

### Evidence

#### Dedicated GitHub Projects (multiple independent tools)

| Project | Stars | Status | Notes |
|---|---|---|---|
| [juliariec/export-kobo-to-notion](https://github.com/juliariec/export-kobo-to-notion) | 9 | Last updated 2021, still referenced | Node.js script |
| [ghnmqdtg/Kobo2Notion](https://github.com/ghnmqdtg/Kobo2Notion) | 10 | Actively maintained, latest release June 2025 | Electron app with Gemini summarization |
| [mebibite/kobo2notion](https://github.com/mebibite/kobo2notion) | 1 | Created April 2024 | macOS/Windows/Linux CLI |
| [Hylit](https://github.com/topics/kobo) | 12 | Active | Exports to Notion and Hardcover |

Four independent developers building separate tools indicates genuine recurring demand.

#### Blog Posts and Tutorials

- [Julia Rodenburg](https://www.juliariec.com/blog/export-kobo-to-notion/) — built a custom Node.js solution, wrote detailed technical walkthrough
- [Marco Caloba on Medium](https://medium.com/@marco_caloba/kobo-to-notion-how-i-built-a-python-script-to-automate-my-reading-highlights-48ba2c0bb05d) — built a Python script for the same purpose
- [mebibite "Ultimate Reading Workflow"](https://mebibite.me/article/syncing-kobo-highlights-to-notion/) — positions Notion as destination of choice
- [Danny White](https://www.dannywhite.net/notes/kobo-to-markdown/) — covers Markdown and Notion together
- [epubor.com guide](https://www.epubor.com/how-to-export-kobo-notes-to-notion.html) — commercial tool coverage of Notion export
- [PastReads](https://www.pastreads.com/blog/export-kindle-kobo-apple-books-highlights-to-notion-free) — free service built specifically for Kobo-to-Notion

#### Commercial Tool Support

- Epubor Kclippings has native "Export > Notion" menu option
- Readwise (Kobo's official integration partner) offers Notion as an export destination
- Kobo's own support page ([Use Readwise to view and manage your annotations](https://help.kobo.com/hc/en-us/articles/10789206247703-Use-Readwise-to-view-and-manage-your-annotations)) directs users to Readwise

#### Adjacent Ecosystem

- [october](https://github.com/marcus-crane/october) (229 GitHub stars) — exists solely to make Kobo-to-Readwise frictionless; Readwise then routes to Notion
- [obsidian-kobo-highlights-import](https://github.com/OGKevin/obsidian-kobo-highlights-import) (143 stars) — shows strong demand for PKM tool integration generally

### Competition

- Readwise (paid, $8.99/month) — official Kobo partner, well-established Notion pipeline
- 4+ open-source CLI/desktop tools (see table above)
- PastReads — free web service
- Epubor Kclippings — commercial desktop app

### Technical Constraints for Kobo Note Up

- Notion blocks CORS — all API calls must go through server-side proxy
- Notion OAuth requires server-side client_secret (no PKCE support)
- Handwriting images need compositing (SVG+JPG → JPG) and upload via Notion File Upload API
- All image data flows through server proxy (bandwidth concern)
- See detailed technical design: `docs/plans/2026-02-27-notion-export-design.md`

---

## Feature 2: PDF Annotation Export

### Demand Level: MODERATE but underserved

### The Fundamental Problem

Kobo's native annotation export (launched late 2024/2025) explicitly excludes:
- Sideloaded books (including sideloaded PDFs)
- Stylus-based markups (only text highlights and notes are exported)
- Non-publisher-approved titles

Source: [Kobo official export help page](https://help.kobo.com/hc/en-us/articles/29991333812631-Export-annotations-from-your-books), [The eBook Reader blog](https://blog.the-ebook-reader.com/2025/09/18/kobo-now-supports-exporting-annotations/)

### Who Annotates PDFs on Kobo?

Two user segments:
1. **Stylus-device users** (Kobo Sage, Elipsa, Elipsa 2E, Libra Colour) who draw/write on PDFs — handwritten annotations are NOT exportable even with official feature
2. **Users who sideload academic papers, technical documents, or comics** as PDFs and use text highlights

This is a narrower, more technically sophisticated user segment.

### Evidence of Demand

- [MobileRead forum thread on annotation export](https://www.mobileread.com/forums/showthread.php?t=349637) — ~59 replies but focuses on EPUB/KEPUB, not PDF specifically
- [GitHub Kobo-Reader Issue #96](https://github.com/kobolabs/Kobo-Reader/issues/96) — feature request for improved native annotation export, only 2 comments, 1 thumbs up (low engagement)
- KOReader (25.6k GitHub stars) supports PDF annotation export — users who care enough tend to install KOReader rather than seek solutions built on Kobo's native firmware
- [KOReader issue #8537](https://github.com/koreader/koreader/issues/8537) — "Add stylus drawing annotation support to PDF files"

### Evidence of Absence

- No dedicated "Kobo PDF annotation exporter" tools found with meaningful GitHub stars
- No blog posts specifically solving "Kobo PDF annotation export" as a workflow
- Community discussions about PDF annotations predominantly conclude with "use KOReader instead"

### Competition

- **KOReader** — full firmware replacement (25.6k stars), supports PDF annotations but requires technical setup
- **Calibre** — mentioned as a workaround but not a clean solution
- **No web-based tools** found for this use case

---

## Export Destination Ranking (by user demand)

Based on tool ecosystem analysis across all Kobo export tools:

1. **Readwise** — Dominant. Official Kobo partnership. october (229 stars).
2. **Obsidian** — Strong. Dedicated plugin (143 stars). Active Obsidian forum thread.
3. **Notion** — Solid. 4+ dedicated tools (~32 stars total). Commercial tool support.
4. **Markdown/plain text** — Broad demand across all tools.
5. **Evernote, Logseq** — Mentioned but secondary.

---

## Most Common Kobo Export Complaints (ranked by frequency)

1. **No easy way to export highlights from sideloaded books** — affects EPUB and PDF users equally. Top complaint. **Kobo Note Up already solves this.**
2. **No official Notion/Obsidian direct integration** — users resent needing paid Readwise subscription as middleman.
3. **Config file hacking required** to enable basic local export — `ExportHighlights=true` trick in `eReader.conf`.
4. **Stylus annotations cannot be exported at all** — growing complaint as Kobo releases more stylus-capable devices. **Kobo Note Up already solves this.**
5. **Official export only works for store-purchased books** — frustrates the large sideloading community.

One MobileRead user summarized: "so annoying that I don't even bother with it anymore."

---

## Quantitative Signal Comparison

| Signal | Notion Export | PDF Annotation Export |
|---|---|---|
| Dedicated GitHub repos | 4+ repos, ~32 stars total | 0 dedicated repos found |
| Most-starred adjacent tool | october (229 stars, Readwise → Notion) | KOReader (25.6k stars, full firmware) |
| Blog posts / tutorials | 6+ independent tutorials | 0 specific tutorials found |
| Commercial tool support | Epubor has native Notion export | Calibre only workaround |
| Forum thread engagement | Multiple threads, active discussion | Scattered mentions in broader threads |
| Official Kobo endorsement | Yes (Readwise partnership page) | No |
| Feature gaps actively solved | Yes (tools updated 2024-2025) | Structural limitation, unsolved |

---

## Strategic Analysis for Kobo Note Up

### Notion Export
- **Pros:** Broader audience, high demand, natural extension of existing markdown export
- **Cons:** Crowded space (Readwise, 4+ tools), requires server infrastructure (CORS), image bandwidth through server

### PDF Annotation Export
- **Pros:** Zero competition for a clean web-based solution, serves underserved niche, no server needed (client-side processing)
- **Cons:** Smaller audience, technically complex (PDF parsing), narrower use case

### Kobo Note Up's Unique Position
The app already solves the two biggest complaints (#1 sideloaded books, #4 stylus annotations). This positions it well for either feature, but especially for PDF annotations where no clean web-based solution exists.

---

## Sources

- [Kobo official annotation export help](https://help.kobo.com/hc/en-us/articles/29991333812631-Export-annotations-from-your-books)
- [Kobo Now Supports Exporting Annotations - The eBook Reader](https://blog.the-ebook-reader.com/2025/09/18/kobo-now-supports-exporting-annotations/)
- [Use Readwise to view and manage your annotations - Kobo official](https://help.kobo.com/hc/en-us/articles/10789206247703-Use-Readwise-to-view-and-manage-your-annotations)
- [export-kobo-to-notion - juliariec GitHub](https://github.com/juliariec/export-kobo-to-notion)
- [Kobo2Notion - ghnmqdtg GitHub](https://github.com/ghnmqdtg/Kobo2Notion)
- [mebibite/kobo2notion GitHub](https://github.com/mebibite/kobo2notion)
- [obsidian-kobo-highlights-import - OGKevin GitHub](https://github.com/OGKevin/obsidian-kobo-highlights-import)
- [october - marcus-crane GitHub](https://github.com/marcus-crane/october)
- [KOReader GitHub](https://github.com/koreader/koreader)
- [Kobo-Reader Issue #96](https://github.com/kobolabs/Kobo-Reader/issues/96)
- [Kobo ereader Highlights Importer - Obsidian Forum](https://forum.obsidian.md/t/kobo-ereader-highlights-importer/29280)
- [Julia Rodenburg - Export Kobo to Notion](https://www.juliariec.com/blog/export-kobo-to-notion/)
- [Danny White - Kobo to Markdown](https://www.dannywhite.net/notes/kobo-to-markdown/)
- [Epubor - Export Kobo Notes to Notion](https://www.epubor.com/how-to-export-kobo-notes-to-notion.html)
- [PastReads - Export to Notion Free](https://www.pastreads.com/blog/export-kindle-kobo-apple-books-highlights-to-notion-free)
- [Marco Caloba - Kobo to Notion Python Script](https://medium.com/@marco_caloba/kobo-to-notion-how-i-built-a-python-script-to-automate-my-reading-highlights-48ba2c0bb05d)
- [mebibite - Syncing Kobo Highlights to Notion](https://mebibite.me/article/syncing-kobo-highlights-to-notion/)
- [MobileRead Forums - Exporting Notes/Highlights](https://www.mobileread.com/forums/showthread.php?t=326471)
- [MobileRead Forums - Annotation Export Thread](https://www.mobileread.com/forums/showthread.php?t=349637)
- [eReadersForum - How to Export Highlights](https://www.ereadersforum.com/threads/how-to-export-highlights-annotations-from-a-kobo-ereader.7746/)

# 📚 Kobo Note Up - Export Kobo Highlights When Official Export Not Working

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2+-black.svg)
[![Live Demo](https://img.shields.io/badge/demo-live-green.svg)](https://kobo-up.runawayup.com)

**Finally export highlights from ALL your Kobo books - including sideloaded PDFs and EPUBs that official Kobo export ignores. Free browser-based tool, no installation required.**

[**🚀 Try It Now - Export Your Kobo Notes**](https://kobo-up.runawayup.com) | [**View Demo**](https://kobo-up.runawayup.com) | [**Report Issue**](https://github.com/upchen/kobo-up/issues)

---

## 🎯 The Problem: Kobo Export Not Working for Your Books?

If you're here, you've probably discovered that:
- ❌ **Kobo's official export doesn't work with sideloaded books** (PDFs, EPUBs you added manually)
- ❌ **Your highlights get truncated** when they're too long
- ❌ **You need complex software like Calibre** just to access your own notes
- ❌ **Manual database extraction** is technical and frustrating

## ✨ The Solution: Kobo Note Up

A free, browser-based tool that **actually exports highlights from ALL your books** - whether they're from the Kobo store or your personal library.

### Why Kobo Note Up?

| Problem | Our Solution |
|---------|-------------|
| Official export ignores sideloaded books | ✅ Works with ALL books - store-bought and sideloaded |
| Highlights get truncated | ✅ Exports complete highlights, no matter the length |
| Need to install Calibre or other software | ✅ Runs entirely in your browser - zero installation |
| Manual database extraction is complex | ✅ Automatic database detection with one click |
| Privacy concerns with online tools | ✅ 100% local processing - your data never leaves your device |

## 🚀 Quick Start - Export Kobo Highlights in 5 Steps

1. **Connect** your Kobo e-reader to your computer via USB
2. **Open** [Kobo Note Up](https://kobo-up.runawayup.com) in Chrome, Edge, or Opera
3. **Select** your Kobo device folder when prompted
4. **Browse** your books and highlights (automatically extracted)
5. **Export** to Markdown or text format

That's it! No installation, no account, no data uploaded anywhere.

## ✨ Key Features

- 📖 **Export from ALL Books** - Works with sideloaded PDFs, EPUBs, and store-bought books
- 🔒 **100% Private** - All processing happens locally in your browser
- ⚡ **Instant Export** - No installation, no setup, just works
- 📝 **Multiple Formats** - Export to Markdown (for Obsidian/Notion) or plain text
- 🎯 **Smart Detection** - Automatically finds your Kobo database
- 💻 **Cross-Platform** - Works on Windows, Mac, and Linux
- 🆓 **Completely Free** - Open source with MIT license

## 🖥️ Browser Compatibility

| Browser | Support | Why? |
|---------|---------|------|
| Chrome ✅ | Full Support | Has File System Access API |
| Edge ✅ | Full Support | Has File System Access API |
| Opera ✅ | Full Support | Has File System Access API |
| Safari ❌ | Not Supported | Lacks required API |
| Firefox ❌ | Not Supported | Lacks required API |

## 📋 How to Find Your Kobo Database

When you connect your Kobo and open our tool, it automatically searches for your `KoboReader.sqlite` file. This file contains all your highlights and notes.

**Typical location after connecting Kobo via USB:**
- **Windows**: `E:\.kobo\KoboReader.sqlite` (drive letter may vary)
- **Mac**: `/Volumes/KOBOeReader/.kobo/KoboReader.sqlite`
- **Linux**: `/media/[username]/KOBOeReader/.kobo/KoboReader.sqlite`

## 🛠️ For Developers

### Tech Stack

- **Frontend**: Next.js 14.2+ with TypeScript
- **Database**: SQL.js (WebAssembly SQLite in browser)
- **Styling**: Tailwind CSS
- **Privacy**: 100% client-side processing

### Installation

```bash
# Clone the repository
git clone https://github.com/upchen/kobo-up.git
cd kobo-up

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── app/                # Next.js App Router
├── components/         # Reusable UI components
├── services/          # Business logic (export, database)
├── models/            # Database operations
└── utils/             # Helper functions
```

## 🤝 Contributing

We welcome contributions! Here are ways to help:

- 🐛 [Report bugs](https://github.com/upchen/kobo-up/issues)
- 💡 [Suggest features](https://github.com/upchen/kobo-up/issues)
- 🔧 Submit pull requests
- ⭐ Star the repository
- 📢 Share with other Kobo users

### Ideas for Contribution

- Add JSON export format
- Support for more e-reader brands
- Batch export improvements
- UI/UX enhancements
- Translation to other languages

## 📖 FAQ

### Why doesn't Kobo's official export work with my sideloaded books?
Kobo's built-in export only works with books purchased from their store. Sideloaded content (PDFs, EPUBs you added manually) is ignored. Kobo Note Up solves this by reading directly from your Kobo's database.

### Is it safe to use? Will it damage my Kobo?
Absolutely safe! We only READ your database, never write to it. Your Kobo device remains untouched. All processing happens in your browser.

### Why doesn't it work in Safari or Firefox?
These browsers don't support the File System Access API needed to automatically find your Kobo database. Use Chrome, Edge, or Opera for the best experience.

### Can I export highlights from specific books only?
Yes! You can browse your library and export individual books or export your entire library at once.

### What formats can I export to?
Currently Markdown (.md) and plain text (.txt). Markdown works great with note-taking apps like Obsidian and Notion.

### Do you store my highlights or personal data?
No! Everything happens locally in your browser. We cannot see your highlights, books, or any personal information. Your privacy is guaranteed.

## 🙏 Acknowledgments

Special thanks to:
- [mollykannn/kobo-book-exporter-go](https://github.com/mollykannn/kobo-book-exporter-go) for inspiration
- [karlicoss/kobuddy](https://github.com/karlicoss/kobuddy) for Kobo database insights
- The Kobo community for feedback and support

## 📄 License

MIT License - feel free to use this tool however you like!

## 💖 Support

If Kobo Note Up helped you export your highlights:
- ⭐ **Star this repository** to help others find it
- ☕ [**Buy me a coffee**](https://www.buymeacoffee.com/hi.upchen) if you'd like to support development
- 📢 **Share** with other Kobo users facing export issues

---

<p align="center">
  Made with ❤️ by <a href="https://www.runawayup.com">Up Chen</a>
  <br>
  <a href="https://kobo-up.runawayup.com">Try Kobo Note Up Now →</a>
</p>
# VoxFetch-CESI

[![npm version](https://img.shields.io/npm/v/voxfetch-cesi.svg?style=flat-square)](https://www.npmjs.com/package/voxfetch-cesi)
[![npm downloads](https://img.shields.io/npm/dm/voxfetch-cesi.svg?style=flat-square)](https://www.npmjs.com/package/voxfetch-cesi)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download ScholarVox books as PDFs - Made for CESI Students 🎓

## 📖 Quick Start

### Option 1: Global Installation (Recommended)

```bash
# Install globally
npm install -g voxfetch-cesi

# Install browser (required once)
npx playwright install chromium

# Linux only: Install system dependencies (requires sudo)
npx playwright install-deps chromium

# Run from anywhere
voxfetch
```

### Option 2: Local Installation

1. **Install dependencies:**
   ```bash
   npm install
   npm run playwright:install
   ```

2. **Run the tool:**
   ```bash
   npm run download
   ```

3. **Enter the book ID** (found in the URL: `scholarvox.com/reader/docid/12345678`)

4. **Login with your CESI credentials** when prompted

That's it! Your PDF will be saved in the `output/` folder.

## What does this do?

ScholarVox only lets you read books online. This tool downloads them as proper PDF files for offline reading with selectable text and preserved formatting.

## ⚙️ How It Works

1. Logs in with your CESI credentials
2. Navigates to each page of the book
3. Waits for fonts to load properly
4. Prints each page to PDF using the browser
5. Saves everything as a single PDF file

---

## 📦 Installation

### Global Installation (CLI)

```bash
# Install globally via npm
npm install -g voxfetch-cesi

# Install browser (required)
npx playwright install chromium

# Now you can run from anywhere
voxfetch
```

### Local Installation (Development)

**Requirements:** Node.js 18+ ([Download](https://nodejs.org/))

```bash
# Clone the repository
git clone https://github.com/0n3m0r3/VoxFetch-CESI.git
cd voxfetch-cesi

# Install dependencies
npm install

# Install browser
npm run playwright:install
```

**Linux users:** You **must** install browser system dependencies:
```bash
# This requires sudo and installs required system libraries
npx playwright install-deps chromium
```

Without this step, you'll get errors like `cannot open shared object file: libnspr4.so`.

---

## 🚀 Usage

```bash
npm run download
```

The tool will guide you through:
- Entering the book ID
- Logging in with your CESI credentials
- Optionally saving your credentials for future use

### Finding the Book ID

Look at the URL when viewing a book on ScholarVox:

```
https://univ.scholarvox.com/reader/docid/88853415/page/1
                                         ^^^^^^^^
                                      This is the book ID
```

### Advanced Options

```bash
# Debug mode (see detailed logs)
npm run download:debug
```

### Saved Credentials

Credentials are stored securely in your system's credential manager:
- **Windows:** Credential Manager (encrypted with DPAPI)
- **macOS:** Keychain
- **Linux:** Secret Service

To delete saved credentials:
```bash
# Windows: Open Credential Manager and remove "voxfetch-cesi" entry
# Or run the tool and choose "n" when asked to use saved credentials

# macOS: Open Keychain Access and search for "voxfetch-cesi"

# Linux: Use your system's credential manager
```

---

## ⚠️ Troubleshooting

**"Book ID not found"**
- Verify the book ID from the URL
- Ensure you have access to the book through your institution

**"Login failed"**
- Check your CESI credentials are correct
- Delete saved credentials and try again

**"No iframe found"**
- The book may require special access
- Try opening the book in a browser first

**PDF is blank or incomplete**
- Some books may have loading issues
- Try running it again if the error persists, 
- Try running with `npm run download:debug` to see what's happening

---

## 🚧 Known Limitations

- **CESI only:** Currently only works with ScholarVox CESI (`cesi.scholarvox.com`). Other institutions may have different authentication flows.
- **One book at a time:** The tool downloads one book per run. Batch downloads are not yet supported.
- **No bookmark preservation:** Bookmarks/table of contents from the original book are not preserved in the PDF.
- **Page size:** All pages are exported with the same size, which may not match the original book format exactly.
- **Network dependent:** Requires a stable internet connection throughout the download process.

---

## ❓ FAQ

### Is this legal?

This tool is designed for **personal use only** - to download books you already have legitimate access to through your institution. It's similar to printing pages for personal study. However:
- Redistributing downloaded books is **illegal**
- Using this to bypass access restrictions is **against ToS**
- Always check your institution's and ScholarVox's terms of service

### Does it work for other schools?

Currently, VoxFetch-CESI is specifically designed for CESI's ScholarVox portal. Other institutions may have different authentication systems. Feel free to open an issue or PR if you'd like to add support for your school!

### Why does it ask for my credentials again?

This can happen if:
- You chose not to save your credentials previously
- Your saved credentials were deleted from the system's credential manager
- There was an authentication error and credentials were invalidated

### Why is the download slow?

The tool needs to:
1. Navigate to each page individually
2. Wait for fonts and content to fully load
3. Generate a PDF for each page
4. Merge all pages at the end

This ensures maximum quality but takes time. A 300-page book typically takes 5-10 minutes.

### The tool crashes or hangs, what should I do?

1. Run with debug mode: `npm run download:debug`
2. Check your internet connection
3. Try with a different book to isolate the issue
4. Open an issue with the debug logs

---

## 🔒 Security Considerations

### Credential Storage

**Your credentials are never stored in plain text.** They are managed by your operating system's native credential manager via the `@napi-rs/keyring` library:

| OS | Storage Location | Encryption |
|---|---|---|
| **Windows** | Windows Credential Manager | DPAPI encryption |
| **macOS** | Keychain | Keychain encryption |
| **Linux** | Secret Service (GNOME Keyring, KWallet) | System encryption |

### Privacy

- ✅ **100% local:** All processing happens on your machine
- ✅ **No telemetry:** We don't collect any data
- ✅ **No external servers:** The tool only communicates with ScholarVox
- ✅ **Open source:** You can audit the entire codebase

### Recommendations

We encourage you to:
1. **Review the code** before running it, especially `src/utils/credentials.ts`
2. **Check the network traffic** if you're concerned (the tool only connects to ScholarVox)
3. **Use a separate password** for ScholarVox if possible (good security practice in general)

---

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Format code
npm run format
```

---

## ⚖️ Legal Disclaimer

**This tool is for personal use only.**

- ✅ Use it to download books **you already have legitimate access to** through your institution
- ✅ Use it for **personal study and offline reading**
- ❌ **DO NOT** distribute downloaded books to others
- ❌ **DO NOT** use it to bypass copyright or access restrictions

**You are responsible for complying with:**
- Your institution's terms of service
- ScholarVox's terms of use
- Copyright laws in your jurisdiction

This tool is provided "as is" for educational purposes. The authors are not responsible for any misuse.

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🗺️ Roadmap

Here are some features we're considering for future versions:

- [ ] **Batch download mode:** Download multiple books from a list
- [ ] **CLI options:** Command-line arguments for book ID, output path, etc.
- [ ] **Progress bar:** Visual progress indicator during download
- [ ] **Better error messages:** More helpful error descriptions and recovery suggestions
- [ ] **Resume support:** Ability to resume interrupted downloads
- [ ] **Table of contents:** Preserve bookmarks and chapter navigation in PDFs
- [ ] **Multi-institution support:** Add support for other schools using ScholarVox

Have a feature idea? [Open an issue](https://github.com/0n3m0r3/VoxFetch-CESI/issues) or check out [CONTRIBUTING.md](CONTRIBUTING.md) to submit a PR!

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up the development environment
- Code style and formatting rules
- How to submit a pull request

---

**Made with ❤️ for CESI students**

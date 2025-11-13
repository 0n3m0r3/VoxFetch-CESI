# VoxFetch-CESI

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download ScholarVox books as PDFs - Made for CESI Students 🎓

## 📖 Quick Start

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

**Linux users:** You may need to install browser dependencies:
```bash
npx playwright install-deps chromium
```

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

Credentials are stored locally in `~/.voxfetch-cesi/credentials` (encoded, not encrypted).

To delete saved credentials:
```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force ~\.voxfetch-cesi

# macOS/Linux
rm -rf ~/.voxfetch-cesi
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
- Try running with `npm run download:debug` to see what's happening

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

**Made with ❤️ for CESI students**

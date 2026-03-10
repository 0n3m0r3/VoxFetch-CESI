# VoxFetch

[![npm version](https://img.shields.io/npm/v/voxfetch-cesi.svg?style=flat-square)](https://www.npmjs.com/package/voxfetch-cesi)
[![npm downloads](https://img.shields.io/npm/dm/voxfetch-cesi.svg?style=flat-square)](https://www.npmjs.com/package/voxfetch-cesi)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg?style=flat-square)](https://nodejs.org/)

Download ScholarVox books as PDFs — for CESI students and university students 🎓

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

4. **Choose your login method** when prompted (CESI or university via Renater)

That's it! Your PDF will be saved in the `output/` folder.

## What does this do?

ScholarVox only lets you read books online. This tool downloads them as proper PDF files for offline reading with selectable text and preserved formatting.

It supports two authentication paths:
- **CESI students** — direct SAML login via `univ.scholarvox.com/saml-sp/viacesi`
- **University students** — SSO login via the [Renater federation](https://www.renater.fr/) (the French academic identity federation), supporting 20+ institutions

## ⚙️ How It Works

1. Logs in with your institutional credentials (CESI or university via Renater)
2. Navigates to each page of the book
3. Waits for fonts to load properly
4. Prints each page to PDF using the browser
5. Saves everything as a single PDF file


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

## 🚀 Usage

```bash
npm run download
```

The tool will guide you through:
- Entering the book ID
- Choosing your login method
- Logging in with your credentials
- Optionally saving your credentials for future use

### Login Methods

#### CESI (default)

Select option `(1)` at the login method prompt, or pass `--auth cesi`:
```bash
voxfetch --auth cesi
```
You will be asked for your CESI email and password.

#### University SSO

Select option `(2)` at the login method prompt, or pass `--auth renater`:
```bash
voxfetch --auth renater
```
You will be asked to pick your institution from the list and enter your university username and password.

To skip both prompts entirely:
```bash
voxfetch --auth renater --institution univ-rouen
```

### Supported Institutions (University SSO)

| Key | Institution |
|---|---|
| `univ-lille` | Université de Lille |
| `univ-rouen` | Université de Rouen Normandie |
| `univ-caen` | Université de Caen Normandie |
| `univ-rennes` | Université de Rennes |
| `univ-rennes2` | Université Rennes 2 |
| `univ-nantes` | Nantes Université |
| `univ-angers` | Université d'Angers |
| `univ-bordeaux` | Université de Bordeaux |
| `univ-bordeaux-montaigne` | Université Bordeaux Montaigne |
| `univ-poitiers` | Université de Poitiers |
| `univ-toulouse3` | Université Paul Sabatier (Toulouse 3) |
| `univ-toulouse-capitole` | Université Toulouse Capitole |
| `univ-toulouse-jean-jaures` | Université Toulouse Jean Jaurès |
| `univ-montpellier` | Université de Montpellier |
| `univ-montpellier3` | Université Paul-Valéry Montpellier 3 |
| `univ-grenoble` | Université Grenoble Alpes |
| `univ-lyon1` | Université Claude Bernard Lyon 1 |
| `univ-lyon2` | Université Lumière Lyon 2 |
| `univ-lyon3` | Université Jean Moulin Lyon 3 |
| `univ-strasbourg` | Université de Strasbourg |
| `univ-lorraine` | Université de Lorraine |

To request support for another institution, open an issue or add an entry to `src/config/institutions.ts`. Entity IDs can be looked up at `https://discovery.renater.fr/renater/api.php?search=<name>`.

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

# Skip login method prompt
voxfetch --auth cesi
voxfetch --auth renater --institution univ-lille
```

### Saved Credentials

Credentials are stored securely in your system's credential manager:
- **Windows:** Credential Manager (encrypted with DPAPI)
- **macOS:** Keychain
- **Linux:** Secret Service

Each login method uses its own keychain entry:

| Login method | Keychain service name |
|---|---|
| CESI | `voxfetch-cesi` |
| University SSO (any institution) | `voxfetch-<institution-key>` |

Examples: `voxfetch-univ-lille`, `voxfetch-univ-rouen`, `voxfetch-univ-bordeaux`, etc.

To delete saved credentials, run the tool and choose `n` when asked to use saved credentials, then `y` to delete. Alternatively:
```bash
# macOS: Open Keychain Access and search for "voxfetch-cesi" or "voxfetch-univ-lille"
# Linux: Use your system's credential manager (GNOME Keyring, KWallet, etc.)
# Windows: Open Credential Manager and remove the relevant entry
```

## ⚠️ Troubleshooting

**"Book ID not found"**
- Verify the book ID from the URL
- Ensure you have access to the book through your institution

**"Login failed" (CESI)**
- Check your CESI email and password are correct
- Delete saved credentials and try again

**"SSO login failed" / "Renater login failed"**
- Check your university username and password are correct
- Confirm your institution is in the supported list above
- If the login redirects to an unexpected page, the entity ID in `src/config/institutions.ts` may be stale — look up the correct value at `https://discovery.renater.fr/renater/api.php?search=<your+university+name>`

**"No iframe found"**
- The book may require special access
- Try opening the book in a browser first

**PDF is blank or incomplete**
- Some books may have loading issues
- Try running it again if the error persists, 
- Try running with `npm run download:debug` to see what's happening

## 🚧 Known Limitations

- **One book at a time:** The tool downloads one book per run. Batch downloads are not yet supported.
- **Network dependent:** Requires a stable internet connection throughout the download process.

## ❓ FAQ

### Is this legal?

This tool is designed for **personal use only** - to download books you already have legitimate access to through your institution. It's similar to printing pages for personal study. However:
- Redistributing downloaded books is **illegal**
- Using this to bypass access restrictions is **against ToS**
- Always check your institution's and ScholarVox's terms of service

### Does it work for other schools?

Yes, for universities connected to ScholarVox via the **Renater** federation (most French public universities). Select login method `(2)` at the prompt. 20+ universities are supported out of the box — see the institution list above. For anything not in the list, add an entry to `src/config/institutions.ts` (entity IDs are at `https://discovery.renater.fr/renater/api.php?search=<name>`).

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

This ensures maximum quality but takes time. A 300-page book typically takes 1-2 minutes.

### The tool crashes or hangs, what should I do?

1. Run with debug mode: `npm run download:debug`
2. Check your internet connection
3. Try with a different book to isolate the issue
4. Open an issue with the debug logs

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

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Format code
npm run format
```

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

## 📄 License

MIT License - See LICENSE file for details

## 🗺️ Roadmap

Here are some features we're considering for future versions:

- [ ] **Batch download mode:** Download multiple books from a list
- [ ] **CLI options:** Command-line arguments for book ID, output path, etc.
- [x] **Progress bar:** Visual progress indicator during download
- [ ] **Better error messages:** More helpful error descriptions and recovery suggestions
- [ ] **Resume support:** Ability to resume interrupted downloads
- [x] **Table of contents:** Preserve bookmarks and chapter navigation in PDFs
- [x] **University SSO:** Support for university students via the Renater federation (20+ institutions)
- [ ] **More institutions:** Expand the SSO institution registry further

Have a feature idea? [Open an issue](https://github.com/0n3m0r3/VoxFetch-CESI/issues) or check out [CONTRIBUTING.md](CONTRIBUTING.md) to submit a PR!

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on:
- Setting up the development environment
- Code style and formatting rules
- How to submit a pull request

**Made with ❤️ for CESI students**

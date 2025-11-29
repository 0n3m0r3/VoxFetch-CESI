# Contributing to VoxFetch-CESI

Thank you for your interest in contributing to VoxFetch-CESI! 🎉

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git

### Setting Up the Development Environment

1. **Fork the repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/VoxFetch-CESI.git
   cd VoxFetch-CESI
   ```

3. **Install dependencies:**
   ```bash
   npm install
   npm run playwright:install
   ```

4. **Run in development mode:**
   ```bash
   npm run dev
   ```

## 📝 Code Style

This project uses **Prettier** for code formatting and **TypeScript** for type safety.

### Before Committing

1. **Format your code:**
   ```bash
   npm run format
   ```

2. **Check formatting:**
   ```bash
   npm run format:check
   ```

3. **Build to check for TypeScript errors:**
   ```bash
   npm run build
   ```

### Style Guidelines

- Use TypeScript for all new code
- Follow existing code patterns and naming conventions
- Keep functions small and focused
- Add comments for complex logic
- Use meaningful variable and function names

## 🔀 How to Submit a Pull Request

1. **Create a new branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-new-feature
   # or
   git checkout -b fix/issue-description
   ```

2. **Make your changes** and commit them with clear messages:
   ```bash
   git commit -m "feat: add support for book lists"
   # or
   git commit -m "fix: handle network timeout errors"
   ```

3. **Push to your fork:**
   ```bash
   git push origin feature/my-new-feature
   ```

4. **Open a Pull Request** on GitHub with:
   - A clear title describing the change
   - A description of what was changed and why
   - Reference any related issues (e.g., "Fixes #123")

## 📋 Commit Message Convention

We follow a simple convention for commit messages:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## 🐛 Reporting Bugs

When reporting bugs, please include:

1. Your Node.js version (`node --version`)
2. Your operating system
3. Steps to reproduce the issue
4. Expected behavior vs actual behavior
5. Any error messages or logs

## 💡 Suggesting Features

Feature suggestions are welcome! Please open an issue with:

1. A clear description of the feature
2. Use cases and benefits
3. Any technical considerations

## ❓ Questions?

If you have questions, feel free to open an issue or reach out to the maintainers.

---

Thank you for contributing! 🙏

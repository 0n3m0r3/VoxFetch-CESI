/**
 * Credential management for CESI login
 * Uses OS-level secure credential storage (Windows Credential Manager, macOS Keychain, Linux Secret Service)
 */

import { Entry } from "@napi-rs/keyring";
import readline from "node:readline";

const SERVICE_NAME = "voxfetch-cesi";
const ACCOUNT_KEY = "cesi-credentials";

interface Credentials {
  email: string;
  password: string;
}

function askQuestion(
  question: string,
  hidden: boolean = false
): Promise<string> {
  return new Promise(resolve => {
    if (hidden) {
      // For password input - mute the output
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
      });

      process.stdout.write(question);

      let password = "";
      const stdin = process.stdin;

      if (stdin.isTTY) {
        (stdin as any).setRawMode(true);
      }

      stdin.once("data", function onData(char: Buffer) {
        const c = char.toString();

        if (c === "\r" || c === "\n" || c === "\u000a" || c === "\u000d") {
          if (stdin.isTTY) {
            (stdin as any).setRawMode(false);
          }
          stdin.pause();
          rl.close();
          process.stdout.write("\n");
          resolve(password);
        } else if (c === "\u0003") {
          // Ctrl+C
          process.exit(1);
        } else if (c === "\u007f" || c === "\b" || c === "\u0008") {
          // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
          }
          stdin.once("data", onData);
        } else {
          password += c;
          stdin.once("data", onData);
        }
      });

      stdin.resume();
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

/**
 * Save credentials to OS keychain
 */
export async function saveCredentials(
  email: string,
  password: string
): Promise<void> {
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_KEY);
    const data = JSON.stringify({ email, password });
    entry.setPassword(data);
    console.log("Credentials saved securely to system keychain.");
  } catch (error) {
    console.error("Failed to save credentials:", error);
    throw error;
  }
}

/**
 * Load credentials from OS keychain
 */
export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_KEY);
    const data = entry.getPassword();
    if (!data) {
      return null;
    }
    const parsed = JSON.parse(data);
    return {
      email: parsed.email,
      password: parsed.password,
    };
  } catch (error) {
    // Credentials not found or error reading
    return null;
  }
}

/**
 * Delete credentials from OS keychain
 */
export async function deleteCredentials(): Promise<void> {
  try {
    const entry = new Entry(SERVICE_NAME, ACCOUNT_KEY);
    entry.deletePassword();
    console.log("Credentials deleted from system keychain.");
  } catch (error) {
    // Credentials don't exist, that's fine
  }
}

export async function promptCredentials(
  allowSave: boolean = true
): Promise<Credentials> {
  const email = await askQuestion("CESI Email: ");
  const password = await askQuestion("Password: ", true);

  if (allowSave) {
    const save = await askQuestion("Save credentials for future use? (y/n): ");
    if (save.toLowerCase() === "y" || save.toLowerCase() === "yes") {
      await saveCredentials(email, password);
    }
  }

  return { email, password };
}

export async function getCredentials(
  emailArg?: string,
  passwordArg?: string
): Promise<Credentials> {
  // Priority 1: Command line arguments
  if (emailArg && passwordArg) {
    return { email: emailArg, password: passwordArg };
  }

  // Priority 2: Check for stored credentials
  const stored = await loadCredentials();
  if (stored) {
    console.log(`Found saved credentials for: ${stored.email}`);
    const use = await askQuestion("Use saved credentials? (y/n): ");

    if (use.toLowerCase() === "y" || use.toLowerCase() === "yes") {
      return stored;
    } else {
      // User wants to use different credentials
      const deleteOld = await askQuestion("Delete saved credentials? (y/n): ");
      if (
        deleteOld.toLowerCase() === "y" ||
        deleteOld.toLowerCase() === "yes"
      ) {
        await deleteCredentials();
      }
    }
  }

  // Priority 3: Prompt user for new credentials
  return await promptCredentials();
}

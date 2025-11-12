/**
 * Credential management for CESI login
 */

import fs from "node:fs/promises";
import path from "node:path";
import { homedir } from "node:os";
import readline from "node:readline";

const CONFIG_DIR = path.join(homedir(), ".voxfetch-cesi");
const CONFIG_FILE = path.join(CONFIG_DIR, "credentials");

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
 * Simple XOR encoding for basic obfuscation
 * NOT cryptographically secure, but better than plaintext
 */
function encode(text: string): string {
  const key = "voxfetch-cesi-2025";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return Buffer.from(result).toString("base64");
}

function decode(encoded: string): string {
  const key = "voxfetch-cesi-2025";
  const text = Buffer.from(encoded, "base64").toString();
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(
      text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

export async function saveCredentials(
  email: string,
  password: string
): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });

  const data = {
    email: encode(email),
    password: encode(password),
  };

  await fs.writeFile(CONFIG_FILE, JSON.stringify(data, null, 2), {
    mode: 0o600,
  });
  console.log("Credentials saved securely.");
}

export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const data = await fs.readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(data);

    return {
      email: decode(parsed.email),
      password: decode(parsed.password),
    };
  } catch (error) {
    return null;
  }
}

export async function deleteCredentials(): Promise<void> {
  try {
    await fs.unlink(CONFIG_FILE);
    console.log("Credentials deleted.");
  } catch (error) {
    // File doesn't exist, that's fine
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

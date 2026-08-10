/**
 * Node ESM requires file extensions; the app's source uses Next-style
 * extensionless imports ("./pg") and the "@/..." alias. This resolver fills
 * both gaps so the test harness can import application modules directly.
 */
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const SRC = path.resolve(fileURLToPath(import.meta.url), "../../src");
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"];

function firstExisting(basePath) {
  for (const ext of EXTENSIONS) {
    const candidate = basePath + ext;
    if (existsSync(candidate)) return candidate;
  }
  for (const ext of EXTENSIONS) {
    const candidate = path.join(basePath, "index" + ext);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let target = null;

  if (specifier.startsWith("@/")) {
    target = path.join(SRC, specifier.slice(2));
  } else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (target && !path.extname(target)) {
    const resolved = firstExisting(target);
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true };
  }

  return nextResolve(specifier, context);
}

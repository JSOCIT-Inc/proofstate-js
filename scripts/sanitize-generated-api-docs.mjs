import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDirectory = fileURLToPath(
  new URL("../packages/core/src/api/", import.meta.url),
);
const checkOnly = process.argv.includes("--check");
const changed = [];
const approvedDocumentationHosts = new Set([
  "proofstate.ai",
  "opentelemetry.io",
  "developer.mozilla.org",
  "developers.cloudflare.com",
  "vercel.com",
  "deno.land",
  "github.com",
]);

function* typescriptFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* typescriptFiles(path);
    else if (entry.name.endsWith(".ts")) yield path;
  }
}

for (const path of typescriptFiles(apiDirectory)) {
  const original = readFileSync(path, "utf8");
  const normalized = original.replace(/\r\n/g, "\n");

  for (const [, host] of normalized.matchAll(/https?:\/\/([a-z\d.-]+)/gi)) {
    if (!approvedDocumentationHosts.has(host.toLowerCase())) {
      throw new Error(`Unapproved generated API link host in ${path}: ${host}`);
    }
  }

  if (normalized !== original) {
    changed.push(path);
    if (!checkOnly) writeFileSync(path, normalized);
  }
}

const generatedClient = readFileSync(join(apiDirectory, "Client.ts"), "utf8");
for (const required of [
  "export class ProofStateAPIClient",
  "X-ProofState-Sdk-Name",
  "xProofStateSdkName",
  "X-ProofState-Public-Key",
]) {
  if (!generatedClient.includes(required)) {
    throw new Error(`Generated ProofState API client is missing ${required}`);
  }
}

console.log(
  `${checkOnly ? "Checked" : "Normalized"} generated API (${checkOnly ? "format unchanged" : `${changed.length} files changed`}).`,
);

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = join(root, "packages");
const outputDir = join(root, "release-artifacts");
const repository = "JSOCIT-Inc/proofstate-js";
const expectedNames = new Set([
  "@proofstate/browser",
  "@proofstate/client",
  "@proofstate/core",
  "@proofstate/langchain",
  "@proofstate/openai",
  "@proofstate/otel",
  "@proofstate/tracing",
  "@proofstate/vercel-ai-sdk",
]);

function fail(message) {
  throw new Error(message);
}

function run(command, args, options = {}) {
  const pnpmCli = process.env.npm_execpath;
  const usePnpmCli =
    process.platform === "win32" &&
    command === "pnpm" &&
    pnpmCli &&
    existsSync(pnpmCli) &&
    /pnpm\.(?:mjs|cjs|js)$/i.test(pnpmCli);
  return execFileSync(
    usePnpmCli ? process.execPath : command,
    usePnpmCli ? [pnpmCli, ...args] : args,
    {
      cwd: root,
      encoding: "utf8",
      stdio: options.capture ? ["ignore", "pipe", "inherit"] : "inherit",
      shell: process.platform === "win32" && command !== "tar" && !usePnpmCli,
    },
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const mode = process.argv[2];
if (
  process.argv.length !== 3 ||
  !["--pack", "--publish-packed"].includes(mode)
) {
  fail("Usage: node scripts/release-npm.mjs --pack|--publish-packed");
}

const version = readJson(join(root, "package.json")).version;
if (!/^\d+\.\d+\.\d+-(?:alpha|beta|rc)\.\d+$/.test(version)) {
  fail(`Expected a lockstep prerelease version, got ${version}`);
}
if (
  mode === "--pack" &&
  (!existsSync(join(packageRoot, "core", "dist", "index.mjs")) ||
    !readFileSync(
      join(packageRoot, "core", "dist", "index.mjs"),
      "utf8",
    ).includes(`version: "${version}"`))
) {
  fail(`Build the current ${version} SDK before packing`);
}

if (mode === "--publish-packed") {
  const tag = `js-v${version}`;
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    process.env.GITHUB_REPOSITORY !== repository ||
    process.env.GITHUB_REF !== `refs/tags/${tag}` ||
    process.env.RELEASE_CONFIRM !== tag ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_URL ||
    !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  ) {
    fail(
      `Publishing requires the ${repository} GitHub Actions OIDC workflow on tag ${tag}`,
    );
  }
  if (process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) {
    fail(
      "Remove npm tokens; this workflow must publish with OIDC trusted publishing",
    );
  }
}

const packages = readdirSync(packageRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const dir = join(packageRoot, entry.name);
    const manifest = readJson(join(dir, "package.json"));
    return { dir, folder: entry.name, manifest };
  });
if (packages.length !== expectedNames.size) {
  fail(`Expected ${expectedNames.size} packages, found ${packages.length}`);
}

const byName = new Map();
for (const pkg of packages) {
  const {
    name,
    version: packageVersion,
    repository: source,
    publishConfig,
  } = pkg.manifest;
  if (!expectedNames.has(name) || byName.has(name)) {
    fail(`Unexpected or duplicate package: ${name}`);
  }
  if (packageVersion !== version) {
    fail(`${name} version ${packageVersion} differs from root ${version}`);
  }
  if (
    pkg.manifest.private ||
    publishConfig?.access !== "public" ||
    source?.url !== `git+https://github.com/${repository}.git`
  ) {
    fail(
      `${name} publication metadata does not match the public ProofState repository`,
    );
  }
  byName.set(name, pkg);
}

// A package can be published only after all of its internal dependencies.
const pending = new Set(byName.keys());
const order = [];
while (pending.size > 0) {
  const ready = [...pending].sort().filter((name) => {
    const dependencies = byName.get(name).manifest.dependencies ?? {};
    for (const [dependency, range] of Object.entries(dependencies)) {
      if (!dependency.startsWith("@proofstate/")) continue;
      if (!byName.has(dependency) || range !== "workspace:^") {
        fail(
          `${name} has an unknown or non-workspace dependency: ${dependency}@${range}`,
        );
      }
      if (pending.has(dependency)) return false;
    }
    return true;
  });
  if (ready.length === 0) fail("Internal package dependencies contain a cycle");
  for (const name of ready) {
    pending.delete(name);
    order.push(byName.get(name));
  }
}

mkdirSync(outputDir, { recursive: true });
const verifiedTarballs = [];
for (const pkg of order) {
  const tarball = join(outputDir, `proofstate-${pkg.folder}-${version}.tgz`);
  if (mode === "--pack") {
    rmSync(tarball, { force: true });
    run("pnpm", ["--dir", pkg.dir, "pack", "--out", tarball]);
  }
  if (!existsSync(tarball)) fail(`Pack did not create ${tarball}`);

  const packedFiles = run("tar", ["-tf", tarball], { capture: true })
    .trim()
    .split(/\r?\n/)
    .map((file) => file.replace(/^package\//, ""));
  for (const required of [
    "package.json",
    "README.md",
    "LICENSE",
    "dist/index.cjs",
    "dist/index.mjs",
    "dist/index.d.cts",
    "dist/index.d.ts",
  ]) {
    if (!packedFiles.includes(required))
      fail(`${pkg.manifest.name} is missing ${required}`);
  }
  if (
    packedFiles.some(
      (file) =>
        !/^(?:package\.json|README\.md|LICENSE|dist\/[^/]+)$/.test(file),
    )
  ) {
    fail(`${pkg.manifest.name} tarball contains unexpected files`);
  }

  const packedManifest = JSON.parse(
    run("tar", ["-xOf", tarball, "package/package.json"], { capture: true }),
  );
  if (
    packedManifest.name !== pkg.manifest.name ||
    packedManifest.version !== version
  ) {
    fail(`${pkg.manifest.name} packed identity differs from source manifest`);
  }
  for (const [dependency, range] of Object.entries(
    packedManifest.dependencies ?? {},
  )) {
    if (range.startsWith("workspace:")) {
      fail(
        `${pkg.manifest.name} retained unpublished workspace dependency ${dependency}`,
      );
    }
    if (dependency.startsWith("@proofstate/") && range !== `^${version}`) {
      fail(
        `${pkg.manifest.name} has an unexpected packed dependency ${dependency}@${range}`,
      );
    }
  }
  console.log(`Verified ${pkg.manifest.name}@${version}: ${tarball}`);
  verifiedTarballs.push(tarball);
}

if (mode === "--publish-packed") {
  for (const tarball of verifiedTarballs) {
    run("npm", [
      "publish",
      tarball,
      "--access",
      "public",
      "--tag",
      "next",
      "--registry",
      "https://registry.npmjs.org/",
    ]);
  }
}

console.log(
  mode === "--publish-packed"
    ? `Published all ${order.length} packages to the npm next tag.`
    : `Packed all ${order.length} packages in dependency order; nothing was published.`,
);

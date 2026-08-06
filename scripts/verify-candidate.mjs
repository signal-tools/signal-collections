import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const [directoryArgument, expectedVersion] = process.argv.slice(2);

if (directoryArgument === undefined || expectedVersion === undefined) {
	throw new Error("Expected candidate directory and version");
}

const directory = resolve(directoryArgument);
const tarballs = readdirSync(directory).filter((name) => name.endsWith(".tgz"));
const expectedName = `signal-tools-collections-${expectedVersion}.tgz`;

if (tarballs.length !== 1 || tarballs[0] !== expectedName) {
	throw new Error(`Expected only ${expectedName}`);
}

const tarball = join(directory, tarballs[0]);
const checksum = readFileSync(join(directory, "SHA256SUMS"), "utf8").trim().split(/\s+/u);
const actualHash = createHash("sha256").update(readFileSync(tarball)).digest("hex");

if (checksum[0] !== actualHash || basename(checksum.at(-1)) !== expectedName) {
	throw new Error("Candidate checksum does not match");
}

const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
const metadata = JSON.parse(execFileSync("tar", ["-xOf", tarball, "package/package.json"], { encoding: "utf8" }));

if (metadata.name !== "@signal-tools/collections" || metadata.version !== expectedVersion) {
	throw new Error("Candidate package name or version does not match");
}

if (manifest.package !== metadata.name || manifest.version !== metadata.version || manifest.tarball !== expectedName) {
	throw new Error("Candidate manifest does not match the tarball");
}

if (process.env.CANDIDATE_SHA !== undefined && manifest.collectionsSha !== process.env.CANDIDATE_SHA) {
	throw new Error("Candidate manifest SHA does not match its workflow run");
}

const entries = execFileSync("tar", ["-tf", tarball], { encoding: "utf8" }).trim().split(/\r?\n/u);
const allowed = /^package\/(?:package\.json|README\.md|LICENSE\.md|dist\/)/u;

if (entries.some((entry) => !allowed.test(entry))) {
	throw new Error("Candidate contains a file outside the package allowlist");
}

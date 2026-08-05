import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

const [tarballArgument, signalRef, signalSha] = process.argv.slice(2);

if (tarballArgument === undefined || signalRef === undefined || signalSha === undefined) {
	throw new Error("Expected tarball, Signal ref, and Signal SHA");
}

const tarball = resolve(tarballArgument);
const metadata = JSON.parse(execFileSync("tar", ["-xOf", tarball, "package/package.json"], { encoding: "utf8" }));
const manifest = {
	package: metadata.name,
	version: metadata.version,
	tarball: basename(tarball),
	collectionsSha: process.env.GITHUB_SHA ?? null,
	signalRef,
	signalSha,
};

writeFileSync(joinPath(dirname(tarball), "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

function joinPath(directory, name) {
	return `${directory}/${name}`;
}

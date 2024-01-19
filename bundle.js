#!/usr/bin/env node

import fs from "node:fs";
import childProcess from "node:child_process";

const exec = childProcess.execSync;
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const cp = (a, b) => fs.cpSync(a, b, { recursive: true });
const write = (f, d) => fs.writeFileSync(f, d);
const nuke = (d) => fs.rmSync(d, { recursive: true, force: true });
const list = (d) => fs.readdirSync(d, { withFileTypes: true });
const readJson = (f) => JSON.parse(fs.readFileSync(f));
const writeJson = (f, d) => write(f, JSON.stringify(d, null, 2));

async function node() {
	// Setup directory
	nuke("bundle/node");
	mkdir("bundle/node/source");
	mkdir("bundle/node/core");

	// Copy in source and clear out node_modules
	cp("node/", "bundle/node/source");
	cp("core/", "bundle/node/core");
	nuke("bundle/node/source/node_modules");

	// Setup the bundle's package.json
	const project = readJson("package.json");
	const pkg = readJson("node/package.json");
	pkg.version = project.version;
	pkg.exports = {
		".": {
			types: "./types/mod.d.ts",
			import: "./source/mod.js",
		},
		"./*.js": {
			types: "./types/*.d.ts",
			import: "./source/*.js",
		},
	};
	writeJson("bundle/node/package.json", pkg);

	// Setup the bundle's package-lock.json
	const lock = readJson("node/package-lock.json");
	lock.version = project.version;
	lock.packages[""].version = project.version;
	writeJson("bundle/node/package-lock.json", lock);

	writeJson("bundle/node/tsconfig.json", {
		// Change this to match your project
		include: ["source/**/*", "core/**/*"],
		compilerOptions: {
			target: "ESNext",
			module: "Node16",
			moduleResolution: "Node16",
			allowJs: true,
			declaration: true,
			emitDeclarationOnly: true,
			declarationMap: true,
			outDir: "types",
			skipLibCheck: true,
		},
	});
	childProcess.execSync("npx tsc", {
		cwd: new URL("./bundle/node", import.meta.url),
		stdio: "inherit",
	});

	// Copy static files
	cp("README.md", "bundle/node/README.md");
	cp("CHANGELOG.md", "bundle/node/CHANGELOG.md");
}

async function deno() {
	// Setup directory
	nuke("bundle/deno");
	mkdir("bundle/deno/source");
	mkdir("bundle/deno/core");

	// Copy in source files
	cp("deno/", "bundle/deno/source");
	cp("core/", "bundle/deno/core");

	// Create the meta file
	const project = readJson("package.json");
	writeJson("bundle/deno/meta.json", {
		name: "gruber",
		version: project.version,
	});

	// Recreate the entry-point scripts (they re-export their target file in source/)
	const source = list("deno").filter((f) => f.name.endsWith(".ts"));
	for (const stat of source) {
		if (!stat.name.endsWith(".ts")) continue;
		write(`bundle/deno/${stat.name}`, `export * from "./source/${stat.name}"`);
	}

	// Copy static files
	cp("README.md", "bundle/deno/README.md");
	cp("CHANGELOG.md", "bundle/deno/CHANGELOG.md");
}

async function main() {
	await node();
	await deno();
}

main();

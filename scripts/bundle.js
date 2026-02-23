#!/usr/bin/env node

import fs from "node:fs";
import childProcess from "node:child_process";

const exec = childProcess.execSync;
const mkdir = (d) => fs.mkdirSync(d, { recursive: true });
const cp = (a, b) => fs.cpSync(a, b, { recursive: true });
const read = (f) => fs.readFileSync(f, "utf8");
const write = (f, d) => fs.writeFileSync(f, d);
const nuke = (d) => fs.rmSync(d, { recursive: true, force: true });
const list = (d) => fs.readdirSync(d, { withFileTypes: true });
const readJson = (f) => JSON.parse(fs.readFileSync(f));
const writeJson = (f, d) => write(f, JSON.stringify(d, null, 2));

const gruberModules = ["config", "core", "http", "postgres", "testing"];

async function node() {
	// Setup directory
	nuke("bundle/node");

	// Copy in source and clear out node_modules
	cp("config/", "bundle/node/config");
	cp("core/", "bundle/node/core");
	cp("http/", "bundle/node/http");
	cp("node/", "bundle/node/node");
	cp("postgres/", "bundle/node/postgres");
	cp("testing/", "bundle/node/testing");
	nuke("bundle/node/source/node_modules");

	// Setup the bundle's package.json
	const project = readJson("package.json");
	const pkg = readJson("node/package.json");
	pkg.version = project.version;
	pkg.exports = {
		".": {
			import: "./mod.js",
		},
		"./*.js": {
			import: "./*.js",
		},
	};
	writeJson("bundle/node/package.json", pkg);

	await addEntrypointsV2("bundle/node", "node", [
		"express-router.ts",
		"koa-router.ts",
		"polyfill.ts",
	]);

	// Setup the bundle's package-lock.json
	const lock = readJson("node/package-lock.json");
	lock.version = project.version;
	lock.packages[""].version = project.version;
	writeJson("bundle/node/package-lock.json", lock);

	writeJson("bundle/node/tsconfig.json", {
		include: ["*.ts", "**/*.ts"],
		compilerOptions: {
			target: "ESNext",
			module: "NodeNext",
			declaration: true,
			declarationMap: true,
			skipLibCheck: true,
			strict: true,
			rewriteRelativeImportExtensions: true,
			erasableSyntaxOnly: true,
			verbatimModuleSyntax: true,
		},
	});
	exec("npx tsc", {
		cwd: new URL("../bundle/node", import.meta.url),
		stdio: "inherit",
	});

	// Copy static files
	cp("README.md", "bundle/node/README.md");
	cp("CHANGELOG.md", "bundle/node/CHANGELOG.md");
}

async function deno() {
	// Setup directory
	nuke("bundle/deno");

	// Copy in source files
	cp("config/", "bundle/deno/config");
	cp("core/", "bundle/deno/core");
	cp("deno/", "bundle/deno/deno");
	cp("http/", "bundle/deno/http");
	cp("postgres/", "bundle/deno/postgres");
	cp("testing/", "bundle/deno/testing");

	// Create the meta file
	const project = readJson("package.json");
	writeJson("bundle/deno/meta.json", {
		name: "gruber",
		version: project.version,
	});

	// Recreate the entry-point scripts (they re-export their target file in source/)
	// const source = list("deno").filter((f) => f.name.endsWith(".ts"));
	// for (const stat of source) {
	// 	if (!stat.name.endsWith(".ts")) continue;
	// 	write(`bundle/deno/${stat.name}`, `export * from "./source/${stat.name}"`);
	// }
	// await addEntrypoints("deno", "bundle/deno", ".ts", ".ts");

	await addEntrypointsV2("bundle/deno", "deno");

	// Copy static files
	cp("README.md", "bundle/deno/README.md");
	cp("CHANGELOG.md", "bundle/deno/CHANGELOG.md");
}

async function addEntrypoints(
	inputDir,
	outputDir,
	inputExtension,
	outputExtension,
) {
	// Recreate the entry-point scripts (they re-export their target file in source/)
	const source = list(inputDir).filter((f) => f.name.endsWith(inputExtension));
	for (const stat of source) {
		const newName = stat.name.replace(inputExtension, outputExtension);
		write(`${outputDir}/${newName}`, `export * from "./source/${newName}"`);
	}
}

async function addEntrypointsV2(outputDir, moduleName, extraModules = []) {
	// Create a special entry-point at the root of the bundle for any extra modules
	for (const filename of extraModules) {
		write(
			`${outputDir}/${filename}`,
			`export * from "./${moduleName}/${filename}"`,
		);
	}

	// Create the root mod.ts, importing all modules and the platform itself
	const modFile = gruberModules
		.map((module) => `export * from "./${module}/mod.ts"`)
		.concat(`export * from "./${moduleName}/mod.ts"`);

	write(`${outputDir}/mod.ts`, modFile.join("\n") + "\n");
}

async function website() {
	// TODO: alembic doesn't support different output directories yet
	// --output=bundle/website
	exec("npx @11ty/eleventy");
}

async function main() {
	await Promise.all([node(), deno(), website()]);
}

main();

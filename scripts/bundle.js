#!/usr/bin/env node

import fs from "node:fs";
import childProcess from "node:child_process";
import project from "../package.json" with { type: "json" };

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
	for (const mod of gruberModules) cp(`${mod}/`, `bundle/node/${mod}`);
	cp("node/", "bundle/node/node");
	nuke("bundle/node/node/node_modules");

	// Setup the bundle's package-lock.json
	const lock = readJson("node/package-lock.json");
	lock.version = project.version;
	lock.packages[""].version = project.version;
	writeJson("bundle/node/package-lock.json", lock);

	// Transpile TypeScript into JavaScript
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
	for (const mod of gruberModules) cp(`${mod}/`, `bundle/deno/${mod}`);
	cp("deno/", "bundle/deno/deno");

	// Create the meta file
	writeJson("bundle/deno/meta.json", {
		name: project.name,
		version: project.version,
	});

	write("bundle/deno/mod.ts", `export * from "./deno/mod.ts"`);

	// Copy static files
	cp("README.md", "bundle/deno/README.md");
	cp("CHANGELOG.md", "bundle/deno/CHANGELOG.md");
}

async function website() {
	// TODO: alembic doesn't support different output directories yet
	// --output=bundle/website
	exec("npx @11ty/eleventy");
}

async function browser() {
	// Setup directory
	nuke("bundle/browser");

	// Copy in source files
	for (const mod of gruberModules) cp(`${mod}/`, `bundle/browser/${mod}`);
	cp("browser/", "bundle/browser/browser");

	// Transpile TypeScript into JavaScript
	writeJson("bundle/browser/tsconfig.json", {
		include: ["*.ts", "**/*.ts"],
		compilerOptions: {
			target: "ESNext",
			module: "ESNext",
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
		cwd: new URL("../bundle/browser", import.meta.url),
		stdio: "inherit",
	});

	// Copy static files
	cp("README.md", "bundle/browser/README.md");
	cp("CHANGELOG.md", "bundle/browser/CHANGELOG.md");
}

export async function bundle() {
	writeJson("bundle/package.json", {
		name: project.name,
		version: project.version,
		repository: project.repository,
		author: project.author,
		type: "module",
		exports: {
			".": {
				deno: "./deno/deno/mod.js",
				browser: "./browser/browser/mod.js",
				node: "./node/node/mod.js",
			},
			"./*": {
				deno: "./deno/deno/*",
				browser: "./browser/browser/*",
				node: "./node/node/*",
			},
		},
	});

	await Promise.all([node(), deno(), website(), browser()]);
}

if (import.meta.main) await bundle();

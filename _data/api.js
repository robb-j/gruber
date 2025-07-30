import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import createDebug from "debug";
import slugify from "@sindresorhus/slugify";

// import getDependencies from "@11ty/dependency-tree";

import { Project, SyntaxKind } from "ts-morph";

const debug = createDebug("gruber:api");

const entrypoints = [
	"config/mod.ts",
	"core/mod.ts",
	// "deno/mod.ts",
	"http/mod.ts",
	// "node/mod.ts",
	"postgres/mod.ts",
	"testing/mod.ts",
];

async function generate() {
	const project = new Project({
		tsConfigFilePath: "tsconfig.json",
	});

	const output = {};

	for (const entrypoint of entrypoints) {
		const entry = project.getSourceFiles("./" + entrypoint)[0];
		if (!entry) continue;

		output[entrypoint] = {};

		debug(entrypoint);

		for (let symbol of entry.getExportSymbols()) {
			const result = processSymbol(symbol);
			if (!result) continue;

			output[entrypoint][symbol.getEscapedName()] = {
				entrypoint,
				...result,
			};
		}
	}

	return output;
}

/** @param {import("ts-morph").Symbol} symbol */
function processSymbol(symbol, prefix = "") {
	if (symbol.getEscapedName().startsWith("_")) {
		debug("skip: " + symbol.getEscapedName());
		return null;
	}

	if (symbol.isAlias()) symbol = symbol.getAliasedSymbolOrThrow();

	let markdown = [];
	let members = {};

	for (let declaration of symbol.getDeclarations()) {
		// https://github.com/dsherret/ts-morph/issues/901
		if (declaration.getKind() === SyntaxKind.VariableDeclaration) {
			declaration = declaration.getVariableStatementOrThrow();
		}

		// TODO: should this use `Node.isJSDocable(decl)` + `node#getJsDocs()` ?
		for (const range of declaration.getLeadingCommentRanges()) {
			const match = /\/\*\*([\s\S]+)\*\//.exec(range.getText());
			if (!match) continue;
			markdown.push(match[1].replaceAll(/^[ \t]*?@.*$/gm, ""));
		}

		if (
			declaration.getKind() === SyntaxKind.ClassDeclaration ||
			declaration.getKind() === SyntaxKind.InterfaceDeclaration
		) {
			for (const child of symbol.getMembers()) {
				if (child.getValueDeclaration() === undefined) {
					continue; // Skip type-only members, ie generics
				}
				const result = processSymbol(child, symbol.getEscapedName() + "_");
				if (result) members[child.getEscapedName()] = result;
			}
		}

		// if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
		// 	console.log("interface", symbol.getEscapedName());
		// }
	}

	const { content, tags } = processMarkdown(markdown.join("\n\n"));

	if (symbol.getValueDeclaration() === undefined) {
		tags.type = "true";
	}

	// if ((!content.trim() && Object.keys(tags).length === 0) || tags.internal) {
	// if (!content.trim() && Object.keys(tags).length === 0) {
	if (!content.trim() || tags.hidden) {
		return null;
	}

	return {
		id: prefix + symbol.getEscapedName(),
		name: symbol.getEscapedName(),
		content,
		tags,
		members,
	};
}

/** @param {string} text */
function processMarkdown(text) {
	let lines = [];
	let tags = {};

	const tagish = /^@([\w-_]+)(?:\s(.+))?$/;

	for (const line of text.split("\n")) {
		const text = line.replace(/^\s*\*\s?/, "");

		const tag = tagish.exec(text);
		if (tag) tags[tag[1]] = tag[2] || "true";
		else lines.push(text);
	}

	// TODO: this @link only works for same-file links
	const content = lines
		.join("\n")
		.trim()
		.replace(/{@link\s+(\S+)\s*}/g, (...match) => replaceLink(match));

	tags.group ??= "Miscellaneous";

	return { content, tags };
}

function replaceLink(match) {
	const id = slugify(match[1].toLowerCase());
	return `[${match[1]}](#${id})`;
}

export default async function () {
	// try {
	// 	const cached = JSON.parse(
	// 		await fs.promises.readFile(
	// 			new URL("../.cache/api.json", import.meta.url),
	// 			"utf8",
	// 		),
	// 	);
	// 	return cached;
	// } catch {}

	const data = await generate();
	// await fs.promises.mkdir(new URL("../.cache/", import.meta.url), {
	// 	recursive: true,
	// });
	// await fs.promises.writeFile(
	// 	new URL("../.cache/api.json", import.meta.url),
	// 	JSON.stringify(data),
	// );
	return data;
}

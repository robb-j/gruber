import slugify from "@sindresorhus/slugify";
import createDebug from "debug";
import { Project, SyntaxKind } from "ts-morph";

const debug = createDebug("gruber:api");

const entrypoints = [
	"config/mod.ts",
	"core/mod.ts",
	"deno/mod.ts",
	"http/mod.ts",
	"node/mod.ts",
	"postgres/mod.ts",
	"testing/mod.ts",
];

async function generate() {
	const project = new Project({
		tsConfigFilePath: "tsconfig.json",
	});

	const output = {};

	for (const entrypoint of entrypoints) {
		output[entrypoint] = {};

		const source = project.getSourceFiles("./" + entrypoint)[0];
		if (!source) {
			debug("[ERROR] entry not found or failed to load", entrypoint);
			continue;
		}

		debug(entrypoint);

		for (let symbol of source.getExportSymbols()) {
			// for (const doc of processSymbol(symbol)) {
			// 	debug("found", doc);
			// }
			// const result = processSymbol(symbol);
			// if (!result) continue;

			const doc = processSymbol(symbol);
			if (!doc) continue;
			debug("found", doc.id);

			output[entrypoint][doc.name] = {
				entrypoint,
				...doc,
			};
		}
	}

	return output;
}

/** @param {import("ts-morph").Symbol} symbol */
function processSymbol(symbol, prefix = "") {
	if (symbol.isAlias()) symbol = symbol.getAliasedSymbolOrThrow();

	const doc = getSymbolDocumentation(symbol, prefix);
	const children = {};

	if (!doc) {
		debug("skip: " + symbol.getEscapedName());
		return null;
	}

	for (let declaration of symbol.getDeclarations()) {
		const classDecl = declaration.asKind(SyntaxKind.ClassDeclaration);

		if (classDecl) {
			const className = classDecl.getSymbol().getEscapedName();
			for (const member of classDecl.getInstanceMembers()) {
				const child = processSymbol(
					member.getSymbol(),
					prefix + symbol.getEscapedName() + "#",
				);
				if (!child) continue;
				// children.push(child);
				children[child.name] = child;
			}

			for (const member of classDecl.getStaticMembers()) {
				const child = processSymbol(
					member.getSymbol(),
					prefix + symbol.getEscapedName() + ".",
				);
				if (!child) continue;
				// children.push(child);
				children[className + "." + child.name] = child;
			}
		}

		const ifaceDecl = declaration.asKind(SyntaxKind.InterfaceDeclaration);
		if (ifaceDecl) {
			// const ifaceName = ifaceDecl.getSymbol().getEscapedName();
			for (const member of ifaceDecl.getMembers()) {
				const child = processSymbol(
					member.getSymbol(),
					prefix + symbol.getEscapedName() + "#",
				);
				if (!child) continue;
				children[child.name] = child;
			}
		}
	}

	return {
		...getSymbolDocumentation(symbol, prefix),
		children,
	};
}

/** @param {import("ts-morph").Symbol} symbol */
function getSymbolDocumentation(symbol, prefix = "") {
	if (symbol.isAlias()) symbol = symbol.getAliasedSymbolOrThrow();

	let markdown = [];

	for (let declaration of symbol.getDeclarations()) {
		// https://github.com/dsherret/ts-morph/issues/901
		if (declaration.getKind() === SyntaxKind.VariableDeclaration) {
			declaration = declaration.getVariableStatementOrThrow();
		}

		for (const range of declaration.getLeadingCommentRanges()) {
			const match = /\/\*\*([\s\S]+)\*\//.exec(range.getText());
			if (!match) continue;
			markdown.push(match[1].replaceAll(/^[ \t]*?@.*$/gm, ""));
		}
	}

	const { content, tags } = processMarkdown(markdown.join("\n\n"));

	if (symbol.getValueDeclaration() === undefined) {
		tags.type = "true";
	}

	const name = tags.name ?? symbol.getEscapedName();

	// if ((!content.trim() && Object.keys(tags).length === 0) || tags.internal) {
	// if (!content.trim() && Object.keys(tags).length === 0) {
	if (!content.trim() || tags.ignore || name.startsWith("_")) {
		return null;
	}

	return {
		id: prefix + symbol.getEscapedName(),
		name: name,
		content,
		tags,
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

export default generate;

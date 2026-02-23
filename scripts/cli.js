#!/usr/bin/env node

import process from "node:process";
import fs from "node:fs";

const [command, ...args] = process.argv.slice(2);

const usage = `
usage:
	./scripts/cli.js <command>

commands:
	gep <name> [date]

options:
	--help
	--dryRun
`;

const options = {
	help: process.argv.includes("--help"),
	dryRun: process.argv.includes("--dryRun"),
};

if (options.help) {
	console.log(usage);
	process.exit();
}

function exitWithError(...message) {
	console.error(...message);
	process.exit(1);
}

function proposal(name = "", rawDate = Date.now()) {
	if (!name) {
		exitWithError("<name> is required");
	}
	const date = new Date(rawDate);

	const index = fs.readFileSync(
		new URL("../proposals/index.md", import.meta.url),
		"utf8",
	);

	const template = /```(?<body>[\s\S]+)```/gm.exec(index).groups.body;
	const filename = new URL(
		"../proposals/sketches/" + name.toLowerCase().replace(/\s+/, "-") + ".md",
		import.meta.url,
	);

	const body = template
		.replaceAll("{PROPOSAL_NAME}", name)
		.replaceAll("{CURRENT_DATE}", date.toISOString().slice(0, 10));

	if (options.dryRun) {
		console.log("new GEP", filename, body);
	} else {
		fs.writeFileSync(filename, body);
	}
}

if (command === "gep") proposal(...args);
else exitWithError("Unknown command\n", usage);

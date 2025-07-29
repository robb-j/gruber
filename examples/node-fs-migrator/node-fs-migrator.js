// A toy Node.js filesystem-based migrator:
import fs from "node:fs/promises";
import { Migrator } from "gruber";

async function getRecords() {
	try {
		return JSON.parse(await fs.readFile("migrations.json", "utf8"));
	} catch {
		return [];
	}
}

async function getDefinitions() {
	return [
		defineMigration({
			up: (fs) => fs.writeFile("hello.txt", "Hello, World!"),
			down: (fs) => fs.unlink("hello.txt"),
		}),
		defineMigration({
			up: (fs) => fs.writeFile("version.json", '{ "version": "0.1" }'),
			down: (fs) => fs.unlink("version.json"),
		}),
	];
}

async function execute(definition, direction) {
	let records = await getRecords();

	if (direction === "up") {
		await definition.up(fs);
		records.push(definition.name);
	}
	if (direction === "down") {
		await definition.down(fs);
		records = records.filter((n) => n !== definition.name);
	}
	fs.writeFile("./migrations.json", JSON.stringify(records));
}

const migrator = new Migrator({ getRecords, getDefinitions, execute });

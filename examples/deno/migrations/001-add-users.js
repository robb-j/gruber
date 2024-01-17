import { defineMigration } from "../../../deno/mod.ts";
// import { defineMigration } from "../../../bundle/deno/mod.ts";

export default defineMigration({
	async up(sql) {
		await sql`
      CREATE TABLE "users" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP NOT NULL DEFAULT NOW(),
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `;
	},
	async down(sql) {
		await sql`
      DROP TABLE "users"
    `;
	},
});

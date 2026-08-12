import { eleventyAlembic } from "@openlab/alembic/11ty.cjs";
import NavigationPlugin from "@11ty/eleventy-navigation";
import SyntaxHighlightPlugin from "@11ty/eleventy-plugin-syntaxhighlight";
import {
	HtmlBasePlugin,
	IdAttributePlugin,
	RenderPlugin,
} from "@11ty/eleventy";

import pkg from "./package.json" with { type: "json" };

const shortDate = new Intl.DateTimeFormat("en-GB", { dateStyle: "short" });

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyAlembic, { useLabcoat: true });
	eleventyConfig.addPlugin(NavigationPlugin);
	// eleventyConfig.addPlugin(IdAttributePlugin, {
	// 	// checkDuplicates: false,
	// });
	eleventyConfig.addPlugin(RenderPlugin);
	eleventyConfig.addPlugin(SyntaxHighlightPlugin);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPassthroughCopy({ _assets: "assets" });
	eleventyConfig.addGlobalData("pkg", pkg);
	eleventyConfig.addWatchTarget("**/*.ts");
	eleventyConfig.addFilter("entries", (v) => Object.entries(v));
	eleventyConfig.addFilter("keys", (v) => Object.keys(v));
	eleventyConfig.addFilter("newestFirst", (arr) =>
		arr.toSorted((a, b) => b.date - a.date),
	);
	eleventyConfig.addFilter("shortDate", (v) => shortDate.format(v));
	eleventyConfig.addFilter("relink", (text, prefix = "") => {
		return text.replace(/{@link\s+?(?<name>\w+)\s*?}/g, (_, name) => {
			return `<a href="#${prefix}${name.toLowerCase()}">${name}</a>`;
		});
	});
}

export const config = {
	dir: {
		layouts: "_includes/layouts",
		output: "bundle/website",
	},
	markdownTemplateEngine: "njk",
};

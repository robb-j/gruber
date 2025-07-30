import { eleventyAlembic } from "@openlab/alembic/11ty.cjs";
import NavigationPlugin from "@11ty/eleventy-navigation";
import SyntaxHighlightPlugin from "@11ty/eleventy-plugin-syntaxhighlight";
import {
	HtmlBasePlugin,
	IdAttributePlugin,
	RenderPlugin,
} from "@11ty/eleventy";

import pkg from "./package.json" with { type: "json" };

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyAlembic, { useLabcoat: true });
	eleventyConfig.addPlugin(NavigationPlugin);
	eleventyConfig.addPlugin(IdAttributePlugin, {
		// checkDuplicates: false,
	});
	eleventyConfig.addPlugin(RenderPlugin);
	eleventyConfig.addPlugin(SyntaxHighlightPlugin);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPassthroughCopy({ _assets: "assets" });
	eleventyConfig.addGlobalData("pkg", pkg);
	eleventyConfig.addWatchTarget("**/*.ts");
	eleventyConfig.addFilter("entries", (v) => Object.entries(v));
	eleventyConfig.addFilter("keys", (v) => Object.keys(v));
}

export const config = {
	dir: {
		layouts: "_includes/layouts",
		output: "bundle/website",
	},
	markdownTemplateEngine: "njk",
};

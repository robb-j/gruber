import { eleventyAlembic } from "@openlab/alembic/11ty.cjs";
import eleventyNavigation from "@11ty/eleventy-navigation";
import eleventySyntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import { HtmlBasePlugin } from "@11ty/eleventy";

import markdownItAnchor from "markdown-it-anchor";

import pkg from "./package.json" with { type: "json" };

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default function (eleventyConfig) {
	eleventyConfig.addPlugin(eleventyAlembic, { useLabcoat: true });
	eleventyConfig.addPlugin(eleventyNavigation);
	eleventyConfig.addPlugin(eleventySyntaxHighlight);
	eleventyConfig.addPlugin(HtmlBasePlugin);
	eleventyConfig.addPassthroughCopy({ _assets: "assets" });
	eleventyConfig.amendLibrary("md", (md) => md.use(markdownItAnchor));
	eleventyConfig.addGlobalData("pkg", pkg);
	// eleventyConfig.addPassthroughCopy({
	// 	"node_modules/dracula-prism/dist/css/dracula-prism-old.min.css":
	// 		"assets/prism.css",
	// });
}

export const config = {
	dir: {
		layouts: "_includes/layouts",
		output: "bundle/website",
	},
	markdownTemplateEngine: "njk",
};

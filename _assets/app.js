class EsmInfo extends HTMLElement {
	static get observedAttributes() {
		return ["endpoint", "gruber"];
	}

	// The endpoint that returns the bucket XML
	// the bucked must have top-level keys like "name@version/..."
	get endpoint() {
		return this.getAttribute("endpoint") ?? "https://esm.r0b.io/";
	}

	// The name of the repo to look for
	get repo() {
		return this.getAttribute("repo") ?? "gruber";
	}

	// The website URL to find more information
	get website() {
		return (
			this.getAttribute("website") ??
			"https://github.com/robb-j/gruber/releases"
		);
	}

	async render() {
		try {
			// Fetch the S3 index XML and parse it as XML
			const res = await fetch(this.endpoint);

			/** @type {XMLDocument} */
			const data = new DOMParser().parseFromString(
				await res.text(),
				"application/xml",
			);

			// Get out the results element and start parsing the contents tags
			const bucket = data.getElementsByTagName("ListBucketResult")[0];
			const results = [];

			// Pick out the contents tabs which are the root-level folders that follow
			// the format "name@version", also exclude any from other repos
			for (const contents of bucket.getElementsByTagName("Contents")) {
				const key = contents.getElementsByTagName("Key")[0].textContent;
				const match = /^(.+?)@([\w\d.-]+?)\/$/.exec(key);
				if (!match || match[1] !== this.repo) continue;

				const [name, version] = match.slice(1);
				results.push({ name, version });
			}

			// Sort the versions, newest first
			results.sort((a, b) => b.version.localeCompare(a.version));

			// Render the results as HTML
			this.innerHTML = `
				<details class="flow">
					<summary>Show versions</summary>
					<cluster-layout space="s-1">
						${results.map((r) => `<code>${r.version}</code>`).join("\n")}
					</cluster-layout>
					<p>
						<a href="${this.website}">Show all versions</a>
					</p>
				</details>
			`;
		} catch (error) {
			this.innerHTML = `<pre>Failed to fetch ESM info: ${error.message}</pre>`;
		}
	}

	connectedCallback() {
		this.render();
	}

	attributeChangedCallback() {
		this.render();
	}
}

customElements.define("esm-info", EsmInfo);

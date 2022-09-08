import type * as postcss from "postcss"
import type parser from "postcss-selector-parser"

export interface selectorParser {
	(): parser.Processor<never>
	<Transform>(processor: parser.AsyncProcessor<Transform>): parser.Processor<Transform, never>
	(processor: parser.AsyncProcessor<void>): parser.Processor<never, never>
	<Transform>(processor: parser.SyncProcessor<Transform>): parser.Processor<Transform>
	(processor: parser.SyncProcessor<void>): parser.Processor<never>
	<Transform>(
		processor?: parser.SyncProcessor<Transform> | parser.AsyncProcessor<Transform>,
	): parser.Processor<Transform>
	attribute: typeof parser.attribute
	pseudo: typeof parser.pseudo
}

interface updateClass {
	(
		classname: string,
		options: {
			withAttr?(className: string, attr: string): string
			withPseudo(className: string, pseudo: string): string
		},
	): string | null | undefined
}

interface transformOptions {
	wrap?(): postcss.Node
	withRule?(rule: postcss.Rule): void
}

export interface ContextModule {
	plugin: Tailwind.createPlugin
	postcss: postcss.Postcss
	prefixSelector(prefix: string, selector: string): string
	updateLastClasses(selectors: string, updateClass: updateClass): string
	updateAllClasses(selectors: string, updateClass: updateClass): string
	transformAllSelectors(transformSelector: updateClass, options?: transformOptions): Tailwind.Generator
	transformAllClasses(transformClass: updateClass, options?: transformOptions): Tailwind.Generator
	transformLastClasses(transformClass: updateClass, options?: transformOptions): Tailwind.Generator
}

export function twin(context: ContextModule): Tailwind.ConfigJS {
	const {
		plugin,
		postcss,
		transformAllSelectors,
		prefixSelector,
		updateLastClasses,
		updateAllClasses,
		transformLastClasses,
	} = context
	return {
		plugins: [
			// @media (prefers-color-scheme: light)
			plugin(({ config, addVariant }) => {
				let mode = config("darkMode", "media")
				if (mode === false) {
					mode = "media"
				}

				if (mode === "class") {
					addVariant(
						"light",
						transformAllSelectors(selector => {
							const variantSelector = updateLastClasses(
								selector,
								className => `light${config("separator")}${className}`,
							)

							if (variantSelector === selector) {
								return null
							}

							const darkSelector = prefixSelector(config("prefix"), `.light`)

							return `${darkSelector} ${variantSelector}`
						}),
					)
				} else if (mode === "media") {
					addVariant(
						"light",
						transformLastClasses((className: string) => `light${config("separator")}${className}`, {
							wrap: () =>
								postcss.atRule({
									name: "media",
									params: "(prefers-color-scheme: light)",
								}),
						}),
					)
				}
			}),
			plugin(({ config, addVariant, addUtilities }) => {
				addUtilities({
					".content": {
						content: '""',
					},
				})

				const separator = config("separator")

				addPseudo("placeholder", "::placeholder")

				addMedia("screen", "screen")
				addMedia("print", "print")
				addMedia("landscape", "(orientation: landscape)")
				addMedia("portrait", "(orientation: portrait)")
				addMedia("any-pointer-none", "(any-pointer: none)")
				addMedia("any-pointer-fine", "(any-pointer: fine)")
				addMedia("any-pointer-coarse", "(any-pointer: coarse)")
				addMedia("pointer-none", "(pointer: none)")
				addMedia("pointer-fine", "(pointer: fine)")
				addMedia("pointer-coarse", "(pointer: coarse)")
				addMedia("any-hover", "(any-hover: hover)")
				addMedia("any-hover-none", "(any-hover: none)")
				addMedia("can-hover", "(hover: hover)")
				addMedia("cant-hover", "(hover: none)")

				addPseudo("not-first", ":not(:first-child)")
				addPseudo("not-last", ":not(:last-child)")
				addPseudo("not-only", ":not(:only-child)")
				addPseudo("not-first-of-type", ":not(:first-of-type)")
				addPseudo("not-last-of-type", ":not(:last-of-type)")
				addPseudo("not-only-of-type", ":not(:only-of-type)")
				addPseudo("not-checked", ":not(:checked)")
				addPseudo("not-disabled", ":not(:disabled)")

				addPseudo("even-of-type", ":nth-of-type(even)")
				addPseudo("odd-of-type", ":nth-of-type(odd)")
				addPseudo("enabled", ":enabled")
				addPseudo("link", ":link")
				addPseudo("optional", ":optional")
				addPseudo("read-write", ":read-write")

				addVariant(
					"hocus",
					transformAllSelectors(selectors => {
						return [
							updateAllClasses(selectors, (className, { withPseudo }) => {
								return withPseudo(`hocus${separator}${className}`, ":hover")
							}),
							updateAllClasses(selectors, (className, { withPseudo }) => {
								return withPseudo(`hocus${separator}${className}`, ":focus")
							}),
						].join(", ")
					}),
				)

				addSelector("all", "*")
				addSelector("sibling", "~ *")
				addSelector("svg", "svg")
				addSelector("all-child", "> *")

				const groupVariantName = `group-hocus`
				const groupMarker = prefixSelector(config("prefix"), ".group")

				addVariant(
					groupVariantName,
					transformAllSelectors(selector => {
						const variantSelector = updateAllClasses(selector, className => {
							if (`.${className}` === groupMarker) return className
							return `${groupVariantName}${separator}${className}`
						})

						return [
							`${groupMarker}:hover ${variantSelector}`,
							`${groupMarker}:focus ${variantSelector}`,
						].join(", ")
					}),
				)

				const peerVariantName = `peer-hocus`
				const peerMarker = prefixSelector(config("prefix"), ".peer")
				addVariant(
					peerVariantName,
					transformAllSelectors(selector => {
						const variantSelector = updateAllClasses(selector, className => {
							if (`.${className}` === peerMarker) return className
							return `${peerVariantName}${config("separator")}${className}`
						})
						return [
							`${peerMarker}:hover ~ ${variantSelector}`,
							`${peerMarker}:focus ~ ${variantSelector}`,
						].join(", ")
					}),
				)

				// Glide Selectors
				addSelector("gp-sm", ".gp-sm &")
				addSelector("gp-md", ".gp-md &")
				addSelector("gp-lg", ".gp-lg &")
				addSelector("gp-xl", ".gp-xl &")
				addSelector("gp-2xl", ".gp-2xl &")

				addSelector("page-sm", ".page-sm &")
				addSelector("page-md", ".page-md &")
				addSelector("page-lg", ".page-lg &")
				addSelector("page-xl", ".page-xl &")
				addSelector("page-2xl", ".page-2xl &")

				addSelector("page-hover", ".is-hoverable &:hover")
				addSelector("no-hover", ":not(.is-hoverable &)")
				addSelector("group-page-hover", ".is-hoverable .group:hover &")

				return

				function addMedia(variant: string, value: string) {
					addVariant(
						variant,
						transformLastClasses(className => `${variant}${config("separator")}${className}`, {
							wrap: () =>
								postcss.atRule({
									name: "media",
									params: value,
								}),
						}),
					)
				}

				function addPseudo(variant: string, value: string) {
					addVariant(
						variant,
						transformAllSelectors(selectors => {
							return updateAllClasses(selectors, (className, { withPseudo }) => {
								return withPseudo(`${variant}${config("separator")}${className}`, value)
							})
						}),
					)
				}

				function addSelector(variant: string, value: string) {
					addPseudo(variant, " " + value)
				}
			}),
		],
	}
}

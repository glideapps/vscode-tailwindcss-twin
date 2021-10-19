import { ExtractedToken, ExtractedTokenKind, TextDocument } from "@/extractors"
import { defaultLogger as console } from "@/logger"
import parseThemeValue from "@/parseThemeValue"
import { transformSourceMap } from "@/sourcemap"
import * as parser from "@/twin-parser"
import { cssDataManager, getEntryDescription } from "@/vscode-css-languageservice"
import vscode from "vscode"
import type { ServiceOptions } from "."
import { getDescription, getReferenceLinks } from "./referenceLink"
import type { TailwindLoader } from "./tailwind"

export default async function hover(
	result: ExtractedToken | undefined,
	document: TextDocument,
	position: unknown,
	state: TailwindLoader,
	options: ServiceOptions,
	tabSize: number,
): Promise<vscode.Hover | undefined> {
	if (!result) return undefined

	return doHover(result)

	function doHover(result: ExtractedToken) {
		try {
			const { token, kind } = result
			if (kind === ExtractedTokenKind.TwinTheme) {
				const range = new vscode.Range(document.positionAt(token.start), document.positionAt(token.end))
				return resolveThemeValue({ kind, range, token, state, options })
			} else if (kind === ExtractedTokenKind.TwinScreen) {
				const range = new vscode.Range(document.positionAt(token.start), document.positionAt(token.end))
				return resolveScreenValue({ kind, range, token, state, options })
			} else {
				const selection = parser.hover({
					text: token.value,
					position: document.offsetAt(position) - token.start,
					separator: state.separator,
				})
				if (!selection) return undefined

				const { start, end } = selection.target
				let value = selection.target.value

				const range = new vscode.Range(
					document.positionAt(token.start + start),
					document.positionAt(token.start + end),
				)

				if (selection.type === parser.HoverResultType.CssProperty) {
					const prop = selection.prop?.toKebab() ?? ""
					const value = selection.value?.value ?? ""
					const important = selection.important

					const header = new vscode.MarkdownString()
					if (options.references) {
						const entry = cssDataManager.getProperty(prop)
						if (entry) {
							const desc = getEntryDescription(entry, true)
							if (desc) {
								header.appendMarkdown(desc.value)
							}
						}
					}

					const code = state.tw.renderCssProperty({
						prop,
						value,
						important,
						rootFontSize: options.rootFontSize,
						tabSize,
					})
					const codes = new vscode.MarkdownString()
					if (code) codes.appendCodeblock(code, "scss")

					if (!header.value && !codes.value) return undefined

					return {
						range,
						contents: [header, codes],
					}
				}

				if (kind !== ExtractedTokenKind.Twin) return undefined

				if (selection.type === parser.HoverResultType.ArbitraryVariant) {
					const header = new vscode.MarkdownString("**arbitrary variant**")
					const codes = new vscode.MarkdownString()
					let code = selection.target.value.slice(1, -1)
					if (!code) {
						return {
							range,
							contents: [header, codes],
						}
					}
					code = state.tw.renderArbitraryVariant(code, tabSize)
					if (code) codes.appendCodeblock(code, "scss")
					return {
						range,
						contents: [header, codes],
					}
				}

				if (selection.type === parser.HoverResultType.Variant) {
					const header = new vscode.MarkdownString()
					if (options.references) {
						const desc =
							state.tw.screens.indexOf(value) === -1 ? getDescription(value) : getDescription("screens")
						if (typeof desc === "string") {
							header.appendMarkdown(desc ? desc + "\n" : "twin.marco" + "\n")
						}

						const links = getReferenceLinks(value)

						if (links.length > 0) {
							header.appendMarkdown("\n")
							header.appendMarkdown(links.map(ref => `[Reference](${ref.url}) `).join("\n"))
						}
					}

					const code = state.tw.renderVariant(value, tabSize)
					const codes = new vscode.MarkdownString()
					if (code) codes.appendCodeblock(code, "scss")

					if (!header.value && !codes.value) return undefined

					return {
						range,
						contents: [header, codes],
					}
				}

				const header = new vscode.MarkdownString()
				if (options.references) {
					const plugin = state.tw.getPlugin(value)
					let name = state.tw.trimPrefix(value)
					if (plugin) name = plugin.name
					if (name) {
						const desc = getDescription(name)
						if (typeof desc === "string") {
							header.appendMarkdown(desc ? desc + "\n" : "twin.marco" + "\n")
						}

						const links = getReferenceLinks(name)
						if (links.length > 0) {
							header.appendMarkdown("\n")
							header.appendMarkdown(links.map(ref => `[Reference](${ref.url}) `).join("\n"))
						}
					}
				}

				let code = state.tw.renderClassname({
					classname: value,
					important: selection.important,
					rootFontSize: options.rootFontSize,
					tabSize,
				})

				if (!code) {
					const i = value.lastIndexOf("/")
					const n = value.charCodeAt(i + 1)
					if (i !== -1 && (n === 91 || (n >= 48 && n <= 57))) {
						value = value.slice(0, i)
					}
					code = state.tw.renderClassname({
						classname: value,
						important: selection.important,
						rootFontSize: options.rootFontSize,
						tabSize,
					})
				}

				const codes = new vscode.MarkdownString()
				if (code) codes.appendCodeblock(code, "css")

				if (!header.value && !codes.value) return undefined

				return {
					range,
					contents: [header, codes],
				}
			}
		} catch (error) {
			const err = error as Error
			if (err.stack) err.stack = transformSourceMap(options.serverSourceMapUri.fsPath, err.stack)
			console.error(err)
			console.error("hover failed.")
		}

		return undefined
	}
}

function resolveThemeValue({
	range,
	token,
	state,
}: {
	kind: ExtractedTokenKind
	range: vscode.Range
	token: parser.Token
	state: TailwindLoader
	options: ServiceOptions
}): vscode.Hover | undefined {
	const result = parseThemeValue(token.value)
	if (result.errors.length > 0) {
		return undefined
	}

	const value = state.tw.getTheme(result.keys(), true)

	const markdown = new vscode.MarkdownString()

	if (typeof value === "string") {
		markdown.value = `\`\`\`txt\n${value}\n\`\`\``
	} else if (value instanceof Array) {
		markdown.value = `\`\`\`txt\n${value.join(", ")}\n\`\`\``
	} else if (value) {
		markdown.value = `\`\`\`js\n${value.toString?.() ?? typeof value}\n\`\`\``
	}

	return {
		range,
		contents: [markdown],
	}
}

function resolveScreenValue({
	range,
	token,
	state,
}: {
	kind: ExtractedTokenKind
	range: vscode.Range
	token: parser.Token
	state: TailwindLoader
	options: ServiceOptions
}): vscode.Hover | undefined {
	const value = state.tw.getTheme(["screens", token.value])
	if (value == undefined) {
		return
	}

	const markdown = new vscode.MarkdownString()

	if (typeof value === "string") {
		markdown.value = `\`\`\`css\n@media (min-width: ${value})\n\`\`\``
	} else if (value instanceof Array) {
		markdown.value = `\`\`\`txt\n${value.join(", ")}\n\`\`\``
	} else if (value) {
		markdown.value = `\`\`\`js\n${value.toString?.() ?? typeof value}\n\`\`\``
	}

	return {
		range,
		contents: [markdown],
	}
}

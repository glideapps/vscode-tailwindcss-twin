import chroma from "chroma-js"
import { serializeError } from "serialize-error"
import type { IPropertyData } from "vscode-css-languageservice"
import * as lsp from "vscode-languageserver"
import { TextDocument } from "vscode-languageserver-textdocument"
import { canMatch, PatternKind } from "~/common/ast"
import { completeElement } from "~/common/findElement"
import { findThemeValueKeys } from "~/common/parseThemeValue"
import * as tw from "~/common/token"
import type { Tailwind } from "~/tailwind"
import type { ClassNameItem } from "~/tailwind/twin"
import type { ServiceOptions } from "~/twLanguageService"
import { arbitraryValueMapping } from "./arbitraryValue"
import { getCompletionsForDeclarationValue, getUnitProposals } from "./completionCssPropertyValue"
import { cssDataManager } from "./cssData"

export interface InnerData {
	type:
		| "screen"
		| "utilities"
		| "components"
		| "color"
		| "variant"
		| "theme"
		| "cssPropertyName"
		| "cssPropertyValue"
		| "arbitraryValue"
	uri: string
	entry?: IPropertyData
}

function doReplace(
	list: lsp.CompletionItem[],
	document: TextDocument,
	offset: number,
	start: number,
	end: number,
	handler: (item: lsp.CompletionItem) => string,
) {
	for (let i = 0; i < list.length; i++) {
		const item = list[i]
		item.textEdit = lsp.TextEdit.replace(
			{
				start: document.positionAt(offset + start),
				end: document.positionAt(offset + end),
			},
			handler(item),
		)
	}
}

function doInsert(
	list: lsp.CompletionItem[],
	document: TextDocument,
	offset: number,
	start: number,
	handler: (item: lsp.CompletionItem) => string,
) {
	for (let i = 0; i < list.length; i++) {
		const item = list[i]
		item.textEdit = lsp.TextEdit.insert(document.positionAt(offset + start), handler(item))
	}
}

export default function completion(
	document: TextDocument,
	position: lsp.Position,
	state: Tailwind,
	options: ServiceOptions,
): lsp.CompletionList | undefined {
	try {
		const result = canMatch(document, position, false, options.jsxPropImportChecking)
		if (!result) {
			return undefined
		}
		const index = document.offsetAt(position)
		const { kind, token } = result
		if (kind === PatternKind.TwinTheme) {
			const list = twinThemeCompletion(document, index, token, state)
			for (let i = 0; i < list.items.length; i++) {
				list.items[i].data.uri = document.uri
			}
			return list
		} else {
			const list = twinCompletion(document, index, token, kind, state, options)
			for (let i = 0; i < list.items.length; i++) {
				list.items[i].data.uri = document.uri
			}
			return list
		}
	} catch (err) {
		console.log(serializeError(err))
		return undefined
	}
}

function twinCompletion(
	document: TextDocument,
	index: number,
	match: tw.Token,
	kind: PatternKind,
	state: Tailwind,
	options: ServiceOptions,
): lsp.CompletionList {
	const [offset, , input] = match
	const position = index - offset
	const suggestion = completeElement({ input, position, separator: state.separator })
	const isIncomplete = false

	const variants = variantsCompletion(document, input, position, offset, kind, suggestion, state, options)
	const utilties = utiltiesCompletion(document, input, position, offset, kind, suggestion, state, options)
	const shortcss = shortcssCompletion(document, input, position, offset, kind, suggestion, state, options)
	const arbitrary = arbitraryValueCompletion(document, input, position, offset, kind, suggestion, state, options)

	return lsp.CompletionList.create([...variants, ...utilties, ...shortcss, ...arbitrary], isIncomplete)
}

function variantsCompletion(
	document: TextDocument,
	input: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof completeElement>,
	state: Tailwind,
	{ preferVariantWithParentheses }: ServiceOptions,
) {
	const [a, b, value] = suggestion.token?.token ?? tw.createToken(0, 0, "")
	const nextCharacter = input.slice(position, position + 1)
	const userVariants = suggestion.variants.texts
	let variantItems: lsp.CompletionItem[] = []
	let variantEnabled = true

	if (suggestion.token) {
		switch (suggestion.token.kind) {
			case tw.TokenKind.Comment:
				variantEnabled = false
				break
		}
	}

	if (variantEnabled) {
		const variantFilter = state.twin.getSuggestedVariantFilter(userVariants)
		variantItems = state.twin.variants
			.filter(([label]) => variantFilter(label))
			.map<lsp.CompletionItem>(([label]) => {
				const bp = state.twin.screens.get(label)
				if (bp != undefined) {
					return {
						label: label + state.separator,
						sortText: bp.toString().padStart(5, " "),
						kind: lsp.CompletionItemKind.Module,
						data: { type: "screen" },
						command: {
							title: "Suggest",
							command: "editor.action.triggerSuggest",
						},
					}
				} else if (label === "placeholder") {
					return {
						label: label + state.separator,
						sortText: "*" + label,
						kind: lsp.CompletionItemKind.Method,
						data: { type: "variant" },
						command: {
							title: "Suggest",
							command: "editor.action.triggerSuggest",
						},
					}
				} else {
					const f = state.twin.isDarkLightMode(label)
					return {
						label: label + state.separator,
						sortText: f ? "*" + label : "~~~:" + label,
						kind: f ? lsp.CompletionItemKind.Color : lsp.CompletionItemKind.Method,
						data: { type: "variant" },
						command: {
							title: "Suggest",
							command: "editor.action.triggerSuggest",
						},
					}
				}
			})
	}

	const next = input.slice(b, b + 1)
	const nextNotSpace = next != "" && suggestion.token != undefined && next.match(/[\s)]/) == null

	if (preferVariantWithParentheses) {
		if (nextCharacter !== "(") {
			for (let i = 0; i < variantItems.length; i++) {
				const item = variantItems[i]
				item.insertTextFormat = lsp.InsertTextFormat.Snippet
				item.insertText = item.label + "($0)" + (nextNotSpace ? " " : "")
			}
		}
	}

	if (suggestion.token) {
		if (suggestion.token.kind === tw.TokenKind.Variant) {
			const isVariantWord = state.twin.isVariant(value.slice(0, value.length - state.separator.length))
			if (!isVariantWord || (position > a && position < b)) {
				doReplace(variantItems, document, offset, a, b, item => item.label)
			}
		} else if (
			suggestion.token.kind === tw.TokenKind.ClassName ||
			suggestion.token.kind === tw.TokenKind.CssProperty
		) {
			if (position > a) {
				doReplace(variantItems, document, offset, a, b, item => item.insertText || item.label)
			}
		} else if (suggestion.token.kind === tw.TokenKind.Unknown) {
			if (position === a) {
				if (nextCharacter === state.separator) {
					doReplace(variantItems, document, offset, a, a + 1, item => item.label)
				} else {
					doInsert(variantItems, document, offset, a, item => item.label)
				}
			} else if (suggestion.token.token.text === state.separator) {
				doReplace(variantItems, document, offset, a, a + 1, item => item.label)
			} else {
				variantItems.length = 0
			}
		}
	}

	return variantItems
}

function utiltiesCompletion(
	document: TextDocument,
	input: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof completeElement>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const [a, b, value] = suggestion.token?.token ?? tw.createToken(0, 0, "")
	const userVariants = suggestion.variants.texts
	let classNameItems: lsp.CompletionItem[] = []
	let classNameEnabled = true

	if (kind === PatternKind.TwinCssProperty) {
		classNameEnabled = false
	}
	if (suggestion.token) {
		switch (suggestion.token.kind) {
			case tw.TokenKind.Variant: {
				const isVariantWord = state.twin.isVariant(value.slice(0, value.length - state.separator.length))
				if (position === b && !isVariantWord) {
					classNameEnabled = false
				}
				break
			}
			case tw.TokenKind.Comment:
				classNameEnabled = false
				break
			case tw.TokenKind.CssProperty:
				classNameEnabled = false
				break
		}
	}

	if (classNameEnabled) {
		const classesFilter = state.twin.getSuggestedClassNameFilter(userVariants)
		classNameItems = state.twin.classnames
			.filter(item => classesFilter(item.key))
			.map(([label, rules]) => createCompletionItem({ label, rules, variants: userVariants, kind, state }))
	}

	const next = input.slice(b, b + 1)
	const nextNotSpace = next !== "" && next.match(/[\s)]/) == null

	if (suggestion.token) {
		if (position > a && position < b) {
			doReplace(classNameItems, document, offset, a, b, item => item.label + (nextNotSpace ? " " : ""))
		} else if (position === a) {
			doInsert(classNameItems, document, offset, a, item => item.label + " ")
		} else if (position === b) {
			if (suggestion.token.kind === tw.TokenKind.ClassName || suggestion.token.token.text === state.separator) {
				doReplace(classNameItems, document, offset, a, b, item => item.label + (nextNotSpace ? " " : ""))
			} else if (suggestion.token.kind === tw.TokenKind.Variant) {
				doInsert(classNameItems, document, offset, b, item => item.label + (nextNotSpace ? " " : ""))
			}
		} else {
			classNameItems.length = 0
		}
	}

	return classNameItems
}

function arbitraryValueCompletion(
	document: TextDocument,
	input: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof completeElement>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const [a, b, value] = suggestion.token?.token ?? tw.createToken(0, 0, "")
	const propItems: lsp.CompletionItem[] = []
	const valueItems: lsp.CompletionItem[] = []
	let propEnabled = true
	let valueEnabled = false

	if (kind === PatternKind.TwinCssProperty) {
		return []
	}

	if (suggestion.token) {
		switch (suggestion.token.kind) {
			case tw.TokenKind.Variant: {
				const isVariantWord = state.twin.isVariant(value.slice(0, value.length - state.separator.length))
				if (position === b && !isVariantWord) {
					propEnabled = false
				}
				break
			}
			case tw.TokenKind.Comment:
				propEnabled = false
				break
			case tw.TokenKind.CssProperty: {
				const { start, end } = suggestion.token.value
				if (position >= start && position <= end) {
					propEnabled = false
				}
				if (position >= start && position <= end) {
					valueEnabled = true
				}
				if (!arbitraryValueMapping[suggestion.token.key.text]) {
					valueEnabled = false
				}
				break
			}
		}
	}

	if (propEnabled) {
		for (const key in arbitraryValueMapping) {
			propItems.push({
				label: key,
				sortText: "~~~>" + key,
				kind: lsp.CompletionItemKind.Interface,
				insertTextFormat: lsp.InsertTextFormat.Snippet,
				insertText: key + "[$0]",
				command: {
					title: "Suggest",
					command: "editor.action.triggerSuggest",
				},
				documentation: {
					kind: lsp.MarkupKind.Markdown,
					value: "",
				},
				data: {
					type: "arbitraryValue",
				},
			})
		}
	}

	if (suggestion.token) {
		if (suggestion.token.kind === tw.TokenKind.CssProperty) {
			const { start, end } = suggestion.token.key
			if (position > start && position <= end) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === start) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else if (suggestion.token.kind === tw.TokenKind.Variant) {
			if (position > a && position < b) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else {
			if (position > a && position <= b) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		}
	}

	if (valueEnabled && suggestion.token?.kind === tw.TokenKind.CssProperty) {
		const restrictions = arbitraryValueMapping[suggestion.token.key.text]
		switch (restrictions) {
			case "<angle>":
				{
					const word = suggestion.token.value.getWord(position)
					const items = getUnitProposals(
						word.text,
						lsp.Range.create(
							document.positionAt(offset + word.start),
							document.positionAt(offset + word.end),
						),
						["angle"],
					)
					for (let i = 0; i < items.length; i++) {
						items[i].data = {
							type: "cssPropertyValue",
						}
					}
					valueItems.push(...items)
				}
				break
			case "<length>":
				{
					const word = suggestion.token.value.getWord(position)
					const items = getUnitProposals(
						word.text,
						lsp.Range.create(
							document.positionAt(offset + word.start),
							document.positionAt(offset + word.end),
						),
						["length"],
					)
					for (let i = 0; i < items.length; i++) {
						items[i].data = {
							type: "cssPropertyValue",
						}
					}
					valueItems.push(...items)
				}
				break
			case "<number>":
				break
			case "<number>|<percentage>":
				break
			default:
				{
					const prop = restrictions
					const word = suggestion.token.value.getWord(position)
					valueItems.push(
						...getCompletionsForDeclarationValue(
							prop,
							word.text,
							lsp.Range.create(
								document.positionAt(offset + word.start),
								document.positionAt(offset + word.end),
							),
						),
					)
				}
				break
		}
	}

	return [...propItems, ...valueItems]
}

function shortcssCompletion(
	document: TextDocument,
	input: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof completeElement>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const [a, b, value] = suggestion.token?.token ?? tw.createToken(0, 0, "")

	let propItems: lsp.CompletionItem[] = []
	const valueItems: lsp.CompletionItem[] = []
	let propEnabled = true
	let valueEnabled = false

	if (suggestion.token) {
		switch (suggestion.token.kind) {
			case tw.TokenKind.Variant: {
				const isVariantWord = state.twin.isVariant(value.slice(0, value.length - state.separator.length))
				if (position === b && !isVariantWord) {
					propEnabled = false
				}
				break
			}
			case tw.TokenKind.Comment:
				propEnabled = false
				break
			case tw.TokenKind.CssProperty: {
				const { start, end } = suggestion.token.value
				if (position >= start && position <= end) {
					propEnabled = false
				}
				if (position >= start && position <= end) {
					valueEnabled = true
				}
				break
			}
		}
	}

	if (propEnabled) {
		propItems = cssDataManager.getProperties().map<lsp.CompletionItem>(entry => ({
			label: entry.name,
			sortText: "~~~~" + entry.name,
			kind: lsp.CompletionItemKind.Field,
			insertTextFormat: lsp.InsertTextFormat.Snippet,
			insertText: entry.name + "[$0]",
			command: {
				title: "Suggest",
				command: "editor.action.triggerSuggest",
			},
			data: {
				type: "cssPropertyName",
				entry,
			},
		}))

		propItems.push(
			...state.twin.customProperties.map(label => ({
				label,
				sortText: "~~~~~" + label,
				kind: lsp.CompletionItemKind.Field,
				insertTextFormat: lsp.InsertTextFormat.Snippet,
				insertText: label + "[$0]",
				command: {
					title: "Suggest",
					command: "editor.action.triggerSuggest",
				},
				data: {
					type: "cssPropertyName",
				},
				documentation: "custom variable",
			})),
		)
	}

	if (suggestion.token) {
		if (suggestion.token.kind === tw.TokenKind.CssProperty) {
			const { start, end } = suggestion.token.key
			if (position > start && position <= end) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === start) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else if (suggestion.token.kind === tw.TokenKind.Variant) {
			if (position > a && position < b) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else {
			if (position > a && position <= b) {
				doReplace(propItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(propItems, document, offset, a, item => item.label + "[$0] ")
			}
		}
	}

	if (valueEnabled && suggestion.token?.kind === tw.TokenKind.CssProperty) {
		const prop = suggestion.token.key.toKebab()
		const word = suggestion.token.value.getWord(position)
		valueItems.push(
			...getCompletionsForDeclarationValue(
				prop,
				word.text,
				lsp.Range.create(document.positionAt(offset + word.start), document.positionAt(offset + word.end)),
			),
		)
	}

	return [...propItems, ...valueItems]
}

function twinThemeCompletion(
	document: TextDocument,
	index: number,
	token: tw.Token,
	state: Tailwind,
): lsp.CompletionList {
	const [offset, , text] = token
	const position = index - offset
	const { keys, hit } = findThemeValueKeys(text, position)

	if (!hit && keys.length > 0) {
		return { isIncomplete: false, items: [] }
	}

	const value = state.getTheme(keys)
	if (typeof value !== "object") {
		return { isIncomplete: false, items: [] }
	}

	const candidates = Object.keys(value)

	function formatCandidates(label: string) {
		let prefix = ""
		if (label.slice(0, 1) === "-") {
			prefix = "~~~"
			label = label.slice(1)
		}
		try {
			const val = eval(label)
			if (typeof val !== "number") {
				return prefix + label
			}
			return prefix + Math.abs(val).toFixed(3).padStart(7, "0")
		} catch {
			return prefix + label
		}
	}

	return {
		isIncomplete: false,
		items: candidates.map(label => {
			const item: lsp.CompletionItem = {
				label,
				sortText: formatCandidates(label),
			}
			const value = state.getTheme([...keys, label])
			item.data = {
				type: "theme",
			}
			if (typeof value === "object") {
				item.kind = lsp.CompletionItemKind.Module
				item.documentation = {
					kind: lsp.MarkupKind.Markdown,
					value: `\`\`\`text\nobject\n\`\`\``,
				}
				item.detail = label
			} else if (typeof value === "function") {
				item.kind = lsp.CompletionItemKind.Function
				item.documentation = {
					kind: lsp.MarkupKind.Markdown,
					value: `\`\`\`text\nfunction\n\`\`\``,
				}
				item.detail = label
			} else {
				if (typeof value === "string") {
					try {
						if (value === "transparent") {
							item.kind = lsp.CompletionItemKind.Color
							item.documentation = "rgba(0, 0, 0, 0.0)"
							item.data.type = "color"
							return item
						}
						chroma(value)
						item.kind = lsp.CompletionItemKind.Color
						item.documentation = value
						item.data.type = "color"
					} catch {
						item.kind = lsp.CompletionItemKind.Constant
						item.documentation = {
							kind: lsp.MarkupKind.Markdown,
							value: `\`\`\`txt\n${value}\n\`\`\``,
						}
						item.detail = label
					}
				}
			}

			let newText = label
			if (label.match(/[-./]/)) {
				newText = `[${label}]`
			} else if (keys.length > 0) {
				newText = `.${label}`
			}

			item.filterText = newText
			if (keys.length > 0) {
				item.filterText = hit?.text.slice(0, 1) + item.filterText
			}

			if (hit) {
				const [a, b] = hit
				item.textEdit = lsp.TextEdit.replace(
					{
						start: document.positionAt(offset + a),
						end: document.positionAt(offset + b),
					},
					newText,
				)
			} else {
				item.textEdit = lsp.TextEdit.insert(document.positionAt(index), newText)
			}

			return item
		}),
	}
}

function createCompletionItem({
	label,
	rules,
	state,
}: {
	label: string
	rules: ClassNameItem
	variants: string[]
	kind: PatternKind
	state: Tailwind
}): lsp.CompletionItem {
	const item: lsp.CompletionItem = {
		label,
		data: { type: "utilities" },
		kind: lsp.CompletionItemKind.Constant,
	}

	if (label.startsWith("-")) {
		item.sortText = "~~~" + formatLabel(label)
	} else {
		item.sortText = "~~" + formatLabel(label)
	}

	if (rules.some(d => d.source === "components")) {
		item.data.type = "components"
		return item
	}

	const info = state.twin.colors.get(label)
	if (!info) {
		return item
	}

	item.kind = lsp.CompletionItemKind.Color
	if (label.includes("current")) {
		return item
	}

	if (label.includes("transparent")) {
		item.documentation = "rgba(0, 0, 0, 0.0)"
		item.data.type = "color"
		return item
	}

	item.documentation = info.backgroundColor || info.borderColor || info.color
	item.data.type = "color"

	return item
}

function formatLabel(label: string) {
	const reg = /((?:[\w-]+-)+)+([\d/.]+)/
	const m = label.match(reg)
	if (!m) {
		return label
	}
	try {
		const val = eval(m[2])
		if (typeof val !== "number") {
			return label
		}
		const prefix = m[1] + (/^[\d.]+$/.test(m[2]) ? "@" : "_")
		return prefix + val.toFixed(3).padStart(7, "0")
	} catch {
		return label
	}
}

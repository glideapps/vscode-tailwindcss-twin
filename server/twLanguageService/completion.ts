import chroma from "chroma-js"
import { serializeError } from "serialize-error"
import type { IPropertyData } from "vscode-css-languageservice"
import * as lsp from "vscode-languageserver"
import { TextDocument } from "vscode-languageserver-textdocument"
import { canMatch, PatternKind } from "~/common/ast"
import { findThemeValueKeys } from "~/common/parseThemeValue"
import * as parser from "~/common/twin-parser"
import * as nodes from "~/common/twin-parser/twNodes"
import type { Tailwind } from "~/tailwind"
import type { ClassNameItem } from "~/tailwind/twin"
import type { ServiceOptions } from "~/twLanguageService"
import { getCompletionsForDeclarationValue, getCompletionsFromRestrictions } from "./completionCssPropertyValue"
import { cssDataManager } from "./cssData"

export interface InnerData {
	type: "screen" | "utilities" | "components" | "color" | "variant" | "theme" | "cssPropertyName" | "cssPropertyValue"
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
		} else if (kind === PatternKind.TwinScreen) {
			const list = twinScreenCompletion(document, index, token, state)
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
	match: parser.Token,
	kind: PatternKind,
	state: Tailwind,
	options: ServiceOptions,
): lsp.CompletionList {
	const [offset, , text] = match
	const position = index - offset
	const suggestion = parser.suggest({ text, position, separator: state.separator })
	const isIncomplete = false

	const variants = variantsCompletion(document, text, position, offset, kind, suggestion, state, options)
	const utilties = utiltiesCompletion(document, text, position, offset, kind, suggestion, state, options)
	const shortcss = shortcssCompletion(document, text, position, offset, kind, suggestion, state, options)
	const arbitraryValue = arbitraryValueCompletion(document, text, position, offset, kind, suggestion, state, options)

	return lsp.CompletionList.create([...variants, ...utilties, ...shortcss, ...arbitraryValue], isIncomplete)
}

function variantsCompletion(
	document: TextDocument,
	text: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof parser.suggest>,
	state: Tailwind,
	{ preferVariantWithParentheses }: ServiceOptions,
) {
	const [a, , value] = suggestion?.target ?? parser.createToken(0, 0, "")
	let [, b] = suggestion?.target ?? parser.createToken(0, 0, "")
	const nextCharacter = text.slice(position, position + 1)
	const userVariants = suggestion?.variants.texts ?? []
	let variantItems: lsp.CompletionItem[] = []
	let variantEnabled = true

	if (suggestion.inComment) {
		variantEnabled = false
	}

	if (suggestion.target) {
		switch (suggestion.type) {
			case parser.SuggestResultType.Variant:
				b = b + state.separator.length
				break
			case parser.SuggestResultType.CssProperty:
			case parser.SuggestResultType.ArbitraryStyle:
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

	const next = text.slice(b, b + 1)
	const nextNotSpace = next != "" && suggestion != undefined && next.match(/[\s)]/) == null

	if (preferVariantWithParentheses) {
		if (nextCharacter !== "(") {
			for (let i = 0; i < variantItems.length; i++) {
				const item = variantItems[i]
				item.insertTextFormat = lsp.InsertTextFormat.Snippet
				item.insertText = item.label + "($0)" + (nextNotSpace ? " " : "")
			}
		}
	}

	if (suggestion.target) {
		if (suggestion.type === parser.SuggestResultType.Variant) {
			const isVariantWord = state.twin.isVariant(value)
			if (!isVariantWord || (position > a && position < b)) {
				doReplace(variantItems, document, offset, a, b, item => item.label)
			}
		} else if (
			suggestion.type === parser.SuggestResultType.ClassName ||
			suggestion.type === parser.SuggestResultType.CssProperty ||
			suggestion.type === parser.SuggestResultType.ArbitraryStyle
		) {
			if (position > a) {
				doReplace(variantItems, document, offset, a, b, item => item.insertText || item.label)
			}
		}
	}

	return variantItems
}

function utiltiesCompletion(
	document: TextDocument,
	text: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof parser.suggest>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const [a, , value] = suggestion?.target ?? parser.createToken(0, 0, "")
	let [, b] = suggestion?.target ?? parser.createToken(0, 0, "")
	const userVariants = suggestion?.variants.texts ?? []
	let classNameItems: lsp.CompletionItem[] = []
	let classNameEnabled = true

	if (kind === PatternKind.TwinCssProperty) {
		classNameEnabled = false
	}

	if (suggestion.inComment) {
		classNameEnabled = false
	}

	if (suggestion.target) {
		switch (suggestion.type) {
			case parser.SuggestResultType.Variant: {
				const isVariantWord = state.twin.isVariant(value)
				b = b + state.separator.length
				if (position === b && !isVariantWord) {
					classNameEnabled = false
				}
				break
			}
			case parser.SuggestResultType.CssProperty:
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

	const next = text.slice(b, b + 1)
	const nextNotSpace = next !== "" && next.match(/[\s)]/) == null

	if (suggestion.target) {
		if (position > a && position < b) {
			const [isColorShorthandOpacity, name] = state.twin.isColorShorthandOpacity(suggestion.target.value)
			if (isColorShorthandOpacity) {
				doReplace(classNameItems, document, offset, a, a + name.length, item => item.label)
			} else {
				doReplace(classNameItems, document, offset, a, b, item => item.label + (nextNotSpace ? " " : ""))
			}
		} else if (position === a) {
			doInsert(classNameItems, document, offset, a, item => item.label + " ")
		} else if (position === b) {
			if (
				suggestion.type === parser.SuggestResultType.ClassName ||
				suggestion.type === parser.SuggestResultType.ArbitraryStyle ||
				suggestion.target.value === state.separator
			) {
				doReplace(classNameItems, document, offset, a, b, item => {
					return item.label + (nextNotSpace ? " " : "")
				})
			} else if (suggestion.type === parser.SuggestResultType.Variant) {
				doInsert(classNameItems, document, offset, b, item => item.label + (nextNotSpace ? " " : ""))
			}
		} else {
			classNameItems.length = 0
		}
	}

	return classNameItems
}

function shortcssCompletion(
	document: TextDocument,
	text: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof parser.suggest>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const [a, , value] = suggestion?.target ?? parser.createToken(0, 0, "")
	let [, b] = suggestion?.target ?? parser.createToken(0, 0, "")

	let cssPropItems: lsp.CompletionItem[] = []
	const cssValueItems: lsp.CompletionItem[] = []
	let cssPropEnabled = true
	let cssValueEnabled = false

	if (suggestion.inComment) {
		cssPropEnabled = cssValueEnabled = false
	}

	if (suggestion.target) {
		if (suggestion.type === parser.SuggestResultType.Variant) {
			b = b + state.separator.length
			const isVariantWord = state.twin.isVariant(value)
			if (position === b && !isVariantWord) {
				cssPropEnabled = false
			}
		} else if (nodes.isCssProperty(suggestion.target)) {
			const [a, b] = suggestion.target.content
			if (position >= a && position <= b) {
				cssPropEnabled = false
				cssValueEnabled = true
			}
		}
	}

	if (cssPropEnabled) {
		cssPropItems = cssDataManager.getProperties().map(entry => ({
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

		cssPropItems.push(
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

	if (suggestion.target) {
		if (suggestion.type === parser.SuggestResultType.CssProperty) {
			const { start, end } = suggestion.target
			if (position > start && position <= end) {
				doReplace(cssPropItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === start) {
				doInsert(cssPropItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else if (suggestion.type === parser.SuggestResultType.Variant) {
			if (position > a && position < b) {
				doReplace(cssPropItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(cssPropItems, document, offset, a, item => item.label + "[$0] ")
			}
		} else {
			if (position > a && position <= b) {
				doReplace(cssPropItems, document, offset, a, b, item => item.label + "[$0]")
			} else if (position === a) {
				doInsert(cssPropItems, document, offset, a, item => item.label + "[$0] ")
			}
		}
	}

	if (cssValueEnabled && suggestion.target && nodes.isCssProperty(suggestion.target)) {
		const prop = suggestion.target.prop?.toKebab() ?? ""
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const word = suggestion.target!.getWord(position)
		cssValueItems.push(
			...getCompletionsForDeclarationValue(
				prop,
				word.value,
				lsp.Range.create(document.positionAt(offset + word.start), document.positionAt(offset + word.end)),
			),
		)
	}

	return [...cssPropItems, ...cssValueItems]
}

const fromCssProp = (cssprop: string) => (currentWord: string, range: lsp.Range) =>
	getCompletionsForDeclarationValue(cssprop, currentWord, range)
const fromRestrictions =
	(...restrictions: string[]) =>
	(currentWord: string, range: lsp.Range) =>
		getCompletionsFromRestrictions(restrictions, currentWord, range)

const mappingArbitraryPropToCssProp: Record<
	string,
	Array<(currentWord: string, range: lsp.Range) => lsp.CompletionItem[]>
> = {
	"divide-": [fromCssProp("border-color")],
	"bg-": [fromCssProp("background-color")],
	"from-": [fromRestrictions("color")],
	"via-": [fromRestrictions("color")],
	"to-": [fromRestrictions("color")],
	"space-x-": [fromRestrictions("length", "percentage")],
	"space-y-": [fromRestrictions("length", "percentage")],
	"w-": [fromCssProp("width")],
	"h-": [fromCssProp("height")],
	"leading-": [fromCssProp("line-height")],
	"m-": [fromCssProp("margin")],
	"mx-": [fromCssProp("margin-left")],
	"my-": [fromCssProp("margin-top")],
	"mt-": [fromCssProp("margin-top")],
	"mr-": [fromCssProp("margin-right")],
	"mb-": [fromCssProp("margin-bottom")],
	"ml-": [fromCssProp("margin-left")],
	"p-": [fromCssProp("padding")],
	"px-": [fromCssProp("padding-left")],
	"py-": [fromCssProp("padding-top")],
	"pt-": [fromCssProp("padding-top")],
	"pr-": [fromCssProp("padding-right")],
	"pb-": [fromCssProp("padding-bottom")],
	"pl-": [fromCssProp("padding-left")],
	"max-w-": [fromCssProp("max-width")],
	"max-h-": [fromCssProp("max-height")],
	"inset-": [fromCssProp("top")],
	"inset-x-": [fromCssProp("top")],
	"inset-y-": [fromCssProp("left")],
	"top-": [fromCssProp("top")],
	"right-": [fromCssProp("right")],
	"bottom-": [fromCssProp("bottom")],
	"left-": [fromCssProp("left")],
	"gap-": [fromCssProp("gap")],
	"translate-x-": [fromRestrictions("length", "percentage")],
	"translate-y-": [fromRestrictions("length", "percentage")],
	"blur-": [fromRestrictions("length")],
	"backdrop-blur": [fromRestrictions("length")],
	"order-": [fromCssProp("order")],
	"rotate-": [fromRestrictions("angle")],
	"skew-x-": [fromRestrictions("angle")],
	"skew-y-": [fromRestrictions("angle")],
	"hue-rotate-": [fromRestrictions("angle")],
	"backdrop-hue-rotate-": [fromRestrictions("angle")],
	"duration-": [fromCssProp("transition-duration")],
	"delay-": [fromCssProp("transition-delay")],
	"ease-": [fromCssProp("transition-timing-function")],
	"grid-cols-": [fromCssProp("grid-template-columns")],
	"grid-rows-": [fromCssProp("grid-template-rows")],
	"border-": [fromCssProp("border-width"), fromCssProp("border-color")],
	"border-t-": [fromCssProp("border-top-width"), fromCssProp("border-top-color")],
	"border-r-": [fromCssProp("border-right-width"), fromCssProp("border-right-color")],
	"border-b-": [fromCssProp("border-bottom-width"), fromCssProp("border-bottom-color")],
	"border-l-": [fromCssProp("border-left-width"), fromCssProp("border-left-color")],
	"text-": [fromRestrictions("color", "length", "percentage")],
	"ring-": [fromRestrictions("length", "color")],
	"stroke-": [fromCssProp("stroke-width"), fromCssProp("stroke")],
}

function arbitraryValueCompletion(
	document: TextDocument,
	text: string,
	position: number,
	offset: number,
	kind: PatternKind,
	suggestion: ReturnType<typeof parser.suggest>,
	state: Tailwind,
	_: ServiceOptions,
) {
	const cssValueItems: lsp.CompletionItem[] = []

	if (suggestion.target == undefined) {
		return cssValueItems
	}

	if (suggestion.inComment) {
		return cssValueItems
	}

	if (!nodes.isArbitraryStyle(suggestion.target)) {
		return cssValueItems
	}

	if (position < suggestion.target.content.start || position > suggestion.target.content.end) {
		return cssValueItems
	}

	const prop = suggestion.target.prop.value
	if (mappingArbitraryPropToCssProp[prop]) {
		const word = suggestion.target.getWord(position)
		for (const fn of mappingArbitraryPropToCssProp[prop]) {
			cssValueItems.push(
				...fn(
					word.value,
					lsp.Range.create(document.positionAt(offset + word.start), document.positionAt(offset + word.end)),
				),
			)
		}
	}

	return cssValueItems
}

function twinThemeCompletion(
	document: TextDocument,
	index: number,
	token: parser.Token,
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

function twinScreenCompletion(
	document: TextDocument,
	index: number,
	token: parser.Token,
	state: Tailwind,
): lsp.CompletionList {
	const value = state.getTheme(["screens"])
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
			const bp = state.twin.screens.get(label)
			const item: lsp.CompletionItem = {
				label,
				sortText: bp?.toString().padStart(5, " ") ?? formatCandidates(label),
			}
			const value = state.getTheme(["screens", label])
			item.data = {}
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

			item.textEdit = lsp.TextEdit.replace(
				{
					start: document.positionAt(token.start),
					end: document.positionAt(token.end),
				},
				label,
			)

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
		sortText: (label.slice(0, 1) === "-" ? "~~~" : "~~") + formatLabel(label),
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

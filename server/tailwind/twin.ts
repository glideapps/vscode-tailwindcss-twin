/* eslint-disable @typescript-eslint/no-non-null-assertion */
import chroma from "chroma-js"
import Fuse from "fuse.js"
import type { AtRule, Node, Result, Rule } from "postcss"
import parser from "postcss-selector-parser"

const twinVariants: Array<[string, string[]]> = [
	["active", [":active"]],
	["after", ["::after"]],
	["all", ["*"]],
	["all-child", ["> *"]],
	["before", ["::before"]],
	["checked", [":checked"]],
	["default", [":default"]],
	["disabled", [":disabled"]],
	["enabled", [":enabled"]],
	["even", [":nth-child(even)"]],
	["even-of-type", [":nth-of-type(even)"]],
	["first", [":first-child"]],
	["first-of-type", [":first-of-type"]],
	["focus", [":focus"]],
	["focus-visible", [":focus-visible"]],
	["focus-within", [":focus-within"]],
	["group-active", [".group:active"]],
	["group-focus", [".group:focus"]],
	["group-hocus", [".group:hover", ".group:focus"]],
	["group-hover", [".group:hover"]],
	["group-visited", [".group:visited"]],
	["hocus", [":hover", ":focus"]],
	["hover", [":hover"]],
	["indeterminate", [":indeterminate"]],
	["invalid", [":invalid"]],
	["last", [":last-child"]],
	["last-of-type", [":last-of-type"]],
	["link", [":link"]],
	["motion-reduce", ["@media (prefers-reduced-motion: reduce)"]],
	["motion-safe", ["@media (prefers-reduced-motion: no-preference)"]],
	["not-checked", [":not(:checked)"]],
	["not-disabled", [":not(:disabled)"]],
	["not-first", [":not(:first-child)"]],
	["not-first-of-type", [":not(:first-of-type)"]],
	["not-last", [":not(:last-child)"]],
	["not-last-of-type", [":not(:last-of-type)"]],
	["not-only-child", [":not(:only-child)"]],
	["not-only-of-type", [":not(:only-of-type)"]],
	["odd", [":nth-child(odd)"]],
	["odd-of-type", [":nth-of-type(odd)"]],
	["only-child", [":only-child"]],
	["only-of-type", [":only-of-type"]],
	["optional", [":optional"]],
	["placeholder-shown", [":placeholder-shown"]],
	["read-only", [":read-only"]],
	["read-write", [":read-write"]],
	["required", [":required"]],
	["sibling", ["~ *"]],
	["svg", ["svg"]],
	["target", [":target"]],
	["valid", [":valid"]],
	["visited", [":visited"]],
	["placeholder", ["::placeholder"]],
	["screen", ["@media screen"]],
	["print", ["@media print"]],
	["landscape", ["@media (orientation: landscape)"]],
	["portrait", ["@media (orientation: portrait)"]],
	["any-pointer-none", ["@media (any-pointer: none)"]],
	["any-pointer-fine", ["@media (any-pointer: fine)"]],
	["any-pointer-coarse", ["@media (any-pointer: coarse)"]],
	["pointer-none", ["@media (pointer: none)"]],
	["pointer-fine", ["@media (pointer: fine)"]],
	["pointer-coarse", ["@media (pointer: coarse)"]],
	["any-hover", ["@media (any-hover: hover)"]],
	["any-hover-none", ["@media (any-hover: none)"]],
	["can-hover", ["@media (hover: hover)"]],
	["cant-hover", ["@media (hover: none)"]],
]

interface ClassNameMetaItem {
	name: string
	variants: string[]
	pseudo: string[]
	context: string[]
	rest: string
}

interface RuleMetaItem {
	classname: ClassNameMetaItem[]
	decls: Record<string, string[]>
}

interface RuleItem extends ClassNameMetaItem {
	source: string
	decls: Record<string, string[]>
}

export type ClassNameItem = RuleItem[]

export type ColorInfo = {
	color?: string
	backgroundColor?: string
	borderColor?: string
}

enum Flag {
	None = 0,
	Responsive = 1 << 0,
	DarkLightMode = 1 << 1,
	MotionControl = 1 << 2,
	CommonVariant = 1 << 3,
}

interface Options {
	separator: string
	prefix?: string
	darkMode?: "media" | "class" | false
}

export const __INNER_TAILWIND_SEPARATOR__ = "_twsp_"

export class Twin {
	static selectorProcessor = parser()

	readonly separator: string
	readonly prefix: string
	readonly darkMode: string

	constructor({ separator, prefix, darkMode }: Options, ...results: Array<{ result: Result; source?: string }>) {
		this.separator = separator
		this.prefix = prefix || ""
		this.darkMode = darkMode || "media"
		results.forEach(a => this.parseResult(a))

		// post processing
		for (let i = 0; i < twinVariants.length; i++) {
			const [key, value] = twinVariants[i]
			this.variantsMap.set(key, value)
		}
		if (this.darkMode === "media") {
			this.variantsMap.set("light", ["@media (prefers-color-scheme: light)"])
		} else if (this.darkMode === "class") {
			this.variantsMap.set("light", [".light"])
		}
		this.classnamesMap.delete("group")
		this.classnamesMap.set(prefix + "content", [
			{
				name: "content",
				source: "utilities",
				variants: [],
				context: [],
				pseudo: [],
				rest: "",
				decls: { content: ['""'] },
			},
		])

		// collection
		this.variants = Array.from(this.variantsMap)
		this.classnames = Array.from(this.classnamesMap)
		this.screens = collectScreens(this.variants)
		this.colors = collectColors(this.classnames)
		this.searchers = {
			variants: new Fuse(
				this.variants.map(v => v[0]),
				{ includeScore: true },
			),
			classnames: new Fuse(
				this.classnames.map(v => v[0]),
				{ includeScore: true },
			),
		}
	}

	private getRuleMetaItem(rule: Rule, separator: string): RuleMetaItem {
		const classname: ClassNameMetaItem[] = []
		const { nodes } = Twin.selectorProcessor.astSync(rule.selector)

		// get context, ex: "@media (min-width: 1024px)"
		function getContext(rule: Rule) {
			let p = rule as Node | undefined
			const context: string[] = []
			while (p?.parent?.type !== "root") {
				p = p?.parent
				if (p?.type === "atrule") {
					const at = p as AtRule
					context.push(`@${at.name} ${at.params}`)
				}
			}
			return context
		}

		function newItem(): ClassNameMetaItem {
			return {
				name: "",
				variants: [],
				pseudo: [],
				context: [],
				rest: "",
			}
		}

		const context = getContext(rule)

		function pushClassnameMetaItem(item: ClassNameMetaItem) {
			item.context.push(...context)
			classname.push(item)
		}

		for (let i = 0; i < nodes.length; i++) {
			const selector = nodes[i]
			let temp: ClassNameMetaItem | undefined

			for (let j = 0; j < selector.nodes.length; j++) {
				const node = selector.nodes[j]
				switch (node.type) {
					case "class": {
						if (temp) {
							pushClassnameMetaItem(temp)
							temp = undefined
						}
						temp = newItem()

						const fields = node.value.split(separator)
						if (fields.length === 1) {
							temp.name = fields[0]
						} else if (fields.length > 1) {
							temp.variants = fields.slice(0, -1)
							temp.name = fields[fields.length - 1]
						}

						break
					}
					case "pseudo":
						if (temp) {
							if (temp.rest === "") {
								temp.pseudo.push(node.toString())
							} else {
								temp.rest += node.toString()
							}
						}
						break
					default:
						if (temp) {
							temp.rest += node.toString()
						}
				}
			}

			if (temp) {
				pushClassnameMetaItem(temp)
				temp = undefined
			}
		}

		const decls: Record<string, string[]> = {}
		rule.walkDecls(decl => {
			const cur = decls[decl.prop]
			if (cur instanceof Array) {
				decls[decl.prop] = [...cur, decl.value]
			} else {
				decls[decl.prop] = [decl.value]
			}
		})

		return {
			classname,
			decls,
		}
	}

	readonly variantsMap: Map<string, string[]> = new Map()
	readonly classnamesMap: Map<string, ClassNameItem> = new Map()
	readonly variants: Array<[string, string[]]> = []
	readonly classnames: Array<[string, ClassNameItem]> = []
	readonly colors: ReturnType<typeof collectColors> = new Map()
	readonly screens: ReturnType<typeof collectScreens> = new Map()
	readonly searchers!: { variants: Fuse<string>; classnames: Fuse<string> }

	private addVariant(item: ClassNameMetaItem) {
		const b = item.variants[0]
		if (!this.variantsMap.has(b)) {
			if (item.context.length > 0) {
				this.variantsMap.set(b, item.context)
			} else if (item.pseudo.length > 0) {
				this.variantsMap.set(b, item.pseudo)
			} else {
				this.variantsMap.set(b, [])
			}
		}
	}

	private parseResult({ result, source = "" }: { result: Result; source?: string }) {
		result.root.walkRules(rule => {
			const item = this.getRuleMetaItem(rule, this.separator)
			if (item) {
				const { classname, decls } = item
				for (const c of classname) {
					if (c.variants.length > 0) {
						this.addVariant(c)
						continue
					}

					let items = this.classnamesMap.get(c.name)
					if (!(items instanceof Array)) {
						this.classnamesMap.set(c.name, [])
					}
					items = this.classnamesMap.get(c.name)!
					items.push({ ...c, source, decls })
				}
			}
		})
	}

	isDarkLightMode(key: string) {
		return key === "dark" || key === "light"
	}

	getScreen(key: string) {
		return this.screens.get(key)
	}

	isResponsive(key: string) {
		return !!this.getScreen(key)
	}

	isVariant(key: string) {
		return this.variantsMap.get(key) != undefined
	}

	hasDarkLightMode(keys: string[]) {
		return keys.some(v => this.isDarkLightMode(v))
	}

	hasScreen(keys: string[]) {
		return keys.some(v => this.isResponsive(v))
	}

	isMotionControl(key: string) {
		return key === "motion-reduce" || key === "motion-safe"
	}

	isCommonVariant(key: string) {
		if (this.isResponsive(key)) {
			return false
		}
		if (this.isDarkLightMode(key)) {
			return false
		}
		return this.isVariant(key)
	}

	isClassName(key: string) {
		return this.classnamesMap.has(key)
	}

	getSuggestedClassNameFilter(variants: string[]): (v: [string, ClassNameItem]) => boolean {
		return ([key]) => {
			switch (key) {
				case this.prefix + "container":
					return variants?.length === 0
			}
			return true
		}
	}

	getSuggestedVariantFilter(variants: string[]): (key: string) => boolean {
		const flags: Flag =
			(this.hasScreen(variants) ? Flag.Responsive : Flag.None) |
			(this.hasDarkLightMode(variants) ? Flag.DarkLightMode : Flag.None) |
			(variants.some(v => this.isCommonVariant(v)) ? Flag.CommonVariant : Flag.None)
		return key => {
			if (variants.some(v => v === key)) {
				return false
			}
			if (flags & Flag.Responsive) {
				if (this.isResponsive(key)) {
					return false
				}
			}
			if (flags & Flag.DarkLightMode) {
				if (this.isDarkLightMode(key)) {
					return false
				}
			}
			return true
		}
	}
}

function collectScreens(variants: Array<[string, string[]]>) {
	const result: Map<string, number> = new Map()
	variants.forEach(([label, values]) => {
		for (const val of values) {
			const match = val.match(/@media\s+\(.*width:\s*(\d+)px/)
			if (match != null) {
				const [, px] = match
				result.set(label, Number(px))
				break
			}
		}
	})
	return result
}

function collectColors(utilities: Array<[string, ClassNameItem]>) {
	const colors: Map<string, ColorInfo> = new Map()
	utilities.forEach(([label, info]) => {
		type D = [property: string, value: string]
		const decls: D[] = info.flatMap(v =>
			Object.keys(v.decls || {}).flatMap(key => v.decls![key].map<D>(v => [key, v])),
		)

		if (decls.length === 0) {
			return
		}

		for (let i = 0; i < decls.length; i++) {
			const prop = decls[i][0]
			const value = decls[i][1]
			if (!prop.includes("color") && !prop.includes("gradient") && prop !== "fill" && prop !== "stroke") {
				continue
			}

			if (!colors.has(label)) {
				colors.set(label, {})
			}

			const isFg = prop === "color"
			const isBg = prop.includes("background")
			const isBd = prop.includes("border") || prop.includes("divide")
			const isOther = !isFg && !isBg && !isBd

			if (label.includes("current")) {
				if (isFg) {
					colors.get(label)!.color = "currentColor"
				}
				if (isBd) {
					colors.get(label)!.borderColor = "currentColor"
				}
				if (isBg || isOther) {
					colors.get(label)!.backgroundColor = "currentColor"
				}
				continue
			}

			if (label.includes("transparent")) {
				if (isFg) {
					colors.get(label)!.color = "transparent"
				}
				if (isBd) {
					colors.get(label)!.borderColor = "transparent"
				}
				if (isBg || isOther) {
					colors.get(label)!.backgroundColor = "transparent"
				}
				continue
			}

			const reg = /^[a-z]+$|#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|rgba\(\s*(?<r>\d{1,3})\s*,\s*(?<g>\d{1,3})\s*,\s*(?<b>\d{1,3})\s*,\s*(?<a>\d{1,3})\s*\)/
			const m = value.replace(/,\s*var\(\s*[\w-]+\s*\)/g, ", 1").match(reg)
			if (m == null) {
				continue
			}

			let color: chroma.Color | undefined
			try {
				if (m.groups?.r) {
					const { r, g, b } = m.groups
					color = chroma(+r, +g, +b)
				} else {
					color = chroma(m[0])
				}
			} catch {}

			if (!color) continue

			const val = color.hex()

			if (isBd) {
				colors.get(label)!.borderColor = val
			}
			if (isFg) {
				colors.get(label)!.color = val
			}
			if (isBg || isOther) {
				colors.get(label)!.backgroundColor = val
			}
		}
	})
	return colors
}

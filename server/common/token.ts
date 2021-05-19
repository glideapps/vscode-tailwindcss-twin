type _Token = [start: number, end: number, value: string]

export interface Token extends _Token {
	start: number
	end: number
	text: string
	trim(): Token
	getWord(offset?: number): Token
	toKebab(): string
}

export interface TokenList extends Array<Token> {
	texts: string[]
	slice(start?: number, end?: number): TokenList
}

export enum TokenKind {
	Unknown,
	Variant,
	ClassName,
	CssProperty,
	VariantsGroup,
	Comment,
}

export interface Context {
	variants: TokenList
	important: boolean
}

export interface Unknown extends Context {
	kind: TokenKind.Unknown
	token: Token
}

export interface ClassName extends Context {
	kind: TokenKind.ClassName
	token: Token
}

export interface Variant {
	kind: TokenKind.Variant
	token: Token
}

export interface CssProperty extends Context {
	kind: TokenKind.CssProperty
	token: Token
	prop: Token
	value: Token
}

export interface Comment {
	kind: TokenKind.Comment
	token: Token
}

export interface Error {
	message: string
	start: number
	end: number
}

export enum EmptyKind {
	Classname,
	Group,
	CssProperty,
}

export interface EmptyClass {
	kind: EmptyKind.Classname
	variants: TokenList
	start: number
}

export interface EmptyGroup {
	kind: EmptyKind.Group
	variants: TokenList
	important: boolean
	start: number
	end: number
}

export interface EmptyCssProperty {
	kind: EmptyKind.CssProperty
	variants: TokenList
	prop: Token
	important: boolean
	start: number
	end: number
}

export type TwinElement = Unknown | ClassName | CssProperty | Comment
export type EmptyElement = EmptyClass | EmptyGroup | EmptyCssProperty

export function createToken(start: number, end: number, value: string) {
	const token: _Token = [start, end, value]
	return new Proxy(token, {
		get(target, prop) {
			switch (prop) {
				case "start":
					return target[0]
				case "end":
					return target[1]
				case "text":
					return target[2]
				case "trim":
					return function () {
						const [a, b, text] = target
						const len = text.length
						let i: number, j: number
						for (i = 0; i < len; i++) {
							if (!/\s/.test(text[i])) {
								break
							}
						}
						for (j = 0; j < len; j++) {
							if (!/\s/.test(text[len - j - 1])) {
								break
							}
						}
						return createToken(a + i, b - j, text.slice(i, len - j))
					}
				case "getWord":
					return function (offset = end) {
						let i = offset - 1 - start
						while (i >= 0 && ' \t\n\r":{[()]},*>+'.indexOf(value.charAt(i)) === -1) {
							i--
						}
						return createToken(i + 1 + start, offset, value.slice(i + 1, offset - start))
					}
				case "toKebab":
					return function toKebab() {
						return value.replace(/\B[A-Z][a-z]*/g, s => "-" + s.toLowerCase())
					}
				default:
					return target[prop]
			}
		},
		set(target, prop, value, ...rest) {
			switch (prop) {
				case "start":
					target[0] = value
					return true
				case "end":
					target[1] = value
					return true
				case "text":
					target[2] = value
					return true
				default:
					return Reflect.set(target, prop, value, ...rest)
			}
		},
	}) as Token
}

export function createTokenList(arr?: Token[]) {
	return new Proxy(arr ?? [], {
		get: function (target, prop) {
			switch (prop) {
				case "texts":
					return target.map(t => t.text)
				case "slice":
					return function (start?: number, end?: number) {
						return createTokenList(target.slice(start, end))
					}
				default:
					return target[prop]
			}
		},
	}) as TokenList
}

export interface TwinElementList extends Array<TwinElement> {
	texts: string[]
}

export interface EmptyList extends Array<EmptyElement> {
	texts: string[]
}

export function createTwinElementList(arr?: TwinElement[]) {
	return new Proxy(arr ?? [], {
		get: function (target, prop) {
			switch (prop) {
				case "texts": {
					const results: string[] = []
					for (let i = 0; i < target.length; i++) {
						let context = ""
						const item = target[i]
						if (item.kind === TokenKind.Comment) {
							continue
						}
						for (let j = 0; j < item.variants.length; j++) {
							context += item.variants[j].text + ":"
						}
						results.push(context + item.token.text + (item.important ? "!" : ""))
					}
					return results
				}
				case "slice":
					return function (start?: number, end?: number) {
						return createTwinElementList(target.slice(start, end))
					}
				default:
					return target[prop]
			}
		},
	}) as TwinElementList
}

export function createEmptyList(arr?: EmptyElement[]) {
	return new Proxy(arr ?? [], {
		get: function (target, prop) {
			switch (prop) {
				case "texts": {
					const results: string[] = []
					for (let i = 0; i < target.length; i++) {
						let context = ""
						const item = target[i]
						for (let j = 0; j < item.variants.length; j++) {
							context += target[i].variants[j].text + ":"
						}
						switch (item.kind) {
							case EmptyKind.Group:
								results.push(context + "()" + (item.important ? "!" : ""))
								break
							case EmptyKind.CssProperty:
								results.push(context + item.prop.text + "[]" + (item.important ? "!" : ""))
								break
							case EmptyKind.Classname:
								results.push(context)
								break
						}
					}
					return results
				}
				case "slice":
					return function (start?: number, end?: number) {
						return createEmptyList(target.slice(start, end))
					}
				default:
					return target[prop]
			}
		},
	}) as EmptyList
}

export interface SelectedUnknown {
	kind: TokenKind.Unknown
	token: Token
}

export interface SelectedClassName {
	kind: TokenKind.ClassName
	token: Token
}

export interface SelectedVariant {
	kind: TokenKind.Variant
	token: Token
}

export interface SelectedCssProperty {
	kind: TokenKind.CssProperty
	token: Token
	key: Token
	value: Token
}

export interface SelectedVariantsGroup {
	kind: TokenKind.VariantsGroup
	token: Token
}

export interface SelectedComment {
	kind: TokenKind.Comment
	token: Token
}

function formatCssValueSpace(text: string) {
	const fields = text.replace(/[\s;]+/g, " ").split(",")
	return fields.map(v => v.trim()).join(", ")
}

export function formatCssValue(text: string) {
	const reg = /(')|(")|(\/\/)|(\/\*)/gs
	let match: RegExpExecArray | null
	let output = ""
	reg.lastIndex = 0
	let k = 0
	while ((match = reg.exec(text))) {
		const [, singleQuote, doubleQuote, lineComment, blockComment] = match
		if (lineComment) {
			output += formatCssValueSpace(text.slice(k, reg.lastIndex - 2))
		} else if (blockComment) {
			output += formatCssValueSpace(text.slice(k, reg.lastIndex - 2))
		} else {
			output += text.slice(k, reg.lastIndex)
		}
		if (singleQuote) {
			let i = reg.lastIndex
			while (i < text.length) {
				if (text[i] === "'") {
					i++
					break
				}
				i++
			}
			output += text.slice(reg.lastIndex, i)
			reg.lastIndex = i
		} else if (doubleQuote) {
			let i = reg.lastIndex
			while (i < text.length) {
				if (text[i] === '"') {
					i++
					break
				}
				i++
			}
			output += text.slice(reg.lastIndex, i)
			reg.lastIndex = i
		} else if (lineComment) {
			let i = reg.lastIndex
			while (i < text.length) {
				if (text[i] === "\n") {
					i++
					break
				}
				i++
			}
			reg.lastIndex = i
		} else if (blockComment) {
			let i = reg.lastIndex
			while (i < text.length) {
				if (text.slice(i, i + 2) === "*/") {
					i += 2
					break
				}
				i++
			}
			reg.lastIndex = i
		}
		k = reg.lastIndex
	}
	if (k < text.length) {
		output += formatCssValueSpace(text.slice(k))
	}
	return output
}

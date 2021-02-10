import type { DocumentLink } from "vscode-languageserver"
import { TextDocument } from "vscode-languageserver-textdocument"
import { Tailwind } from "~/tailwind"
import { Cache, InitOptions } from "."
import docs from "./docs.yaml"
import { findAllMatch, PatternKind } from "~/common/ast"
import * as tw from "~/common/twin"
import findAllClasses from "~/common/findAllClasses"

function lastUrlToken(url: string) {
	if (url.includes("twin")) {
		return "twin"
	}
	const i = url.lastIndexOf("/")
	if (i === -1) {
		return ""
	}
	const token = url.substring(i + 1)
	return token
}

export default function documentLinks(document: TextDocument, state: Tailwind, _: InitOptions, cache: Cache) {
	const links: DocumentLink[] = []
	const cachedResult = cache[document.uri.toString()]
	const s = new Set<number>()
	const tokens = findAllMatch(document)
	for (const { token, kind } of tokens) {
		if (kind === PatternKind.TwinTheme) {
			continue
		}

		const twin = kind === PatternKind.Twin || kind === PatternKind.TwinCssProperty
		const prefix = twin ? "tw." : ""
		const [start, , value] = token

		const c = cachedResult[value]
		if (!c) {
			const result = findAllClasses({
				input: value,
				separator: state.separator,
			})
			cachedResult[value] = result
		}

		const { classList, emptyList } = cachedResult[value]

		for (const c of classList) {
			for (const [a, b, value] of c.variants) {
				const bp = state.classnames.getBreakingPoint(value)
				const iv = state.classnames.isVariant(value, twin)
				if (!bp && !iv) continue
				const target = docs[bp ? value : prefix + value]
				if (target && !s.has(start + a)) {
					links.push({
						target,
						tooltip: lastUrlToken(target),
						range: {
							start: document.positionAt(start + a),
							end: document.positionAt(start + b),
						},
					})
					s.add(start + a)
				}
			}

			if (c.kind !== tw.TokenKind.ClassName) {
				continue
			}

			if (kind === PatternKind.TwinCssProperty) {
				continue
			}

			const value = c.token.text
			if (!state.classnames.isClassName(c.variants.texts, twin, value)) {
				continue
			}
			if (value === "content" && c.variants.every(v => v.text !== "before" && v.text !== "after")) {
				continue
			}
			const target = docs[prefix + value] || docs[value]
			if (target) {
				links.push({
					target,
					tooltip: lastUrlToken(target),
					range: {
						start: document.positionAt(start + c.token.start),
						end: document.positionAt(start + c.token.end),
					},
				})
			}
		}
		for (const { variants } of emptyList) {
			for (const [a, b, value] of variants) {
				const bg = state.classnames.getBreakingPoint(value)
				const iv = state.classnames.isVariant(value, twin)
				if (!bg && !iv) continue
				const target = docs[bg ? value : prefix + value]
				if (target && !s.has(start + a)) {
					links.push({
						target,
						tooltip: lastUrlToken(target),
						range: {
							start: document.positionAt(start + a),
							end: document.positionAt(start + b),
						},
					})
					s.add(start + a)
				}
			}
		}
	}
	return links
}
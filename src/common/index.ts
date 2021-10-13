import crypto from "crypto"

export function md5(value: string) {
	return crypto.createHash("md5").update(value, "utf-8").digest("hex")
}

export function escapeRegexp(expression: string) {
	return expression.replace(/[/\\^$*+?.()|[\]{}]/g, "\\$&")
}

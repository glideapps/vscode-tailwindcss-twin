export const arbitraryValueMapping: Record<string, string> = {
	"top-": "top", // <length-percentage>
	"bottom-": "bottom", // <length-percentage>
	"left-": "left", // <length-percentage>
	"right-": "right", // <length-percentage>
	"inset-y-": "top", // <length-percentage>
	"inset-x-": "top", // <length-percentage>
	"inset-": "top", // <length-percentage>
	"z-": "z-index", // <integer>
	"flex-grow-": "flex-grow", // <number>
	"flex-shrink-": "flex-shrink", // <number>
	"order-": "order", // <integer>
	"grid-cols-": "grid-template-columns",
	"grid-rows-": "grid-template-rows",
	"auto-cols-": "grid-auto-columns",
	"auto-rows-": "grid-auto-rows",
	"gap-": "gap", // <length-percentage>
	"gap-x-": "column-gap", // <length-percentage>
	"gap-y-": "row-gap", // <length-percentage>
	"pt-": "padding-top", // <length-percentage>
	"pr-": "padding-right", // <length-percentage>
	"pb-": "padding-bottom", // <length-percentage>
	"pl-": "padding-left", // <length-percentage>
	"px-": "padding-left", // <length-percentage>
	"py-": "padding-top", // <length-percentage>
	"p-": "padding-top", // <length-percentage>
	"mt-": "margin-top", // <length-percentage>
	"mr-": "margin-right", // <length-percentage>
	"mb-": "margin-bottom", // <length-percentage>
	"ml-": "margin-left", // <length-percentage>
	"mx-": "margin-left", // <length-percentage>
	"my-": "margin-top", // <length-percentage>
	"m-": "margin-top", // <length-percentage>
	"w-": "width", // <length-percentage>
	"min-w-": "min-width", // <length-percentage>
	"max-w-": "max-width", // <length-percentage>
	"h-": "height", // <length-percentage>
	"min-h-": "min-height", // <length-percentage>
	"max-h-": "max-height", // <length-percentage>
	"tracking-": "letter-spacing", // <length>
	"leading-": "line-height", // <number> | <length-percentage>
	"text-opacity-": "<number>|<percentage>",
	"text-": "color", // <color>
	"bg-opacity-": "<number>|<percentage>",
	"bg-": "color", // <color>
	"from-": "color", // <color>
	"via-": "color", // <color>
	"to-": "color", // <color>
	"border-t-": "border-top-width", // <line-width>
	"border-b-": "border-bottom-width", // <line-width>
	"border-l-": "border-left-width", // <line-width>
	"border-r-": "border-right-width", // <line-width>
	"border-opacity-": "opacity", // <number> | <percentage>
	"border-": "border-width", // <line-width>
	"rounded-tl-": "border-top-left-radius", // <length-percentage>
	"rounded-tr-": "border-top-right-radius", // <length-percentage>
	"rounded-br-": "border-bottom-right-radius", // <length-percentage>
	"rounded-bl-": "border-bottom-left-radius", // <length-percentage>
	"rounded-t-": "border-top-right-radius", // <length-percentage>
	"rounded-r-": "border-top-right-radius", // <length-percentage>
	"rounded-b-": "border-bottom-left-radius", // <length-percentage>
	"rounded-l-": "border-bottom-left-radius", // <length-percentage>
	"rounded-": "border-radius", // <length-percentage>
	"ring-opacity-": "<number>|<percentage>",
	"ring-offset-": "<length>",
	"ring-": "<length>",
	"opacity-": "<number>|<percentage>",
	"blur-": "<length>",
	"brightness-": "<number>|<percentage>",
	"contrast-": "<number>|<percentage>",
	"grayscale-": "<number>|<percentage>",
	"hue-rotate-": "<angle>",
	"invert-": "<number>|<percentage>",
	"saturate-": "<number>|<percentage>",
	"sepia-": "<number>|<percentage>",
	"backdrop-blur-": "<length>",
	"backdrop-brightness-": "<number>|<percentage>",
	"backdrop-contrast-": "<number>|<percentage>",
	"backdrop-grayscale-": "<number>|<percentage>",
	"backdrop-hue-rotate-": "<angle>",
	"backdrop-invert-": "<number>|<percentage>",
	"backdrop-opacity-": "<number>|<percentage>",
	"backdrop-saturate-": "<number>|<percentage>",
	"backdrop-sepia-": "<number>|<percentage>",
	"scale-x-": "<number>",
	"scale-y-": "<number>",
	"scale-": "<number>",
	"rotate-": "<angle>",
	"translate-x-": "top", // <length-percentage>
	"translate-y-": "top", // <length-percentage>
	"skew-x-": "<angle>",
	"skew-y-": "<angle>",
	"fill-": "background-color", // <color>
	"stroke-": "border-width", // <line-width>
}

export const arbitraryValueDocs: Record<string, string> = {
	"top-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"bottom-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"left-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"right-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"inset-y-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"inset-x-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"inset-": "https://tailwindcss.com/docs/top-right-bottom-left",
	"z-": "https://tailwindcss.com/docs/z-index",
	"flex-grow-": "https://tailwindcss.com/docs/flex-grow",
	"flex-shrink-": "https://tailwindcss.com/docs/flex-shrink",
	"order-": "https://tailwindcss.com/docs/order",
	"grid-cols-": "https://tailwindcss.com/docs/grid-template-columns",
	"grid-rows-": "https://tailwindcss.com/docs/grid-template-rows",
	"auto-cols-": "https://tailwindcss.com/docs/grid-auto-columns",
	"auto-rows-": "https://tailwindcss.com/docs/grid-auto-rows",
	"gap-": "https://tailwindcss.com/docs/gap",
	"gap-x-": "https://tailwindcss.com/docs/gap",
	"gap-y-": "https://tailwindcss.com/docs/gap",
	"pt-": "https://tailwindcss.com/docs/padding",
	"pr-": "https://tailwindcss.com/docs/padding",
	"pb-": "https://tailwindcss.com/docs/padding",
	"pl-": "https://tailwindcss.com/docs/padding",
	"px-": "https://tailwindcss.com/docs/padding",
	"py-": "https://tailwindcss.com/docs/padding",
	"p-": "https://tailwindcss.com/docs/padding",
	"mt-": "https://tailwindcss.com/docs/margin",
	"mr-": "https://tailwindcss.com/docs/margin",
	"mb-": "https://tailwindcss.com/docs/margin",
	"ml-": "https://tailwindcss.com/docs/margin",
	"mx-": "https://tailwindcss.com/docs/margin",
	"my-": "https://tailwindcss.com/docs/margin",
	"m-": "https://tailwindcss.com/docs/margin",
	"w-": "https://tailwindcss.com/docs/width",
	"min-w-": "https://tailwindcss.com/docs/min-width",
	"max-w-": "https://tailwindcss.com/docs/max-width",
	"h-": "https://tailwindcss.com/docs/height",
	"min-h-": "https://tailwindcss.com/docs/min-height",
	"max-h-": "https://tailwindcss.com/docs/max-height",
	"tracking-": "https://tailwindcss.com/docs/letter-spacing",
	"leading-": "https://tailwindcss.com/docs/line-height",
	"text-opacity-": "https://tailwindcss.com/docs/text-opacity",
	"text-": "https://tailwindcss.com/docs/text-color",
	"bg-opacity-": "https://tailwindcss.com/docs/background-opacity",
	"bg-": "https://tailwindcss.com/docs/background-color",
	"from-": "https://tailwindcss.com/docs/gradient-color-stops",
	"via-": "https://tailwindcss.com/docs/gradient-color-stops",
	"to-": "https://tailwindcss.com/docs/gradient-color-stops",
	"border-t-": "https://tailwindcss.com/docs/border-width",
	"border-b-": "https://tailwindcss.com/docs/border-width",
	"border-l-": "https://tailwindcss.com/docs/border-width",
	"border-r-": "https://tailwindcss.com/docs/border-width",
	"border-opacity-": "https://tailwindcss.com/docs/border-opacity",
	"border-": "https://tailwindcss.com/docs/border-width",
	"rounded-tl-": "https://tailwindcss.com/docs/border-radius",
	"rounded-tr-": "https://tailwindcss.com/docs/border-radius",
	"rounded-br-": "https://tailwindcss.com/docs/border-radius",
	"rounded-bl-": "https://tailwindcss.com/docs/border-radius",
	"rounded-t-": "https://tailwindcss.com/docs/border-radius",
	"rounded-r-": "https://tailwindcss.com/docs/border-radius",
	"rounded-b-": "https://tailwindcss.com/docs/border-radius",
	"rounded-l-": "https://tailwindcss.com/docs/border-radius",
	"rounded-": "https://tailwindcss.com/docs/border-radius",
	"ring-opacity-": "https://tailwindcss.com/docs/ring-opacity",
	"ring-offset-": "https://tailwindcss.com/docs/ring-offset-width",
	"ring-": "https://tailwindcss.com/docs/ring-width",
	"opacity-": "https://tailwindcss.com/docs/opacity",
	"blur-": "https://tailwindcss.com/docs/blur",
	"brightness-": "https://tailwindcss.com/docs/brightness",
	"contrast-": "https://tailwindcss.com/docs/contrast",
	"grayscale-": "https://tailwindcss.com/docs/grayscale",
	"hue-rotate-": "https://tailwindcss.com/docs/hue-rotate",
	"invert-": "https://tailwindcss.com/docs/invert",
	"saturate-": "https://tailwindcss.com/docs/saturate",
	"sepia-": "https://tailwindcss.com/docs/sepia",
	"backdrop-blur-": "https://tailwindcss.com/docs/backdrop-blur",
	"backdrop-brightness-": "https://tailwindcss.com/docs/backdrop-brightness",
	"backdrop-contrast-": "https://tailwindcss.com/docs/backdrop-contrast",
	"backdrop-grayscale-": "https://tailwindcss.com/docs/backdrop-grayscale",
	"backdrop-hue-rotate-": "https://tailwindcss.com/docs/backdrop-hue-rotate",
	"backdrop-invert-": "https://tailwindcss.com/docs/backdrop-invert",
	"backdrop-opacity-": "https://tailwindcss.com/docs/backdrop-opacity",
	"backdrop-saturate-": "https://tailwindcss.com/docs/backdrop-saturate",
	"backdrop-sepia-": "https://tailwindcss.com/docs/backdrop-sepia",
	"scale-x-": "https://tailwindcss.com/docs/scale",
	"scale-y-": "https://tailwindcss.com/docs/scale",
	"scale-": "https://tailwindcss.com/docs/scale",
	"rotate-": "https://tailwindcss.com/docs/rotate",
	"translate-x-": "https://tailwindcss.com/docs/translate",
	"translate-y-": "https://tailwindcss.com/docs/translate",
	"skew-x-": "https://tailwindcss.com/docs/skew",
	"skew-y-": "https://tailwindcss.com/docs/skew",
	"fill-": "https://tailwindcss.com/docs/fill",
	"stroke-": "https://tailwindcss.com/docs/stroke",
}

export default arbitraryValueMapping

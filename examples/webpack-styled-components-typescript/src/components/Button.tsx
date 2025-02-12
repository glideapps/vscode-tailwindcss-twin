import tw, { styled } from "twin.macro"

interface Props {
	isPrimary?: boolean
	isSecondary?: boolean
	isSmall?: boolean
}

export const Button = styled.button<Props>(({ theme, isPrimary, isSecondary, isSmall }) => [
	// The common button styles added with the tw import
	tw`text-lg px-8 py-2 rounded`,
	tw`duration-75`,

	// Use the variant grouping feature to add variants to multiple classes
	tw`hocus:(scale-105 text-yellow-400)`,

	// Use props to conditionally style your components
	isPrimary && tw`bg-black text-white border-black`,

	// Combine regular css with tailwind classes within backticks
	isSecondary && tw`border-2 border-yellow-600 box-shadow[0 0.1em 0 0 rgba(0, 0, 0, 0.25)]`,

	// Conditional props can be added
	isSmall ? tw`text-sm` : tw`text-lg`,

	// The theme import can supply values from your tailwind.config.js
	// css`
	// 	color: ${theme.colors.primary};
	// `,
])

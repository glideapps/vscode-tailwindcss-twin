import { forwardRef, InputHTMLAttributes } from "react"
import tw, { styled } from "twin.macro"
import { v4 } from "uuid"

const InputControl = tw.input`hidden`

const CustomInput = styled.label`
	${tw`
		w-[3.7rem] h-[1.8rem]
		relative transition rounded-full bg-gray-300
		px-0 py-[0.4rem]
		flex items-center justify-between
		cursor-pointer select-none
	`}

	${tw`
		after:(
			w-[1.3rem] h-[1.3rem]
			top-[0.25rem] left-[0.16rem]
			translate-x-[0.14rem]
			content transition cursor-pointer rounded-full absolute bg-white
			border border-[#597a64]
		)
		[&:hover::after]:(box-shadow[0 0 1px 2px rgba(66, 153, 225, 0.5)])
	`}

	${InputControl}:checked + & {
		${tw`bg-green-400`}
	}

	${InputControl}:checked + &::after {
		${tw`translate-x-[2rem]`}
	}

	${InputControl}:checked + &:hover::after {
		${tw`box-shadow[0 0 1px 2px rgba(68, 0, 255, 0.5)]`}
	}
`

export default forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ id = v4(), ...props }, ref) => {
	return (
		<div tw="inline-block relative">
			<InputControl ref={ref} id={id} type="checkbox" {...props} />
			<CustomInput htmlFor={id} />
		</div>
	)
})

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * The only class-composition path in this design system.
 *
 * `clsx` resolves conditionals; `tailwind-merge` makes a later class actually
 * beat an earlier one in the same Tailwind group (`px-2` then `px-4` → `px-4`,
 * not both). Plain template strings get the first half and not the second,
 * which is why a `className` prop appended by hand silently loses to the
 * component's own default.
 *
 * It lives at `lib/utils.ts` and not `lib/cn.ts` on purpose: every file the
 * shadcn CLI generates imports `@/lib/utils`, and `components.json` points its
 * `utils` alias here. Any other filename means hand-editing every install.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

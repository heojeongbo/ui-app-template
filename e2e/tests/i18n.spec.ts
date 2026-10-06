import { expect, type Page, test } from "@playwright/test";

/**
 * The language chain, end to end.
 *
 * Every link in it is covered by a unit test on its own — detection, the
 * store's schema, `nextLocale`, the formatters. What only a real browser can
 * show is that they are actually WIRED to each other: the store's value has to
 * reach `<html lang>`, reach the dictionaries React renders, and survive a
 * reload through localStorage. Any one of those three being unconnected leaves
 * every unit test green and the feature dead.
 *
 * The suite pins `locale: "en-US"` (playwright.config.ts), so these tests
 * start from English by construction rather than by luck.
 */

async function signIn(page: Page) {
	await page.goto("/signin");
	await page.getByLabel("Username").fill("operator");
	await page.getByLabel("Password").fill("password123");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("/");
}

test.describe("language", () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test("switching re-renders the app and relabels the document", async ({
		page,
	}) => {
		await expect(page.locator("html")).toHaveAttribute("lang", "en-US");
		await expect(
			page.getByRole("link", { name: "Browse items" }),
		).toBeVisible();

		// The switcher is labelled in the language it OFFERS, so the English page
		// shows the Korean words — which is what makes it findable by the person
		// who cannot read the rest of the page.
		await page.getByRole("button", { name: "한국어로 전환" }).click();

		await expect(page.locator("html")).toHaveAttribute("lang", "ko-KR");
		await expect(
			page.getByRole("link", { name: "품목 둘러보기" }),
		).toBeVisible();
	});

	test("the choice survives a reload", async ({ page }) => {
		await page.getByRole("button", { name: "한국어로 전환" }).click();
		await expect(page.locator("html")).toHaveAttribute("lang", "ko-KR");

		await page.reload();

		// Rehydrated from localStorage and validated by the store's schema. If
		// the persisted tag failed validation this would silently fall back to
		// English — which is exactly the failure the schema exists to make
		// visible rather than mysterious.
		await expect(page.locator("html")).toHaveAttribute("lang", "ko-KR");
		await expect(
			page.getByRole("link", { name: "품목 둘러보기" }),
		).toBeVisible();
	});

	test("a switch reaches the data screens, not just the chrome", async ({
		page,
	}) => {
		await page.goto("/items");
		await expect(
			page.getByRole("columnheader", { name: "Name" }),
		).toBeVisible();
		await expect(page.getByText("1–20 of 47")).toBeVisible();

		await page.getByRole("button", { name: "한국어로 전환" }).click();

		// Column headers come from the items dictionary, and the range label is
		// an insertion whose Korean form REORDERS the numbers — "총 47개 중 1–20"
		// rather than "1–20 of 47". A frame assembled in JSX could not do that,
		// which is the whole reason the entry is an insertion.
		await expect(
			page.getByRole("columnheader", { name: "이름" }),
		).toBeVisible();
		await expect(page.getByText("총 47개 중 1–20")).toBeVisible();
	});
});

test("a validation message is built in the language on screen", async ({
	page,
}) => {
	// The proof that the schema factory's `useMemo` is keyed on the MESSAGES.
	//
	// The factory shape was always right — `signInSchema(copy)` — but the call
	// site memoised on `[]`, which was harmless only while copy was a module
	// constant. Once it became a dictionary read, an empty dep array froze the
	// language of the FIRST render into the schema: the page switched and the
	// validation messages did not. Switching before submitting is what makes
	// that visible; submitting first would only show the messages built at
	// mount, in either version. See docs/ux/forms.md.
	await page.goto("/signin");
	await page.getByRole("button", { name: "한국어로 전환" }).click();

	await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();

	await page.getByLabel("사용자 이름").fill("operator");
	await page.getByRole("button", { name: "로그인" }).click();

	await expect(page.getByRole("alert")).toHaveText(/비밀번호를 입력하세요/);
});

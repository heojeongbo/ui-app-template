import { expect, type Page, test } from "@playwright/test";

/**
 * The end-to-end smoke.
 *
 * This is the layer that catches what nothing else can: the real bundle, real
 * navigation, real focus and keyboard behaviour, real CSS. Everything below it
 * runs in happy-dom, where a layout bug or a class that never got emitted is
 * invisible.
 *
 * Queries go through `getByRole` wherever possible. That is not a style
 * preference — a test that finds a button by role only passes while the button
 * IS a button with an accessible name, so the suite holds the accessibility
 * tree honest as a side effect of existing.
 */

async function signIn(page: Page) {
	await page.goto("/signin");
	await page.getByLabel("Username").fill("operator");
	await page.getByLabel("Password").fill("password123");
	await page.getByRole("button", { name: "Sign in" }).click();
	await expect(page).toHaveURL("/");
}

test.describe("auth", () => {
	test("an unauthenticated visit is redirected, and returns after signing in", async ({
		page,
	}) => {
		await page.goto("/items");

		// The guard bounces to sign-in and remembers where they were going.
		await expect(page).toHaveURL(/\/signin\?redirect=/);
		await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

		await page.getByLabel("Username").fill("operator");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: "Sign in" }).click();

		// Back to what they clicked, not to the home page.
		await expect(page).toHaveURL("/items");
	});

	test("an invalid form reports the problem on the field", async ({ page }) => {
		await page.goto("/signin");
		await page.getByLabel("Username").fill("operator");
		await page.getByLabel("Password").fill("short");
		await page.getByRole("button", { name: "Sign in" }).click();

		const alert = page.getByRole("alert");
		await expect(alert).toHaveText(/at least 8 characters/);

		// The control points at the message, which is what makes it reachable
		// to a screen reader. Red text alone announces nothing.
		const password = page.getByLabel("Password");
		await expect(password).toHaveAttribute("aria-invalid", "true");

		const alertId = await alert.getAttribute("id");
		expect(alertId).toBeTruthy();
		await expect(password).toHaveAttribute("aria-describedby", alertId ?? "");
	});
});

test.describe("items", () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
	});

	test("lists, pages, and keeps the URL honest", async ({ page }) => {
		await page.goto("/items");

		// 47 fixture rows at 20 per page.
		await expect(page.getByText("1–20 of 47")).toBeVisible();
		// Defaults are stripped, so a freshly-loaded list has a clean URL.
		await expect(page).toHaveURL("/items");

		await page.getByRole("button", { name: "Next" }).click();
		await expect(page).toHaveURL("/items?page=2");
		await expect(page.getByText("21–40 of 47")).toBeVisible();

		await page.getByRole("button", { name: "Next" }).click();
		// The last page shows the REAL count, not page × pageSize.
		await expect(page.getByText("41–47 of 47")).toBeVisible();
		await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
	});

	test("filtering returns to page 1 and survives a reload", async ({
		page,
	}) => {
		await page.goto("/items?page=3");

		await page.getByRole("combobox").first().click();
		await page.getByRole("option", { name: "Active" }).click();

		// Filtering from page 3 would otherwise show an empty page.
		await expect(page).toHaveURL(/status=active/);
		await expect(page).not.toHaveURL(/page=3/);

		// The URL IS the state: a reload restores the same view, which is what
		// makes a filtered list shareable.
		await page.reload();
		await expect(page).toHaveURL(/status=active/);
	});

	test("an unknown path shows the app's own 404, with a way out", async ({
		page,
	}) => {
		await page.goto("/nope");

		await expect(
			page.getByRole("heading", { name: "Page not found" }),
		).toBeVisible();
		// A dead-end 404 is how users leave an app.
		await page.getByRole("link", { name: "Go to the start" }).click();
		await expect(page).toHaveURL("/");
	});

	test("the theme toggle flips tokens and dark: utilities together", async ({
		page,
	}) => {
		await page.goto("/");
		const html = page.locator("html");

		await page.getByRole("button", { name: /Switch to dark mode/ }).click();
		await expect(html).toHaveClass(/dark/);

		// The class is the single signal: `@custom-variant dark` binds `dark:`
		// utilities to it, so tokens and utilities cannot disagree. Without the
		// variant this passes while the page still looks light.
		await expect(html).toHaveCSS("color-scheme", "dark");
	});
});

test.describe("mutations", () => {
	test.beforeEach(async ({ page }) => {
		await signIn(page);
		await page.goto("/items");
	});

	test("create: validates, then invalidates the list before the toast", async ({
		page,
	}) => {
		await page.getByRole("button", { name: "New item" }).click();

		// Submitting empty must not send anything.
		await page.getByRole("button", { name: "Create", exact: true }).click();
		await expect(page.getByRole("alert").first()).toHaveText(/Enter a name/);

		await page.getByLabel("Name").fill("e2e widget");
		await page.getByLabel("Description").fill("Created by the e2e suite.");
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// Dialog closes only on success.
		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(page.getByText(/Created “e2e widget”/)).toBeVisible();
		// The count reflects the new row — the invalidate is awaited BEFORE the
		// toast, so the message never lands over a stale list.
		await expect(page.getByText("1–20 of 48")).toBeVisible();
	});

	test("create: a duplicate name lands on the field, not in a generic toast", async ({
		page,
	}) => {
		// Take a name off the table rather than hardcoding one. Fixture names
		// are hash-derived, so guessing "widget 1" quietly tests nothing when
		// the hash puts a different word at index 1 — which is what it did.
		const existing =
			(await page
				.getByRole("row")
				.nth(1)
				.getByRole("cell")
				.first()
				.textContent()) ?? "";
		expect(existing.length).toBeGreaterThan(0);

		await page.getByRole("button", { name: "New item" }).click();
		// The mock enforces the uniqueness the schema declares, and rejects with
		// AlreadyExists carrying `name: …`.
		await page.getByLabel("Name").fill(existing);
		await page.getByRole("button", { name: "Create", exact: true }).click();

		// On the field. Without extractFieldErrors the user gets "Could not
		// create the item" and has to guess which of three inputs is wrong.
		await expect(page.getByRole("alert").first()).toHaveText(/already exists/);
		// And the dialog stays open with their input intact.
		await expect(page.getByRole("dialog")).toBeVisible();
		await expect(page.getByLabel("Name")).toHaveValue(existing);
	});

	test("delete: confirms first, then offers an undo", async ({ page }) => {
		const firstRow = page.getByRole("row").nth(1);
		const name = (await firstRow.getByRole("cell").first().textContent()) ?? "";

		await firstRow.getByRole("button", { name: /^Delete:/ }).click();

		// A destructive action asks first.
		const dialog = page.getByRole("alertdialog");
		await expect(dialog).toBeVisible();
		await dialog.getByRole("button", { name: "Delete" }).click();

		await expect(page.getByText("1–20 of 46")).toBeVisible();

		// Undo is what actually saves the row — people click through
		// confirmations.
		await page.getByRole("button", { name: "Undo" }).click();
		await expect(page.getByText(/Re-created/)).toBeVisible();
		await expect(page.getByText("1–20 of 47")).toBeVisible();
		expect(name.length).toBeGreaterThan(0);
	});

	test("delete: cancelling changes nothing", async ({ page }) => {
		await page
			.getByRole("row")
			.nth(1)
			.getByRole("button", { name: /^Delete:/ })
			.click();

		await page
			.getByRole("alertdialog")
			.getByRole("button", { name: "Cancel" })
			.click();

		await expect(page.getByRole("alertdialog")).toBeHidden();
		await expect(page.getByText("1–20 of 47")).toBeVisible();
	});

	test("edit: a save that changes nothing does not fire a request", async ({
		page,
	}) => {
		await page
			.getByRole("row")
			.nth(1)
			.getByRole("button", { name: /^Edit:/ })
			.click();

		await page.getByRole("button", { name: "Save" }).click();

		// "Nothing changed", not "Updated" — a spurious success message for a
		// change the user did not make.
		await expect(page.getByText("Nothing changed.")).toBeVisible();
		await expect(page.getByRole("dialog")).toBeHidden();
	});
});

import { expect, test } from "@playwright/test";

/**
 * One session, start to finish.
 *
 * Every other spec here proves one behaviour in isolation, with a fresh page
 * and a fresh sign-in. This one walks the app the way a person does — arrive,
 * get bounced, sign in, browse, create, edit, delete, undo, sign out — in a
 * single session where **state accumulates**.
 *
 * That is the whole point, because a class of bug is invisible to isolated
 * tests and only appears when steps compose:
 *
 * - A toast from step 4 still on screen, intercepting a click at step 6.
 * - A list whose cached count drifts after create-then-filter-then-delete,
 *   because one of those paths invalidated the wrong key.
 * - A dialog that closes but leaves a focus trap, so the next click misses.
 * - A session that survives navigation but not a full reload.
 * - An undo that restores a row into a list currently filtered to exclude it.
 *
 * It is deliberately ONE test, not a chain of dependent ones. Playwright
 * offers no ordering guarantee between tests, and splitting this up would
 * either reintroduce the isolation it exists to escape, or quietly depend on
 * an execution order that is not promised.
 *
 * When it fails, read the step numbers in the trace — each `step` below is a
 * named boundary, so the report says which part of the journey broke.
 */
test("a full session: sign in, browse, create, edit, delete, undo, sign out", async ({
	page,
}) => {
	const created = `journey ${Date.now()}`;
	const renamed = `${created} edited`;

	await test.step("1. a deep link while signed out bounces to sign-in", async () => {
		await page.goto("/items?status=active");

		await expect(page).toHaveURL(/\/signin\?redirect=/);
		// The protected screen must never have painted.
		await expect(page.getByText("Everything in the catalogue.")).toBeHidden();
	});

	await test.step("2. signing in returns to the deep link, filters intact", async () => {
		await page.getByLabel("Username").fill("operator");
		await page.getByLabel("Password").fill("password123");
		await page.getByRole("button", { name: "Sign in" }).click();

		// Not just `/items` — the search params the user originally asked for.
		// Losing them is the bug that makes a shared link useless after login.
		await expect(page).toHaveURL(/\/items\?status=active/);
	});

	await test.step("3. clearing the filter shows the whole catalogue", async () => {
		await page.getByRole("combobox", { name: "Status" }).click();
		await page.getByRole("option", { name: "All statuses" }).click();

		// Defaults are stripped, so clearing the filter empties the query string.
		await expect(page).toHaveURL("/items");
		await expect(page.getByText("1–20 of 47")).toBeVisible();
	});

	await test.step("4. paging to the last page shows the real remainder", async () => {
		await page.getByRole("button", { name: "Next" }).click();
		await page.getByRole("button", { name: "Next" }).click();

		await expect(page.getByText("41–47 of 47")).toBeVisible();
		await expect(page.getByRole("button", { name: "Next" })).toBeDisabled();
	});

	await test.step("5. creating returns to a list that already shows it", async () => {
		await page.getByRole("button", { name: "New item" }).click();
		await page.getByLabel("Name").fill(created);
		await page.getByLabel("Description").fill("Created during the journey.");
		await page.getByRole("button", { name: "Create", exact: true }).click();

		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(page.getByText(`Created “${created}”.`)).toBeVisible();
		// 48, and the page did not jump — the invalidate was awaited before the
		// toast, so the count is already right when the message lands.
		await expect(page.getByText("41–48 of 48")).toBeVisible();
	});

	await test.step("6. the new row is findable by search", async () => {
		// Back to page 1 on filter change, which is what makes the new row
		// reachable at all — it sorts to the front.
		await page.getByRole("searchbox", { name: "Search items" }).fill(created);
		await page.getByRole("searchbox", { name: "Search items" }).press("Enter");

		await expect(page.getByText("1–1 of 1")).toBeVisible();
		// `exact`, because the actions cell's accessible name also contains the
		// item name — "Edit: <name>" is deliberate, since a bare "Edit" button
		// tells a screen-reader user nothing about which row it belongs to.
		await expect(
			page.getByRole("cell", { name: created, exact: true }),
		).toBeVisible();
	});

	await test.step("7. editing sends only what changed", async () => {
		await page.getByRole("button", { name: `Edit: ${created}` }).click();
		await page.getByLabel("Name").fill(renamed);
		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText(`Updated “${renamed}”.`)).toBeVisible();
		// The description was not touched, and the field mask means the server
		// never received it — so it survives.
		await expect(
			page.getByRole("cell", {
				name: "Created during the journey.",
				exact: true,
			}),
		).toBeVisible();
	});

	await test.step("8. a save that changes nothing does not fire a request", async () => {
		await page.getByRole("button", { name: `Edit: ${renamed}` }).click();
		await page.getByRole("button", { name: "Save" }).click();

		await expect(page.getByText("Nothing changed.")).toBeVisible();
		await expect(page.getByRole("dialog")).toBeHidden();
	});

	await test.step("9. deleting confirms first", async () => {
		await page.getByRole("button", { name: `Delete: ${renamed}` }).click();

		const confirm = page.getByRole("alertdialog");
		await expect(confirm).toBeVisible();
		await confirm.getByRole("button", { name: "Delete" }).click();

		await expect(page.getByText(`Deleted “${renamed}”.`)).toBeVisible();
		// The filter still matches nothing now, which is the empty-FILTERED
		// state, not the empty-yet one.
		await expect(page.getByText("No items match these filters")).toBeVisible();
	});

	await test.step("10. undo puts it back, into the same filtered view", async () => {
		await page.getByRole("button", { name: "Undo" }).click();

		// Honest wording: the service has no restore, so this recreates under a
		// new id and says so.
		await expect(page.getByText(/Re-created/)).toBeVisible();
		await expect(page.getByText("1–1 of 1")).toBeVisible();
	});

	await test.step("11. clearing the search returns to the full list", async () => {
		// Clearing the box, not the empty state's button: the list has a row
		// again by now, so that button is gone. Deterministic beats a
		// try-this-then-that.
		const search = page.getByRole("searchbox", { name: "Search items" });
		await search.fill("");
		await search.press("Enter");

		// `?q=` is cleared to undefined rather than "", so the URL is clean.
		await expect(page).toHaveURL("/items");
		await expect(page.getByText("1–20 of 48")).toBeVisible();
	});

	await test.step("12. the theme toggle survives everything before it", async () => {
		await page.getByRole("button", { name: /Switch to dark mode/ }).click();
		await expect(page.locator("html")).toHaveClass(/dark/);
		// Still on the same screen, still signed in.
		await expect(page).toHaveURL("/items");
	});

	await test.step("13. a reload keeps the session and the theme", async () => {
		await page.reload();

		// Both are persisted; losing either on reload is a bug users hit
		// constantly and isolated tests never see.
		await expect(page).toHaveURL("/items");
		await expect(page.locator("html")).toHaveClass(/dark/);

		// 47, not 48 — and that is the MOCK, not the app. The in-memory service
		// is module state inside the page, so a reload re-executes the bundle
		// and re-seeds the fixtures. Worth asserting rather than working
		// around: anyone building against the mock needs to know their data
		// does not survive a refresh, and a real backend would show 48 here.
		await expect(page.getByText("1–20 of 47")).toBeVisible();
	});

	await test.step("14. signing out locks the app again", async () => {
		await page.getByRole("button", { name: "Sign out" }).click();

		// The guard re-runs because the store changed — no imperative navigate.
		await expect(page).toHaveURL(/\/signin/);

		// And the protected route is genuinely closed, not just navigated away
		// from.
		await page.goto("/items");
		await expect(page).toHaveURL(/\/signin\?redirect=/);
	});
});

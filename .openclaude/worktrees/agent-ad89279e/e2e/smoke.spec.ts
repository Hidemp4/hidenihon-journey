import { expect, test } from "../playwright-fixture";

test("carrega a página inicial", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page).toHaveTitle(/HideNihon/i);
  await expect(page.locator("#root")).not.toBeEmpty();
});

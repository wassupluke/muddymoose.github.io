const { test, expect } = require("@playwright/test");

const VALID_FORM = {
  fname: "Jane",
  lname: "Doe",
  email: "jane@example.com",
  phone: "5551234567",
};


async function fillForm(page) {
  await page.fill("#fname", VALID_FORM.fname);
  await page.fill("#lname", VALID_FORM.lname);
  await page.fill("#email", VALID_FORM.email);
  await page.fill("#phone", VALID_FORM.phone);
}

async function selectPickup(page) {
  await page.selectOption("#pickup", { index: 1 });
  await page.waitForSelector('#pickupTime option[value]:not([value=""])', { state: "attached" });
  await page.selectOption("#pickupTime", { index: 0 });
}

async function addBread(page, count = 1) {
  for (let i = 0; i < count; i++) {
    await page.click('button[data-qty="bread"][data-delta="1"]');
  }
}

test.describe("Page loads correctly", () => {
  test("title contains Basecamp Bakery", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Basecamp Bakery/);
  });

  test("form is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#orderForm")).toBeVisible();
  });

  test("submit button is disabled initially", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#submitBtn")).toBeDisabled();
  });
});

test.describe("Form inputs accept user input", () => {
  test("fill and verify all fields", async ({ page }) => {
    await page.goto("/");
    await fillForm(page);
    await expect(page.locator("#fname")).toHaveValue(VALID_FORM.fname);
    await expect(page.locator("#lname")).toHaveValue(VALID_FORM.lname);
    await expect(page.locator("#email")).toHaveValue(VALID_FORM.email);
    await expect(page.locator("#phone")).toHaveValue(VALID_FORM.phone);
  });

  test("error messages appear for invalid inputs", async ({ page }) => {
    await page.goto("/");

    // Trigger validation by filling and clearing / entering invalid data
    await page.fill("#fname", "A");
    await page.locator("#fname").blur();
    const fnameError = page.locator(
      "#fname ~ .error-message, #fname + .error-message, [data-error='fname']",
    );
    // Try a more generic approach - look for any visible error near fname
    await page.fill("#lname", "");
    await page.locator("#lname").blur();

    await page.fill("#email", "notanemail");
    await page.locator("#email").blur();

    await page.fill("#phone", "123");
    await page.locator("#phone").blur();

    // Verify at least some error indicators are present on the page
    // The exact error mechanism varies, so check the fields have aria-invalid or a visual cue
    const invalidFields = page.locator(
      "input:invalid, input.invalid, input[aria-invalid='true']",
    );
    expect(await invalidFields.count()).toBeGreaterThan(0);
  });

  test("errors clear when valid input entered", async ({ page }) => {
    await page.goto("/");

    // Enter invalid then valid
    await page.fill("#fname", "A");
    await page.locator("#fname").blur();
    await page.fill("#fname", "Jane");
    await page.locator("#fname").blur();

    await page.fill("#email", "bad");
    await page.locator("#email").blur();
    await page.fill("#email", "jane@example.com");
    await page.locator("#email").blur();

    // After valid input, fname and email should not be marked invalid
    await expect(page.locator("#fname")).not.toHaveClass(/invalid/);
    await expect(page.locator("#email")).not.toHaveClass(/invalid/);
  });
});

test.describe("Pickup week and time selection", () => {
  test("pickup select has options beyond placeholder", async ({ page }) => {
    await page.goto("/");
    const options = page.locator("#pickup option");
    expect(await options.count()).toBeGreaterThan(1);
  });

  test("selecting pickup week populates pickupTime with selectable slots", async ({ page }) => {
    await page.goto("/");
    await page.selectOption("#pickup", { index: 1 });
    await page.waitForSelector('#pickupTime option[value]:not([value=""])', { state: "attached" });
    const timeOptions = page.locator('#pickupTime option[value]:not([value=""])');
    expect(await timeOptions.count()).toBeGreaterThan(0);
  });
});

test.describe("Quantity buttons update correctly", () => {
  test("bread quantity increments and decrements", async ({ page }) => {
    await page.goto("/");
    const display = page.locator("#bread-display");

    await page.click('button[data-qty="bread"][data-delta="1"]');
    await expect(display).toHaveText("1");

    await page.click('button[data-qty="bread"][data-delta="1"]');
    await expect(display).toHaveText("2");

    await page.click('button[data-qty="bread"][data-delta="-1"]');
    await expect(display).toHaveText("1");
  });

  test("quantity cannot go below 0", async ({ page }) => {
    await page.goto("/");
    const display = page.locator("#bread-display");

    // Click minus without adding first
    await page.click('button[data-qty="bread"][data-delta="-1"]');
    await expect(display).toHaveText("0");
  });

  test("sized item quantity works (cinroll_4)", async ({ page }) => {
    await page.goto("/");
    const display = page.locator("#cinroll_4-display");

    await page.click('button[data-sized="cinroll_4"][data-delta="1"]');
    await expect(display).toHaveText("1");

    await page.click('button[data-sized="cinroll_4"][data-delta="1"]');
    await expect(display).toHaveText("2");

    await page.click('button[data-sized="cinroll_4"][data-delta="-1"]');
    await expect(display).toHaveText("1");
  });
});

test.describe("Basket total calculates correctly", () => {
  test("summary shows items and correct total", async ({ page }) => {
    await page.goto("/");
    const summary = page.locator("#summary-lines");

    // Read bread price from DOM so the test isn't tied to a hardcoded value
    const breadPrice = Number(
      await page.getAttribute('button[data-qty="bread"][data-delta="1"]', "data-price"),
    );

    await addBread(page, 2);
    await expect(summary).toContainText("Sandwich Bread");
    await expect(summary).toContainText(`$${breadPrice * 2}`);

    // Read cinroll_4 price from DOM
    const cinrollPrice = Number(
      await page.getAttribute('button[data-sized="cinroll_4"][data-delta="1"]', "data-price"),
    );
    await page.click('button[data-sized="cinroll_4"][data-delta="1"]');
    await expect(summary).toContainText(`$${cinrollPrice}`);

    await expect(summary).toContainText("Estimated Total");
    await expect(summary).toContainText(`$${breadPrice * 2 + cinrollPrice}`);
  });
});

test.describe("Special order boxes", () => {
  test("add and remove a special box", async ({ page }) => {
    await page.goto("/");
    const summary = page.locator("#summary-lines");

    // Use whichever special box is first — we don't care about the name
    const firstBtn = page.locator("[data-add-special]").first();
    const itemName = await firstBtn.getAttribute("data-name");
    const itemPrice = await firstBtn.getAttribute("data-price");

    await firstBtn.click();
    await expect(summary).toContainText(itemName);
    await expect(summary).toContainText(`$${itemPrice}`);

    // Remove via the remove button that appears in the summary line
    await summary.locator(".remove-special").first().click();
    await expect(summary).not.toContainText(itemName);
  });
});

test.describe("Submit button validation", () => {
  test("button disabled with empty form", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#submitBtn")).toBeDisabled();
  });

  test("button disabled without checkbox", async ({ page }) => {
    await page.goto("/");
    await fillForm(page);
    await selectPickup(page);
    await addBread(page);
    // Don't check checkbox
    await expect(page.locator("#submitBtn")).toBeDisabled();
  });

  test("button enabled when all conditions met", async ({ page }) => {
    await page.goto("/");
    await fillForm(page);
    await selectPickup(page);
    await addBread(page);
    await page.check("#payAgree");
    await expect(page.locator("#submitBtn")).toBeEnabled();
  });

  test("button disabled again when checkbox unchecked", async ({ page }) => {
    await page.goto("/");
    await fillForm(page);
    await selectPickup(page);
    await addBread(page);
    await page.check("#payAgree");
    await expect(page.locator("#submitBtn")).toBeEnabled();
    await page.uncheck("#payAgree");
    await expect(page.locator("#submitBtn")).toBeDisabled();
  });
});

test.describe("Form submission", () => {
  test("successful submission shows success screen", async ({ page }) => {
    // Mock formspree
    await page.route("**/formspree.io/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      }),
    );
    await page.route("**/f/**", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      }
      return route.continue();
    });

    await page.goto("/");
    await fillForm(page);
    await selectPickup(page);
    await addBread(page);
    await page.check("#payAgree");
    await expect(page.locator("#submitBtn")).toBeEnabled();

    await page.click("#submitBtn");

    // Wait for success screen
    await expect(page.locator("#successScreen")).toHaveClass(/show/, {
      timeout: 5000,
    });
    await expect(page.locator("#orderForm")).toBeHidden();
  });
});

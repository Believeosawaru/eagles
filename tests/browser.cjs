const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.GAME_TEST_URL || "http://localhost:8089");
  await page
    .getByRole("button", { name: "Build my XI  →", exact: true })
    .waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("textbox", { name: "Manager name" }).fill("Believe");
  await page.getByRole("button", { name: "Explore all 64 players  →" }).click();
  await page.getByRole("textbox", { name: "Search players" }).fill("Osimhen");
  await page.getByText("Victor Osimhen", { exact: true }).click();
  await page
    .getByRole("button", { name: "☆ Save favourite", exact: true })
    .click();
  await page.getByRole("button", { name: "Close player card" }).click();
  await page.getByText("EAGLES 7–0", { exact: true }).click();
  await page
    .getByRole("button", { name: "Build my XI  →", exact: true })
    .click();
  for (let i = 0; i < 11; i++) {
    const b = page.getByRole("button", { name: /^Inspect / }).first();
    await b.waitFor();
    await b.click();
    await page.getByRole("button", { name: /^Sign / }).click();
    if (i === 3) {
      await page.reload();
      await page.getByRole("button", { name: "Resume saved run  ↗" }).click();
    }
  }
  await page.getByRole("button", { name: "Front foot", exact: true }).click();
  await page.getByRole("button", { name: "CASUAL", exact: true }).click();
  await page
    .getByRole("button", { name: "Tournament hub & match preview" })
    .click();
  await page.getByText("NIGERIA MANAGER · Believe", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Open match centre", exact: true })
    .click();
  await page.getByText("MATCH INFO", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Close match centre", exact: true })
    .click();
  await page.getByRole("button", { name: "Groups", exact: true }).click();
  await page.getByText("GROUP H", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Scorers", exact: true }).click();
  await page.getByText("THE GOLDEN BOOT RACE", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Assists", exact: true }).click();
  await page.getByText("THE CREATORS’ CLUB", { exact: true }).waitFor();
  await page
    .getByRole("button", { name: "Back to dressing room", exact: true })
    .click();
  await page.getByRole("button", { name: "Kick off  →" }).click();
  await page.getByRole("button", { name: "Ⅱ Pause" }).click();
  const paused = await page.locator("body").innerText();
  await page.waitForTimeout(800);
  assert.equal(
    (await page.locator("body").innerText()).includes("PAUSED"),
    true,
  );
  await page.getByRole("button", { name: "▶ Resume" }).click();
  await page.getByRole("button", { name: "4×", exact: true }).click();
  for (let i = 0; i < 7; i++) {
    const next = page.getByRole("button", {
      name: /^(Next match|See my result)/,
    });
    await next.waitFor({ timeout: 60000 });
    const label = await next.innerText();
    await next.click();
    if (label.includes("See my result")) break;
  }
  await page.getByRole("button", { name: "Share my XI  ↗" }).waitFor();
  const downloaded = page.waitForEvent("download", { timeout: 60000 });
  await page.getByRole("button", { name: "Share my XI  ↗" }).click();
  assert.equal((await downloaded).suggestedFilename(), "eagles-7-0.png");
  await page.getByRole("button", { name: "Group · 1", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to result", exact: true })
    .waitFor({ timeout: 60000 });
  await page
    .getByRole("button", { name: "Back to result", exact: true })
    .click();
  const savedRun = () =>
    page.evaluate(() => {
      for (const value of Object.values(localStorage)) {
        try {
          const v = JSON.parse(value);
          if (v.session && Array.isArray(v.history)) return v;
        } catch {}
      }
      return null;
    });
  const before = await savedRun();
  await page
    .getByRole("button", { name: "Play again with this XI  ↻", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Kick off  →", exact: true })
    .waitFor();
  await page.waitForTimeout(100);
  const after = await savedRun();
  assert.equal(after.session.seed, before.session.seed);
  assert.deepEqual(after.session.picks, before.session.picks);
  assert.notEqual(after.session.matchSeed, before.session.matchSeed);
  await page.getByText("EAGLES 7–0", { exact: true }).click();
  await page.getByRole("button", { name: "Run history", exact: true }).click();
  await page.getByText("First whistle", { exact: true }).waitFor();
  assert.ok((await page.locator("body").innerText()).includes("EARNED"));
  await page.reload();
  await page.getByRole("button", { name: "Run history", exact: true }).click();
  assert.ok((await page.locator("body").innerText()).includes("1 runs saved"));
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.getByText("EAGLES 7–0", { exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log(
    "PASS: full draft, profile, favourite, reload/resume, tactics, difficulty, pause/resume, speed, virtual match, PNG, persisted history/achievement, mobile+desktop overflow.",
  );
  console.log("Runtime errors:", errors);
  await browser.close();
  if (errors.length) process.exit(1);
})();

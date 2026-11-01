import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Screenshots go here so an agent can open them and look at the rendered UI.
const SHOTS = process.env.UI_SHOTS_DIR || "/tmp/ui-check";
mkdirSync(SHOTS, { recursive: true });

// A fixed Radar feed for the test, so the check never depends on the live scan.
const FEED = [
  {
    id: "smoke-ml-grant",
    type: "GRANT",
    title: "Smoke Test AI Research Grant",
    organization: "QADAM Smoke Test",
    deadline: "2099-01-01",
    url: "https://example.com/grant",
    eligibility: "check source",
    summary: "Fixture listing used only by the UI smoke test.",
    skills: ["PyTorch", "SQL", "AI", "Underwater Basket Weaving"],
  },
];

const PROFILE = {
  name: "Smoke",
  surname: "Tester",
  email: "smoke@example.com",
  university: "Test University",
  major: "AI & Machine Learning",
  location: "Tokyo, Japan",
  role: "Student",
  skills: ["SQL", "Underwater Basket Weaving"],
  goals: [],
  isPublic: false,
  isOnboarded: true,
};

const MEMBERSHIP = {
  userId: "00000000-0000-0000-0000-000000000001",
  cohortId: "00000000-0000-0000-0000-000000000002",
  cohortName: "Smoke cohort",
  institutionName: "Smoke institution",
};

/* Collects uncaught exceptions and console errors, and serves every external host locally. */
async function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1") {
      if (url.pathname === "/data/opportunities.json") {
        return route.fulfill({ json: FEED });
      }
      // No catalog by default, so the other scenarios keep their fixed feed.
      if (url.pathname === "/data/programs.json") {
        return route.fulfill({ json: [] });
      }
      return route.continue();
    }
    return route.fulfill({ status: 200, body: "" });
  });
  return errors;
}

async function expectRendered(page: Page) {
  // A white screen leaves #root empty; a rendered page has visible text.
  await expect(page.locator("#root")).not.toBeEmpty();
  const text = await page.locator("#root").innerText();
  expect(text.trim().length).toBeGreaterThan(40);
}

const PUBLIC_ROUTES = ["/welcome", "/students", "/start", "/student", "/staff", "/privacy", "/terms", "/refund"];

for (const route of PUBLIC_ROUTES) {
  test(`public route ${route} renders without errors`, async ({ page }, info) => {
    const errors = await watch(page);
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expectRendered(page);
    const name = `${info.project.name}${route.replace(/\//g, "-")}.png`;
    await page.screenshot({ path: path.join(SHOTS, name), fullPage: false });
    expect(errors).toEqual([]);
  });
}

test("learner opens CV gaps from the Radar and starts the matching quiz", async ({ page }, info) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile, membership]) => {
      if (sessionStorage.getItem("smoke-seeded")) return;
      sessionStorage.setItem("smoke-seeded", "1");
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_cohort_membership", JSON.stringify(membership));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE, MEMBERSHIP] as const,
  );

  await page.goto("/");
  await expect(page.getByText("Smoke Test AI Research Grant").first()).toBeVisible();
  await expectRendered(page);
  // Only the four type filters; no country or match filters.
  for (const name of ["All", "Hackathons", "Grants", "Internships"]) {
    await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /More filters|Open from|Match/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Internships", exact: true }).click();
  await expect(page.getByText("Smoke Test AI Research Grant")).toHaveCount(0);
  await page.getByRole("button", { name: "Grants", exact: true }).click();
  await expect(page.getByText("Smoke Test AI Research Grant").first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-radar.png`) });

  await page.getByRole("button", { name: "Analyze CV Gaps" }).first().click();
  const gaps = page.getByRole("dialog", { name: "Smoke Test AI Research Grant" });
  await expect(gaps).toBeVisible();
  // Every skill with a quiz gets a button; the one without a quiz says so.
  await expect(gaps.getByText("No quiz yet")).toHaveCount(1);
  await expect(gaps.getByRole("button", { name: /Take Quiz|Verify & Add/ })).toHaveCount(3);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-cv-gaps.png`) });

  // The innermost block that holds both the skill name and its button is that skill's row.
  const pytorchRow = gaps
    .locator("div")
    .filter({ has: page.getByText("PyTorch", { exact: true }) })
    .filter({ has: page.getByRole("button") })
    .last();
  await pytorchRow.getByRole("button").click();
  const quiz = page.getByRole("dialog", { name: /PyTorch/ });
  await expect(quiz).toBeVisible();
  await expect(quiz.getByText("PyTorch Verification").first()).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-quiz.png`) });

  expect(errors).toEqual([]);
});

test("learner without skills sees a readable welcome banner on the Radar", async ({ page }, info) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile, membership]) => {
      if (sessionStorage.getItem("smoke-seeded")) return;
      sessionStorage.setItem("smoke-seeded", "1");
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_cohort_membership", JSON.stringify(membership));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [{ ...PROFILE, skills: [] }, MEMBERSHIP] as const,
  );

  await page.goto("/");
  const title = page.getByText("Welcome to QADAM Opportunity Radar");
  await expect(title).toBeVisible();
  await expect(page.getByRole("link", { name: "Configure Stack" })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-radar-banner.png`) });
  expect(errors).toEqual([]);
});

test("the audience switch moves between the schools and students landings", async ({ page }, info) => {
  const errors = await watch(page);
  await page.goto("/welcome");
  const audience = page.getByRole("navigation", { name: "Choose your audience" });
  await expect(audience).toBeVisible();
  await audience.getByRole("link", { name: "For Students" }).click();
  await expect(page).toHaveURL(/\/students$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Find grants, hackathons and scholarships");
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-students-landing.png`) });
  await page.getByRole("navigation", { name: "Choose your audience" }).getByRole("link", { name: "For Schools" }).click();
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Opportunity and career support for your cohort");
  expect(errors).toEqual([]);
});

test("a student starts in two steps without an invite code and lands on the Radar", async ({ page }, info) => {
  const errors = await watch(page);
  await page.addInitScript(() => localStorage.setItem("qadam_consent_analytics_v1", "denied"));
  await page.goto("/students");
  await page.getByRole("button", { name: "Start free" }).first().click();
  await expect(page).toHaveURL(/\/start$/);
  const welcome = page.getByRole("dialog", { name: "Welcome to QADAM Hub" });
  await expect(welcome).toBeVisible();
  await expect(welcome.getByText("AI skill quizzes")).toBeVisible();
  await expect(welcome.getByText("Gap analysis")).toBeVisible();
  await expect(welcome.getByText("Deadline alerts")).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-welcome-1.png`) });
  // Modals close only through their visible button.
  await page.keyboard.press("Escape");
  await page.mouse.click(4, 4);
  await expect(welcome).toBeVisible();

  await welcome.getByRole("button", { name: "Continue" }).click();
  const start = welcome.getByRole("button", { name: "Start exploring" });
  await expect(start).toBeDisabled();
  await welcome.getByPlaceholder("What should we call you?").fill("Aigerim");
  await expect(start).toBeDisabled();
  await welcome.getByRole("button", { name: "MEXT Scholarship (Japan)" }).click();
  await welcome.getByRole("button", { name: "University Admissions Abroad" }).click();
  await expect(welcome.getByRole("button", { name: "MEXT Scholarship (Japan)" })).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-welcome-2.png`) });
  await start.click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Opportunity Radar" })).toBeVisible();
  const stored = await page.evaluate(() => ({
    profile: JSON.parse(localStorage.getItem("qadam_user") || "{}"),
    membership: localStorage.getItem("qadam_cohort_membership"),
  }));
  expect(stored.profile).toMatchObject({ name: "Aigerim", isOnboarded: true, goals: ["MEXT Scholarship (Japan)", "University Admissions Abroad"], destinations: [] });
  expect(stored.membership).toBeNull();
  expect(errors).toEqual([]);
});

async function openFeedback(page: Page) {
  await page.addInitScript(
    (profile) => {
      if (sessionStorage.getItem("smoke-seeded")) return;
      sessionStorage.setItem("smoke-seeded", "1");
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    PROFILE,
  );
  // A profile without a cohort is enough to use the app.
  await page.goto("/cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.getByRole("button", { name: "Rate the app or send feedback" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Help us improve" })).toBeVisible();
  return dialog;
}

test("the feedback widget sends a bug report and closes only with its button", async ({ page }, info) => {
  const errors = await watch(page);
  let sent: Record<string, unknown> | null = null;
  await page.route("**/api/beta-feedback", async (route) => {
    sent = route.request().postDataJSON();
    await route.fulfill({ json: { status: "ok" } });
  });
  const dialog = await openFeedback(page);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-feedback-menu.png`) });

  await page.keyboard.press("Escape");
  await page.mouse.click(4, 4);
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: /Send feedback or report a bug/ }).click();
  const submit = dialog.getByRole("button", { name: "Send feedback" });
  await expect(submit).toBeDisabled();
  await dialog.getByRole("radio", { name: "Bug" }).click();
  await dialog.getByRole("textbox").fill("The quiz button does nothing on my phone.");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(dialog.getByText("Thank you. We read every report.")).toBeVisible();
  expect(sent).toMatchObject({ type: "bug", description: "The quiz button does nothing on my phone.", pageUrl: "/cv", website: "" });
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-feedback-sent.png`) });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test("a happy rating offers the public review link, a low one does not", async ({ page }, info) => {
  const errors = await watch(page);
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/beta-feedback", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({ json: { status: "ok" } });
  });
  const dialog = await openFeedback(page);

  await dialog.getByRole("button", { name: /Rate the app/ }).click();
  const submit = dialog.getByRole("button", { name: "Send rating" });
  await expect(submit).toBeDisabled();
  await dialog.getByRole("radio", { name: "5 of 5, Great" }).click();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-rating.png`) });
  await submit.click();
  await expect(dialog.getByRole("link", { name: "Leave a public review" })).toHaveAttribute("href", "https://example.com/review");
  expect(sent[0]).toMatchObject({ type: "rating", rating: 5, description: "", pageUrl: "/cv" });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Rate the app or send feedback" }).click();
  await dialog.getByRole("button", { name: /Rate the app/ }).click();
  await dialog.getByRole("radio", { name: "2 of 5, Fair" }).click();
  await dialog.getByRole("textbox").fill("Quizzes load slowly");
  await dialog.getByRole("button", { name: "Send rating" }).click();
  await expect(dialog.getByText("Thank you. We read every rating.")).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Leave a public review" })).toHaveCount(0);
  expect(sent[1]).toMatchObject({ type: "rating", rating: 2, description: "Quizzes load slowly" });
  expect(errors).toEqual([]);
});

test("the feedback widget offers email when the service is unavailable", async ({ page }) => {
  await watch(page);
  await page.route("**/api/beta-feedback", (route) => route.fulfill({ status: 503, json: { status: "error" } }));
  const dialog = await openFeedback(page);
  await dialog.getByRole("button", { name: /Send feedback or report a bug/ }).click();
  await dialog.getByRole("textbox").fill("Please add a dark mode toggle.");
  await dialog.getByRole("button", { name: "Send feedback" }).click();
  await expect(dialog.getByRole("link", { name: "Send it by email instead" })).toBeVisible();
});

test("a visitor without a profile lands on the student page, and /welcome stays the schools link", async ({ page }) => {
  const errors = await watch(page);
  for (const route of ["/", "/cv", "/dashboard"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/students$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Find grants, hackathons and scholarships");
  }
  await page.goto("/welcome");
  await expect(page).toHaveURL(/\/welcome$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Opportunity and career support for your cohort");
  expect(errors).toEqual([]);
});

test("pilot request, suggestion and details windows ignore Escape and clicks on the empty page", async ({ page }, info) => {
  const errors = await watch(page);

  // Schools: the pilot request window.
  await page.addInitScript(() => localStorage.setItem("qadam_consent_analytics_v1", "denied"));
  await page.goto("/welcome?pilot=1");
  const pilot = page.getByRole("dialog", { name: "Run a pilot with one cohort" });
  await expect(pilot).toBeVisible();
  await pilot.getByLabel("Institution").fill("Smoke school");
  await page.keyboard.press("Escape");
  await page.mouse.click(4, 4);
  await page.mouse.click(info.project.name.includes("mobile") ? 4 : 1270, 790);
  await expect(pilot).toBeVisible();
  await expect(pilot.getByLabel("Institution")).toHaveValue("Smoke school");
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-pilot-outside-click.png`) });
  await pilot.getByRole("button", { name: "Close" }).first().click();
  await expect(pilot).toBeHidden();

  // Learners: the details window and the suggestion window on the Radar.
  await page.evaluate(
    ([profile, membership]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_cohort_membership", JSON.stringify(membership));
    },
    [PROFILE, MEMBERSHIP] as const,
  );
  await page.goto("/");
  await page.getByRole("button", { name: /View details for Smoke Test AI Research Grant/ }).click();
  // The details open in place as a panel, not as a dimmed overlay.
  const details = page.getByRole("region", { name: "Smoke Test AI Research Grant" });
  await expect(details).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.mouse.click(4, 4);
  await expect(details).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-details-panel.png`) });
  await details.getByRole("button", { name: "Close details" }).click();
  await expect(details).toBeHidden();

  await page.getByRole("button", { name: /Suggest it/ }).click();
  const suggest = page.getByRole("dialog", { name: "Suggest an opportunity" });
  await expect(suggest).toBeVisible();
  await suggest.getByLabel("Title").fill("Typed text must survive");
  await page.keyboard.press("Escape");
  await page.mouse.click(4, 4);
  await expect(suggest).toBeVisible();
  await expect(suggest.getByLabel("Title")).toHaveValue("Typed text must survive");
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-suggest-outside-click.png`) });
  await suggest.getByRole("button", { name: "Close" }).first().click();
  await expect(suggest).toBeHidden();

  expect(errors).toEqual([]);
});

test("a student who picks Japan sees Japanese listings first on the Radar", async ({ page }, info) => {
  const errors = await watch(page);
  const listing = (id: string, title: string, location: string, countries: string[]) => ({
    id, type: "GRANT", title, organization: "Smoke Test", deadline: "2099-01-01", url: "https://example.com/" + id,
    eligibility: "check source", summary: "Fixture listing.", skills: [], location, countries,
  });
  await page.route("**/data/opportunities.json", (route) =>
    route.fulfill({
      json: [
        listing("de", "Berlin Fixture Grant", "Berlin, Germany", ["Germany"]),
        listing("us", "Boston Fixture Grant", "Boston, United States", ["United States"]),
        listing("jp", "Tokyo Fixture Grant", "Tokyo, Japan", ["Japan"]),
        listing("web", "Online Fixture Grant", "Online", []),
      ],
    }),
  );
  await page.addInitScript(() => localStorage.setItem("qadam_consent_analytics_v1", "denied"));
  await page.goto("/start");
  const welcome = page.getByRole("dialog", { name: "Welcome to QADAM Hub" });
  await welcome.getByRole("button", { name: "Continue" }).click();
  await welcome.getByPlaceholder("What should we call you?").fill("Aigerim");
  await welcome.getByRole("button", { name: "MEXT Scholarship (Japan)" }).click();
  await welcome.getByRole("button", { name: "Japan", exact: true }).click();
  await expect(welcome.getByRole("button", { name: "Japan", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(400); // let the chip colour transition finish before the screenshot
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-welcome-destinations.png`) });
  await welcome.getByRole("button", { name: "Start exploring" }).click();

  await expect(page.getByText("Tokyo Fixture Grant")).toBeVisible();
  const titles = await page.locator("h3").allInnerTexts();
  const order = titles.filter((t) => t.includes("Fixture Grant"));
  // Japan first, then the online listing (open from anywhere), then the rest in feed order.
  expect(order).toEqual(["Tokyo Fixture Grant", "Online Fixture Grant", "Berlin Fixture Grant", "Boston Fixture Grant"]);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-radar-japan-first.png`) });
  expect(errors).toEqual([]);
});

test("catalog programs show on the Radar with their usual timing instead of a deadline", async ({ page }, info) => {
  const errors = await watch(page);
  await page.route("**/data/programs.json", (route) =>
    route.fulfill({
      json: [
        {
          id: "gks-test", type: "GRANT", title: "Catalog Fixture Scholarship", organization: "Test Ministry",
          url: "https://example.com/gks", countries: ["South Korea"], location: "South Korea", level: ["Undergraduate"],
          summary: "Fixture catalog entry.", eligibility: "Under 25.", cycle: "annual",
          opens: "Every September", nextDeadline: "2001-01-01", lastVerified: "2026-11-01",
        },
        { id: "bad", type: "GRANT", title: "No official link", organization: "X", url: "http://insecure.example", countries: [], location: "", level: [], summary: "", eligibility: "", cycle: "annual", opens: "x", nextDeadline: null, lastVerified: "2026-11-01" },
      ],
    }),
  );
  await page.addInitScript(
    ([profile]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE] as const,
  );
  await page.goto("/");
  await expect(page.getByText("Smoke Test AI Research Grant").first()).toBeVisible();
  const card = page.locator("h3", { hasText: "Catalog Fixture Scholarship" }).locator("xpath=ancestor::div[contains(@class,'rounded-card')][1]");
  await expect(card).toBeVisible();
  // A past deadline is ignored: the badge is short and the usual timing leads the description.
  await expect(card.getByText("Yearly call")).toBeVisible();
  // The usual timing and the eligibility are in the details panel, not on the card.
  await expect(card.getByText("Every September")).toHaveCount(0);
  await card.getByRole("button", { name: /View details/ }).click();
  const panel = page.getByRole("region", { name: "Catalog Fixture Scholarship" });
  await expect(panel.getByText("Every September")).toBeVisible();
  await expect(panel.getByText("Under 25.")).toBeVisible();
  await expect(panel.getByText("Undergraduate")).toBeVisible();
  await expect(panel.getByRole("link", { name: /Official page/ })).toHaveAttribute("href", "https://example.com/gks");
  await expect(page.getByText("No official link")).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-radar-catalog.png`) });
  expect(errors).toEqual([]);
});

test("the application checklist shows one step at a time and ticking a step moves the percentage", async ({ page }, info) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE] as const,
  );
  await page.goto("/application-studio?id=smoke-ml-grant");
  const list = page.getByRole("list").filter({ has: page.getByRole("checkbox") });
  await expect(page.getByText("Preparation Checklist")).toBeVisible();
  const steps = list.getByRole("listitem");
  const count = await steps.count();
  expect(count).toBeGreaterThanOrEqual(8);
  await expect(page.getByText("0%", { exact: true })).toBeVisible();

  // Only the first unfinished step shows its details.
  const opened = list.getByRole("button", { expanded: true });
  await expect(opened).toHaveCount(1);
  await expect(opened.first()).toContainText("Read the rules and eligibility");
  await expect(list.getByText("Check age, student status")).toBeVisible();
  await expect(list.getByText("Pass the skill quizzes")).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-checklist-1.png`), fullPage: true });

  // Ticking the first step moves the percentage and opens the next step.
  await list.getByRole("checkbox").first().click();
  const percent = Math.round((1 / count) * 100);
  await expect(page.getByText(`${percent}%`, { exact: true })).toBeVisible();
  await expect(list.getByRole("button", { expanded: true })).toHaveCount(1);
  await expect(list.getByText("Check age, student status")).toHaveCount(0);

  // A person can open any step by tapping its title, and close it again.
  await list.getByRole("button", { name: /Turn on a deadline reminder/ }).click();
  await expect(list.getByText("Get a Telegram or Discord ping")).toBeVisible();
  await list.getByRole("button", { name: /Turn on a deadline reminder/ }).click();
  await expect(list.getByRole("button", { expanded: true })).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-checklist-2.png`), fullPage: true });
  expect(errors).toEqual([]);
});

test("windows on the Memory and Account pages cover the navigation and the feedback button", async ({ page }, info) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE] as const,
  );
  // The point under the navigation link must belong to the window's overlay, so a tap cannot reach the nav.
  const coversNav = async () =>
    page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a")).filter((a) => /Radar/.test(a.textContent || "") && a.getBoundingClientRect().width > 0);
      const rect = links[0].getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return Boolean(top && top.closest("[role=dialog], [role=alertdialog]"));
    });

  await page.goto("/memory");
  await page.getByRole("button", { name: /Add Directive/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await coversNav()).toBe(true);
  await page.screenshot({ path: path.join(SHOTS, `${info.project.name}-memory-modal-over-nav.png`) });
  await page.getByRole("dialog").getByRole("button", { name: "Cancel" }).click();

  await page.goto("/account?tab=profile");
  await page.getByRole("button", { name: /Log Out/ }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await coversNav()).toBe(true);
  await page.getByRole("dialog").getByRole("button", { name: "Stay in Workspace" }).click();

  expect(errors).toEqual([]);
});

test("no made-up or expired listing is offered: Memory links live listings, an unknown Application Prep id says so", async ({ page }) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE] as const,
  );
  await page.goto("/memory");
  await page.getByRole("button", { name: /Add Directive/ }).first().click();
  const dialog = page.getByRole("dialog");
  // The link choices come from the live Radar (the fixture feed), plus the standing rules.
  await expect(dialog.getByRole("button", { name: "Smoke Test AI Research Grant" })).toBeVisible();
  await expect(dialog.getByRole("button", { name: /Rule: draft applications in English/ })).toBeVisible();
  await expect(dialog.getByText(/Nebius|Y Combinator|ML Engineering Intern/)).toHaveCount(0);
  await dialog.getByRole("button", { name: "Cancel" }).click();

  // The old demo ids no longer resolve to a made-up listing.
  await page.goto("/application-studio?id=nebius-nvidia-hackathon");
  await expect(page.getByText("This opportunity is no longer on the radar")).toBeVisible();
  expect(errors).toEqual([]);
});

test("opening the official page from a checklist step ticks it and opens the next step", async ({ page }) => {
  const errors = await watch(page);
  await page.addInitScript(
    ([profile]) => {
      localStorage.setItem("qadam_user", JSON.stringify(profile));
      localStorage.setItem("qadam_consent_analytics_v1", "denied");
    },
    [PROFILE] as const,
  );
  await page.goto("/application-studio?id=smoke-ml-grant");
  const list = page.getByRole("list").filter({ has: page.getByRole("checkbox") });
  await expect(list.getByText("Check age, student status")).toBeVisible();
  const [popup] = await Promise.all([page.waitForEvent("popup"), list.getByRole("link", { name: "Open official page" }).click()]);
  await popup.close();
  // The first step is ticked, the percentage moved and the next step is open.
  await expect(list.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("11%", { exact: true })).toBeVisible();
  await expect(list.getByText("Check age, student status")).toHaveCount(0);
  await expect(list.getByRole("button", { expanded: true })).toContainText("Close skill gaps");
  // The tick survives a reload.
  await page.reload();
  await expect(list.getByRole("checkbox").first()).toHaveAttribute("aria-checked", "true");
  expect(errors).toEqual([]);
});

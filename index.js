const puppeteer = require("puppeteer");
const stats = require("stats-lite");

const OCTANE_URL = "http://chromium.github.io/octane/";
const START_OCTANE_SELECTOR = "#main-banner";
const IS_RUNNING_SELECTOR = "#bar-appendix";
const OCTANE_SCORE_TEMPLATE = "Octane Score: ";
const ITERATIONS = 10;

(async () => {
  await run1BrowserNiterations();
  await runNBrowserNiterations();
  // headless ?
  // await runHeadless1BrowserNiterations();
  // await runHeadlessNBrowserNiterations();
})();

// Open headless browser, repeat ITERATIONS times: open a tab and calculate Octane
async function runHeadless1BrowserNiterations() {
  // start 1 Browser and get N Octane, via opening/closing a tab, N times
  const oneBrowserHeadless = await getOctane1BrowserNIterations(
    ITERATIONS,
    true
  );
  displayResult({
    description: `Open headless browser, repeat ${ITERATIONS} times: open a tab and calculate Octane`,
    scores: oneBrowserHeadless
  });
}

// Open browser, repeat ITERATIONS times: open a tab and calculate Octane
async function run1BrowserNiterations() {
  const oneBrowserNotHeadless = await getOctane1BrowserNIterations(
    ITERATIONS,
    false
  );
  displayResult({
    description: `Open browser, repeat ${ITERATIONS} times: open a tab and calculate Octane`,
    scores: oneBrowserNotHeadless
  });
}

// repeat ITERATIONS times: open headless browser, open a tab and calculate Octane
async function runHeadlessNBrowserNiterations() {
  // start 1 Browser and get 1 Octane, repeat
  const nBrowserHeadless = await getOctaneNBrowserNIterations(ITERATIONS, true);
  displayResult({
    description: `repeat ${ITERATIONS} times: open headless browser, open a tab and calculate Octane`,
    scores: nBrowserHeadless
  });
}

// repeat ITERATIONS times: open browser, open a tab and calculate Octane
async function runNBrowserNiterations() {
  const nBrowserNotHeadless = await getOctaneNBrowserNIterations(
    ITERATIONS,
    false
  );
  displayResult({
    description: `repeat ${ITERATIONS} times: open browser, open a tab and calculate Octane`,
    scores: nBrowserNotHeadless
  });
}

// log to the console a bunch of stats (mean/min/max/stdDev)
function displayResult(results) {
  console.log(`## ${results.description}`);
  const scores = results.scores;
  const mean = Math.round(stats.mean(scores));
  const stdDev = Math.round(stats.sampleStdev(scores));
  const min = Math.min.apply(null, scores);
  const max = Math.max.apply(null, scores);
  console.log(
    `  mean: ${mean}, standard deviation: ${stdDev} (min: ${min}, max ${max})`
  );
}
async function getOctane1BrowserNIterations(
  iterations,
  headless = true,
  browserType = "chrome"
) {
  const scores = [];
  const browser = await puppeteer.launch({
    headless: headless,
    product: browserType
  });
  for (let i = 0; i < iterations; i++) {
    const page = await browser.newPage();
    scores.push(await getOctaneScore(page));
    await page.close();
  }
  await browser.close();
  return scores;
}

async function getOctaneNBrowserNIterations(
  iterations,
  headless = true,
  browserType = "chrome"
) {
  const scores = [];
  for (let i = 0; i < iterations; i++) {
    const browser = await puppeteer.launch({
      headless: headless,
      product: browserType
    });
    // wait for 15s for startup tasks to complete
    await page.waitFor(15 * 1000);
    const page = await browser.newPage();
    const score = await getOctaneScore(page);
    if (score) {
      scores.push(score);
    }
    await page.close();
    await browser.close();
  }
  return scores;
}

async function getOctaneScore(page) {
  let score = null;
  await page.goto(OCTANE_URL);
  await page.click(START_OCTANE_SELECTOR);
  await page.waitFor(60 * 1000);
  while ((await page.$(IS_RUNNING_SELECTOR)) !== null) {
    console.log("Going to wait for another minute");
    await page.waitFor(60 * 1000);
  }

  const octaneResultText = await page.evaluate(() => {
    const element = document.querySelector("#main-banner");
    if (element) {
      return element.textContent;
    }
    return null;
  });

  if (!octaneResultText) {
    console.error("Unexpected error: could not find final Octane Score");
  } else {
    const octane = octaneResultText.replace(OCTANE_SCORE_TEMPLATE, "");
    score = octane;
  }
  return score;
}

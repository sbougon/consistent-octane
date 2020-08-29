const { remote } = require("webdriverio");
const stats = require("stats-lite");
const ervy = require("ervy");
const { bar, bg } = ervy;

const OCTANE_URL = "http://chromium.github.io/octane/";
const START_OCTANE_SELECTOR = "#main-banner";
const IS_RUNNING_SELECTOR = "#bar-appendix";
const OCTANE_SCORE_TEMPLATE = "Octane Score: ";
const DEFAULT_HOSTNAME = "localhost";
const DEFAULT_PORT = 4444;

const argv = require("yargs").argv;

(async () => {
  const headless = argv.s || false; // headless or not
  const iterations = argv.i || 10; // number of iterations
  const nBrowsersMode = argv.n || false; // 1 or N browsers ?
  const hostname = argv.h || DEFAULT_HOSTNAME;
  const port = argv.p || DEFAULT_PORT;
  const verbose = argv.v || false;
  if (nBrowsersMode) {
    await runNBrowserNiterations({
      headless,
      iterations,
      hostname,
      port,
      verbose,
    });
  } else {
    await run1BrowserNiterations({
      headless,
      iterations,
      hostname,
      port,
      verbose,
    });
  }
})();

// Open browser, repeat ITERATIONS times: open a tab and calculate Octane
async function run1BrowserNiterations({
  headless,
  iterations,
  hostname,
  port,
  verbose,
}) {
  const scores = await getOctane1BrowserNIterations({
    headless,
    iterations,
    hostname,
    port,
    verbose,
  });
  displayResult({
    description: `Open ${
      headless ? "headless" : ""
    } browser, repeat ${iterations} times: open a tab and calculate Octane`,
    scores,
  });
}

// repeat ITERATIONS times: open browser, open a tab and calculate Octane
async function runNBrowserNiterations({
  headless,
  iterations,
  hostname,
  port,
  verbose,
}) {
  const scores = await getOctaneNBrowserNIterations({
    headless,
    iterations,
    hostname,
    port,
    verbose,
  });
  displayResult({
    description: `repeat ${iterations} times: open ${
      headless ? "headless" : ""
    } browser, open a tab and calculate Octane`,
    scores,
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
  const barData = scores.map((entry, index) => {
    return { key: `  ${index + 1}  `, value: entry, style: bg("green") };
  });
  console.log(bar(barData, { barWidth: 5 }));
  console.log(
    `Statistics::  mean: ${mean}, standard deviation: ${stdDev} (min: ${min}, max ${max})\n`
  );
}
async function getOctane1BrowserNIterations({
  headless,
  iterations,
  hostname,
  port,
  verbose,
}) {
  const scores = [];
  const browser = await openBrowser({ headless, hostname, port });
  for (let i = 0; i < iterations; i++) {
    const score = await getOctaneScore(browser);
    scores.push(score);
    if (verbose) {
      console.log(`${i + 1}) ${score}`);
    }
  }
  await closeBrowser(browser);
  return scores;
}

async function openBrowser({ headless, hostname, port }) {
  let capabilities = {
    browserName: "chrome",
  };
  debugger;
  if (headless) {
    capabilities["goog:chromeOptions"] = {
      // to run chrome headless the following flags are required
      // (see https://developers.google.com/web/updates/2017/04/headless-chrome)
      args: ["--headless"],
    };
  }

  const options = {
    logLevel: "warn", // trace | debug | info | warn | error | silent
    capabilities,
  };

  if (hostname && port) {
    options.port = port;
    options.hostname = hostname;
  }
  const browser = await remote(options);
  return browser;
}

async function wait(browser, milliseconds) {
  await browser.pause(milliseconds);
}

async function closeBrowser(browser) {
  await browser.deleteSession();
}

async function getOctaneNBrowserNIterations({
  headless,
  iterations,
  hostname,
  port,
  verbose,
}) {
  const scores = [];
  for (let i = 0; i < iterations; i++) {
    const browser = await openBrowser({
      headless,
      hostname,
      port,
    });
    // wait for 15s for startup tasks to complete
    wait(browser, 15 * 1000);
    const score = await getOctaneScore(browser);
    if (score) {
      scores.push(score);
      if (verbose) {
        console.log(`${i + 1}) ${score}`);
      }
    }
    await closeBrowser(browser);
  }
  return scores;
}

async function getOctaneScore(browser) {
  let score = null;
  await browser.url(OCTANE_URL);
  const start = await browser.$(START_OCTANE_SELECTOR);
  await start.click();
  await wait(browser, 60 * 1000);
  let found = false;
  while (found === false) {
    const isRunning = await browser.$(IS_RUNNING_SELECTOR);
    if (await isRunning.isExisting()) {
      await wait(browser, 60 * 1000);
    } else {
      found = true;
    }
  }

  const octaneResultText = await browser.execute(() => {
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

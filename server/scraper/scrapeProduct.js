// const REVEAL_SELECTOR = 'button:has-text("Reveal Price")';
// const TRY_AGAIN_SELECTOR = 'button:has-text("Try Again")';
// const FAIL_TEXT_SELECTOR = "text=Couldn't load the price";
// const PRICE_CONTAINER = '.price-main';
// const STOCK_SELECTOR = '.stock-badge';

// async function waitForPriceSettle(page, containerSelector, quietMs = 400, maxWaitMs = 6000) {
//   return page.evaluate(
//     ({ containerSelector, quietMs, maxWaitMs }) => {
//       return new Promise((resolve) => {
//         const container = document.querySelector(containerSelector);
//         if (!container) return resolve(false);

//         let timer = null;
//         const finish = () => {
//           observer.disconnect();
//           resolve(true);
//         };

//         const observer = new MutationObserver(() => {
//           clearTimeout(timer);
//           timer = setTimeout(finish, quietMs);
//         });

//         observer.observe(container, { childList: true, subtree: true, characterData: true });
//         timer = setTimeout(finish, quietMs);
//         setTimeout(finish, maxWaitMs);
//       });
//     },
//     { containerSelector, quietMs, maxWaitMs }
//   );
// }

// async function extractPrice(page) {
//   return page.evaluate((containerSelector) => {
//     const container = document.querySelector(containerSelector);
//     if (!container) return null;

//     const candidates = [...container.querySelectorAll('*')];

//     const visible = candidates.filter((el) => {
//       if (el.getAttribute('aria-hidden') === 'true') return false;
//       const style = getComputedStyle(el);
//       if (style.display === 'none' || style.visibility === 'hidden') return false;
//       if (parseFloat(style.opacity) < 0.9) return false;
//       if (style.textDecoration.includes('line-through')) return false;

//       const cleanText = (el.textContent || '')
//         .replace(/[\u200B-\u200D\uFEFF]/g, '')
//         .replace(/\u00A0/g, ' ')
//         .replace(/\s+/g, ' ')
//         .trim();

//       return /(?:₹|Rs\.?)\s*[\d,]{3,}/i.test(cleanText);
//     });

//     if (!visible.length) return null;

//     visible.sort((a, b) => {
//       const fontSizeDiff =
//         parseFloat(getComputedStyle(b).fontSize) -
//         parseFloat(getComputedStyle(a).fontSize);
//       if (Math.abs(fontSizeDiff) > 0.1) return fontSizeDiff;
//       return b.getElementsByTagName('*').length - a.getElementsByTagName('*').length;
//     });

//     const cleanText = (visible[0].textContent || '')
//       .replace(/[\u200B-\u200D\uFEFF]/g, '')
//       .replace(/\u00A0/g, ' ')
//       .replace(/\s+/g, ' ')
//       .trim();

//     const match = cleanText.match(/(?:₹|Rs\.?)\s*([\d,]{3,}(?:\.\d+)?)/i);
//     return match ? match[1] : null;
//   }, PRICE_CONTAINER);
// }

// function parsePrice(text) {
//   if (!text) return null;
//   const num = text.replace(/,/g, '');
//   const parsed = parseFloat(num);
//   return isNaN(parsed) ? null : Math.round(parsed);
// }

// function parseStock(text) {
//   if (!text) return null;
//   const match = text.match(/\d+/);
//   return match ? Number(match[0]) : 0;
// }

// async function dismissCookieModal(page, log) {
//   for (let i = 0; i < 3; i++) {
//     const acceptBtn = await page
//       .waitForSelector('button:has-text("Accept")', { timeout: 8000 })
//       .catch(() => null);
//     if (!acceptBtn) {
//       log('cookie modal never appeared, continuing');
//       return;
//     }
//     try {
//       await acceptBtn.click({ timeout: 3000, force: true });
//       await page.waitForTimeout(400);
//       const stillThere = await page.locator('button:has-text("Accept")').count();
//       if (!stillThere) {
//         log('cookie modal dismissed');
//         return;
//       }
//     } catch (err) {
//       log('cookie accept click failed, retrying: ' + err.message.split('\n')[0]);
//     }
//   }
//   log('cookie modal could not be dismissed after 3 tries, continuing anyway');
// }

// async function scrapeProduct(browser, storeProductId, opts = {}) {
//   const maxAttempts = opts.maxAttempts || 4;
//   const verbose = opts.verbose !== false;
//   const log = (msg) => {
//     if (verbose) console.log(`[${storeProductId}] ${msg}`);
//   };

//   const context = await browser.newContext({
//     userAgent:
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
//     viewport: { width: 1280, height: 720 },
//   });
//   const page = await context.newPage();
//   const started = Date.now();
//   const result = {
//     storeProductId,
//     status: 'failed',
//     attempts: 0,
//     price: null,
//     stock: null,
//     error: null,
//   };

//   try {
//     log('navigating to product page');
//     await page.goto(`https://demo.inelabteamdev.com/product/${storeProductId}`, {
//       waitUntil: 'domcontentloaded',
//     });

//     await dismissCookieModal(page, log);

//     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//       result.attempts = attempt;
//       result.error = null;
//       log(`attempt ${attempt} starting`);

//       const tryAgain = page.locator(TRY_AGAIN_SELECTOR).first();
//       const reveal = page.locator(REVEAL_SELECTOR).first();
//       const usingTryAgain = (await tryAgain.count()) > 0;
//       const button = usingTryAgain ? tryAgain : reveal;
//       log(usingTryAgain ? 'found Try Again button' : 'found Reveal Price button');

//       const box = await button.boundingBox();
//       const deadline = Date.now() + 15000;
//       let enabled = false;

//       while (Date.now() < deadline) {
//         const stillDisabled = await button.getAttribute('disabled').catch(() => 'true');
//         if (stillDisabled === null) {
//           enabled = true;
//           break;
//         }
//         if (box) {
//           await page.mouse.move(
//             box.x + Math.random() * box.width,
//             box.y + Math.random() * box.height,
//             { steps: 3 }
//           );
//         }
//         await page.waitForTimeout(400);
//       }

//       if (!enabled) {
//         log('button never became enabled, giving up this attempt');
//         result.error = 'hover_enable_timeout';
//         await page.waitForTimeout(1000 * attempt);
//         continue;
//       }

//       log('button enabled, clicking');
//       try {
//         await button.click({ timeout: 5000, force: true });
//       } catch (err) {
//         log('click failed: ' + err.message.split('\n')[0]);
//       }

//       log('waiting for outcome (success or failure banner)');
//       const outcome = await Promise.race([
//         page.waitForSelector(STOCK_SELECTOR, { timeout: 30000 }).then(() => 'success'),
//         page.waitForSelector(FAIL_TEXT_SELECTOR, { timeout: 30000 }).then(() => 'failed'),
//       ]).catch(() => 'timeout');
//       log(`outcome: ${outcome}`);

//       if (outcome === 'success') {
//         await waitForPriceSettle(page, PRICE_CONTAINER);
//         const priceText = await extractPrice(page);

//         const stockText = await page.locator(STOCK_SELECTOR).first().innerText().catch(() => null);

//         result.price = parsePrice(priceText);
//         result.stock = parseStock(stockText);
//         log(`extracted price=${result.price} stock=${result.stock}`);

//         if (result.price != null && result.stock != null) {
//           result.status = attempt > 1 ? 'retried' : 'success';
//           result.error = null;
//           break;
//         }

//         result.status = 'failed';
//         result.debugHtml = await page.locator(PRICE_CONTAINER).first().innerHTML().catch(() => null);
//         result.error = 'price_or_stock_not_found';
//         break;
//       }

//       log(`attempt ${attempt} failed (${outcome === 'timeout' ? 'timeout' : 'challenge_failed'}), will retry`);
//       result.error = outcome === 'timeout' ? 'timeout' : 'challenge_failed';
//       await page.waitForTimeout(1500 * attempt);
//     }
//   } catch (err) {
//     log('unexpected error: ' + err.message.split('\n')[0]);
//     result.error = err.message;
//   } finally {
//     await context.close();
//   }

//   result.durationMs = Date.now() - started;
//   log(`done: ${JSON.stringify({ status: result.status, attempts: result.attempts, price: result.price, stock: result.stock, error: result.error })}`);
//   return result;
// }

// module.exports = { scrapeProduct };

const REVEAL_SELECTOR = 'button:has-text("Reveal Price")';
const TRY_AGAIN_SELECTOR = 'button:has-text("Try Again")';
const FAIL_TEXT_SELECTOR = "text=Couldn't load the price";
const PRICE_CONTAINER = '.price-main';
const STOCK_SELECTOR = '.stock-badge';

async function waitForPriceSettle(page, containerSelector, quietMs = 400, maxWaitMs = 6000) {
  return page.evaluate(
    ({ containerSelector, quietMs, maxWaitMs }) => {
      return new Promise((resolve) => {
        const container = document.querySelector(containerSelector);
        if (!container) return resolve(false);

        let timer = null;
        const finish = () => {
          observer.disconnect();
          resolve(true);
        };

        const observer = new MutationObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(finish, quietMs);
        });

        observer.observe(container, { childList: true, subtree: true, characterData: true });
        timer = setTimeout(finish, quietMs);
        setTimeout(finish, maxWaitMs);
      });
    },
    { containerSelector, quietMs, maxWaitMs }
  );
}

async function extractPrice(page) {
  return page.evaluate((containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    const candidates = [...container.querySelectorAll('*')];

    const visible = candidates.filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity) < 0.9) return false;
      if (style.textDecoration.includes('line-through')) return false;

      const cleanText = (el.textContent || '')
        .normalize('NFKC')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      return /(?:₹|Rs\.?)\s*[\d,]{3,}/i.test(cleanText);
    });

    if (!visible.length) return null;

    visible.sort((a, b) => {
      const fontSizeDiff =
        parseFloat(getComputedStyle(b).fontSize) -
        parseFloat(getComputedStyle(a).fontSize);
      if (Math.abs(fontSizeDiff) > 0.1) return fontSizeDiff;
      return b.getElementsByTagName('*').length - a.getElementsByTagName('*').length;
    });

    const cleanText = (visible[0].textContent || '')
      .normalize('NFKC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const match = cleanText.match(/(?:₹|Rs\.?)\s*([\d,]{3,}(?:\.\d+)?)/i);
    return match ? match[1] : null;
  }, PRICE_CONTAINER);
}

function parsePrice(text) {
  if (!text) return null;
  const num = text.replace(/,/g, '');
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : Math.round(parsed);
}

function parseStock(text) {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

async function dismissCookieModal(page, log) {
  for (let i = 0; i < 3; i++) {
    const acceptBtn = await page
      .waitForSelector('button:has-text("Accept")', { timeout: 8000 })
      .catch(() => null);
    if (!acceptBtn) {
      log('cookie modal never appeared, continuing');
      return;
    }
    try {
      await acceptBtn.click({ timeout: 3000, force: true });
      await page.waitForTimeout(400);
      const stillThere = await page.locator('button:has-text("Accept")').count();
      if (!stillThere) {
        log('cookie modal dismissed');
        return;
      }
    } catch (err) {
      log('cookie accept click failed, retrying: ' + err.message.split('\n')[0]);
    }
  }
  log('cookie modal could not be dismissed after 3 tries, continuing anyway');
}

async function scrapeProduct(browser, storeProductId, opts = {}) {
  const maxAttempts = opts.maxAttempts || 4;
  const verbose = opts.verbose !== false;
  const log = (msg) => {
    if (verbose) console.log(`[${storeProductId}] ${msg}`);
  };

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  const started = Date.now();
  const result = {
    storeProductId,
    status: 'failed',
    attempts: 0,
    price: null,
    stock: null,
    error: null,
  };

  try {
    log('navigating to product page');
    await page.goto(`https://demo.inelabteamdev.com/product/${storeProductId}`, {
      waitUntil: 'domcontentloaded',
    });

    await dismissCookieModal(page, log);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result.attempts = attempt;
      result.error = null;
      log(`attempt ${attempt} starting`);

      const tryAgain = page.locator(TRY_AGAIN_SELECTOR).first();
      const reveal = page.locator(REVEAL_SELECTOR).first();
      const usingTryAgain = (await tryAgain.count()) > 0;
      const button = usingTryAgain ? tryAgain : reveal;
      log(usingTryAgain ? 'found Try Again button' : 'found Reveal Price button');

      const box = await button.boundingBox();
      const deadline = Date.now() + 15000;
      let enabled = false;

      while (Date.now() < deadline) {
        const stillDisabled = await button.getAttribute('disabled').catch(() => 'true');
        if (stillDisabled === null) {
          enabled = true;
          break;
        }
        if (box) {
          await page.mouse.move(
            box.x + Math.random() * box.width,
            box.y + Math.random() * box.height,
            { steps: 3 }
          );
        }
        await page.waitForTimeout(400);
      }

      if (!enabled) {
        log('button never became enabled, giving up this attempt');
        result.error = 'hover_enable_timeout';
        await page.waitForTimeout(1000 * attempt);
        continue;
      }

      log('button enabled, clicking');
      try {
        await button.click({ timeout: 5000, force: true });
      } catch (err) {
        log('click failed: ' + err.message.split('\n')[0]);
      }

      log('waiting for outcome (success or failure banner)');
      const outcome = await Promise.race([
        page.waitForSelector(STOCK_SELECTOR, { timeout: 30000 }).then(() => 'success'),
        page.waitForSelector(FAIL_TEXT_SELECTOR, { timeout: 30000 }).then(() => 'failed'),
      ]).catch(() => 'timeout');
      log(`outcome: ${outcome}`);

      if (outcome === 'success') {
        await waitForPriceSettle(page, PRICE_CONTAINER);
        const priceText = await extractPrice(page);

        const stockText = await page.locator(STOCK_SELECTOR).first().innerText().catch(() => null);

        result.price = parsePrice(priceText);
        result.stock = parseStock(stockText);
        log(`extracted price=${result.price} stock=${result.stock}`);

        if (result.price != null && result.stock != null) {
          result.status = attempt > 1 ? 'retried' : 'success';
          result.error = null;
          break;
        }

        result.status = 'failed';
        result.debugHtml = await page.locator(PRICE_CONTAINER).first().innerHTML().catch(() => null);
        result.error = 'price_or_stock_not_found';
        break;
      }

      log(`attempt ${attempt} failed (${outcome === 'timeout' ? 'timeout' : 'challenge_failed'}), will retry`);
      result.error = outcome === 'timeout' ? 'timeout' : 'challenge_failed';
      await page.waitForTimeout(1500 * attempt);
    }
  } catch (err) {
    log('unexpected error: ' + err.message.split('\n')[0]);
    result.error = err.message;
  } finally {
    await context.close();
  }

  result.durationMs = Date.now() - started;
  log(`done: ${JSON.stringify({ status: result.status, attempts: result.attempts, price: result.price, stock: result.stock, error: result.error })}`);
  return result;
}

module.exports = { scrapeProduct };
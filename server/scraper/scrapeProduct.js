const REVEAL_SELECTOR = 'button:has-text("Reveal Price")';
const TRY_AGAIN_SELECTOR = 'button:has-text("Try Again")';
const FAIL_TEXT_SELECTOR = "text=Couldn't load the price";
const PRICE_CONTAINER = '.price-main';
const STOCK_SELECTOR = '.stock-badge';

async function extractPrice(page) {
  return page.evaluate((containerSelector) => {
    const container = document.querySelector(containerSelector);
    if (!container) return null;

    // Grab all elements inside the price container
    const candidates = [...container.querySelectorAll('*')];

    const visible = candidates.filter((el) => {
      if (el.getAttribute('aria-hidden') === 'true') return false;
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (parseFloat(style.opacity) < 0.9) return false;
      if (style.textDecoration.includes('line-through')) return false;

      // Clean zero-width spaces, non-breaking spaces (\u00A0), and standard whitespace
      const cleanText = (el.textContent || '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Flexible check for currency prefixes (₹ or Rs / Rs.) followed by digits
      return /(?:₹|Rs\.?)\s*[\d,]+/i.test(cleanText);
    });

    if (!visible.length) return null;

    // Prioritize largest font size, then deepest DOM node
    visible.sort((a, b) => {
      const fontSizeDiff =
        parseFloat(getComputedStyle(b).fontSize) -
        parseFloat(getComputedStyle(a).fontSize);
      if (Math.abs(fontSizeDiff) > 0.1) return fontSizeDiff;
      return b.getElementsByTagName('*').length - a.getElementsByTagName('*').length;
    });

    const cleanText = (visible[0].textContent || '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const match = cleanText.match(/(?:₹|Rs\.?)\s*([\d,]+(?:\.\d+)?)/i);
    return match ? match[1] : null;
  }, PRICE_CONTAINER);
}

function parsePrice(text) {
  if (!text) return null;
  // Handle optional decimal parts if present
  const num = text.replace(/,/g, '');
  const parsed = parseFloat(num);
  return isNaN(parsed) ? null : Math.round(parsed);
}

function parseStock(text) {
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

async function scrapeProduct(browser, storeProductId, opts = {}) {
  const maxAttempts = opts.maxAttempts || 4;
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
    await page.goto(`https://demo.inelabteamdev.com/product/${storeProductId}`, {
      waitUntil: 'domcontentloaded',
    });

    const acceptCookies = await page
      .waitForSelector('button:has-text("Accept")', { timeout: 8000 })
      .catch(() => null);
    if (acceptCookies) {
      await acceptCookies.click();
      await page.waitForTimeout(500);
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result.attempts = attempt;
      result.error = null;

      const tryAgain = page.locator(TRY_AGAIN_SELECTOR).first();
      const reveal = page.locator(REVEAL_SELECTOR).first();
      const button = (await tryAgain.count()) ? tryAgain : reveal;

      const box = await button.boundingBox();
      const deadline = Date.now() + 15000;
      let enabled = false;

      while (Date.now() < deadline) {
        const stillDisabled = await button
          .getAttribute('disabled')
          .catch(() => 'true');
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
        result.error = 'hover_enable_timeout';
        await page.waitForTimeout(1000 * attempt);
        continue;
      }

      await button.click({ timeout: 5000, force: true }).catch(() => null);

      const outcome = await Promise.race([
        page.waitForSelector(STOCK_SELECTOR, { timeout: 20000 }).then(() => 'success'),
        page.waitForSelector(FAIL_TEXT_SELECTOR, { timeout: 20000 }).then(() => 'failed'),
      ]).catch(() => 'timeout');

      if (outcome === 'success') {
        let priceText = null;
        const priceDeadline = Date.now() + 8000;

        while (Date.now() < priceDeadline) {
          priceText = await extractPrice(page);
          if (priceText) break;
          await page.waitForTimeout(300);
        }

        const stockText = await page
          .locator(STOCK_SELECTOR)
          .first()
          .innerText()
          .catch(() => null);

        result.price = parsePrice(priceText);
        result.stock = parseStock(stockText);

        if (result.price != null && result.stock != null) {
          result.status = attempt > 1 ? 'retried' : 'success';
          result.error = null;
          break;
        }

        result.status = 'failed';
        result.debugHtml = await page
          .locator(PRICE_CONTAINER)
          .first()
          .innerHTML()
          .catch(() => null);
        result.error = 'price_or_stock_not_found';
        break;
      }

      result.error = outcome === 'timeout' ? 'timeout' : 'challenge_failed';
      await page.waitForTimeout(1500 * attempt);
    }
  } catch (err) {
    result.error = err.message;
  } finally {
    await context.close();
  }

  result.durationMs = Date.now() - started;
  return result;
}

module.exports = { scrapeProduct };
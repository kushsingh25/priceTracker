# Design Note

## The core problem

The mock store's price reveal isn't just slow — it's actively adversarial. Clicking
"Reveal Price" triggers a three-step flow: a `GET /challenge` returning a client-side
WASM proof-of-work puzzle, a `POST /session` that must return the solved puzzle plus a
behavioral attestation (canvas/WebGL fingerprint, frame timing, a full mouse-movement
trail with hover duration and click timestamp), and finally `GET /price`, whose response
body is itself encrypted and unreadable over the network regardless of authentication.
None of this is solvable by forging HTTP requests. The only workable approach is to let
a real browser do what it already does — drive it with Playwright, trigger the same
genuine hover/click sequence a human would, and read the result off the rendered page,
never off the network.

## How reliability was actually achieved

**Hybrid scraping.** The product catalog (1000 items, paginated) has no anti-bot
protection at all, so it's fetched with plain `axios`, with per-page retry for the
occasional 503. Only the price reveal — the genuinely hard part — goes through
Playwright.

**Real interaction, not guessed timing.** The Reveal Price button is sometimes disabled
until a sustained hover — how long is not fixed or documented — so the scraper polls the
`disabled` attribute directly while jittering the mouse across the button's bounding box,
rather than guessing a wait duration. The same principle applies to reading the final
price: instead of reading once after a fixed delay, a `MutationObserver` watches the
price container and only resolves once it has genuinely stopped changing for 400ms. This
replaced an earlier, weaker approach (see below) and is the single most important
reliability fix in the whole scraper — timing guesses are inherently fragile against a
site that gives no guarantees about animation duration.

**Two distinct failure modes, handled differently.** A `POST /session` 401
(`challenge_failed`) surfaces as a visible "couldn't load the price" banner with a
manual "Try Again" button, and restarts the entire challenge/session/price sequence from
scratch. A `GET /price` 503 is retried internally by the site's own JS with no new
challenge, surfacing only as "Loaded in N attempts" on eventual success. The scraper
detects success/failure by racing two DOM selectors rather than inspecting network
status codes directly, since the encrypted response body makes status-code inspection
alone insufficient anyway.

**Honeypot-resistant extraction.** The price container includes multiple decoys designed
to catch naive scrapers: an `aria-hidden`/`display:none` fake price, a second `data-price`
decoy, the genuine struck-through original price (real data, but not the current price),
and sometimes a reduced-opacity "deal price" label. Extraction filters on computed style
(visibility, opacity, text-decoration) rather than trusting any single element blindly,
and picks the largest-font-size surviving candidate as the real displayed price.

**Never store wrong data.** `price_history` is only ever written when both price and
stock were confidently extracted; `scrape_log` is written on every attempt regardless of
outcome, with an honest status and error reason. A product that fails every retry still
appears in the log as `failed` — it never disappears silently.

## Trade-offs made, explicitly

- **Retry budget vs. cost.** Each product gets up to 4 attempts with linear backoff. A
  persistently failing product costs roughly 145 seconds before giving up. This is
  bounded and safe at small scale, but a batch of many simultaneously-struggling products
  could meaningfully lengthen a single 2-hour cron cycle. Not fixed, given time
  constraints — flagged here as a known scaling limit rather than solved.
- **Catalog completeness.** The 50-page catalog crawl produced duplicate product IDs
  across different pages in testing, implying the underlying list isn't perfectly stable
  across the ~50 sequential requests a full crawl takes. Results are deduplicated by ID
  as a defensive measure, but this doesn't rule out the inverse risk — a product falling
  through the gap and never appearing on any page at all. Accepted as a known limitation
  rather than engineering a fully deterministic crawl under deadline.
- **cron-job.org's 30-second timeout ceiling** (a free-tier limit, not configurable) is
  shorter than some real scrape attempts, which have taken 145+ seconds in testing. When
  this happens, cron-job.org will report the execution as failed even though the backend
  keeps processing the request to completion and writes to Supabase correctly regardless
  of whether the client is still listening. The scrape log is the actual source of truth,
  not cron-job.org's own dashboard.
- **Sequential, staggered scraping.** Products are scraped one at a time with a
  randomized 1.5-3s pause between them, deliberately avoiding a tight parallel burst that
  would look far more bot-like than a human browsing one product at a time.

## What went wrong on the first attempts, and how it was corrected

- Moving the mouse to an unrelated page coordinate right after hovering the reveal
  button cancelled the hover state entirely. Fixed by jittering the mouse only within the
  button's own bounding box.
- A cookie-consent modal renders in ~2-5 seconds after page load, after the initial DOM
  check — an immediate `.count()` check always found nothing, leaving the modal in place
  and silently blocking every subsequent click. Fixed with a proper `waitForSelector`
  with a generous timeout, retried up to 3 times with a forced click.
- A one-shot "is the button already enabled" check, done once before branching into
  either an immediate click or a hover-wait loop, raced against the page's own SPA
  hydration — the button briefly appeared enabled before the real disabled state was
  attached a moment later. Fixed by folding the enabled-check into every iteration of a
  single polling loop, with no separate branch to race against.
- Price extraction initially checked only `<span>` elements for a complete price match.
  Some products render each digit in its own `<span>` inside a wrapping `<div>`, so no
  single element ever contained the full number. Fixed by widening the candidate search
  to include `<div>`s and reading the full concatenated text of each candidate.
- An exact full-string match (`^₹[\d,]+$`) broke when a product appended trailing text
  after the price (e.g. "/- (incl. of all taxes)"), which itself contained deliberately
  injected whitespace mid-word as a second layer of obfuscation. Fixed by matching only
  the leading digit run instead of the whole string.
- The literal ₹ character in the matching regex is a real point of fragility: it silently
  broke after a routine file save/edit cycle on Windows, almost certainly due to
  character-encoding corruption somewhere in that pipeline, even though the live page's
  own ₹ was unaffected. Fixed by making the match currency-symbol-agnostic — an optional
  single leading character of any kind, followed by a real digit run — removing the
  dependency on matching that specific byte sequence at all.
- One product's price rendered using fullwidth Unicode digit characters (e.g. "２" rather
  than "2") — visually a number, but invisible to a plain `\d` regex, and the cause of a
  visibly uneven letter-spacing that turned out to be the actual tell. Fixed with Unicode
  NFKC normalization before matching, which also guards against a broader family of
  similar lookalike-character tricks, not just this one case.
- Reading the price a single time, immediately after the success selector appeared,
  occasionally captured a mid-animation value (`price: 1` was observed directly in
  testing, on a product that reads in the thousands). An intermediate fix required two
  consecutive identical reads 300ms apart before trusting a value; this was ultimately
  replaced by the `MutationObserver`-based settle detection described above, which
  detects actual completion rather than inferring it from a fixed number of matching
  reads.
- Deploying to Render's plain Node runtime failed outright: `playwright install
  --with-deps` needs root access to install Chromium's system libraries via `apt-get`,
  which Render's standard buildpack environment does not grant. Fixed by switching to a
  Docker-based deploy, where the build process runs as root by default.
- The first Docker attempt (Microsoft's official Playwright image) shipped an older
  Node.js version than the Supabase client library's realtime module requires for native
  WebSocket support, failing at startup. Fixed by switching to a plain `node:22-bookworm`
  base image and installing Chromium's dependencies explicitly inside the Dockerfile
  instead of relying on a pre-bundled image.
- The cron endpoint's response body (a full per-product results array) exceeded
  cron-job.org's response-size limit for confirming a successful execution. Fixed by
  trimming the HTTP response to a small summary object; the full detail was never lost,
  since it was already being written to `scrape_log` and `price_history` independently
  of what the HTTP response returns.

# Validly

**Find out if your side hustle will sell before you build it.**

Make a pre-launch page in 2 minutes, share the link, and let real people reserve with their email. When the test ends you get a verdict: **SHIP IT**, **CHANGE IT** or **KILL IT**, with the reasons, your next moves, and a story-sized card to post.

Nobody is ever charged. Payments are intentionally not built yet.

---

## What's inside

| For creators | For visitors |
| --- | --- |
| 5-step wizard with a live phone preview, draft autosave, photo upload (resized in the browser) | Fast, mobile-first page in one of 6 themes |
| Guest-first: no account needed to launch | Reserve with just an email, no account |
| Share kit: tagged link per app (IG, TikTok, group chats, Snap, X, LinkedIn), ready captions, QR code | Optional "what would you honestly pay?" |
| Live dashboard: visitors, taps, reservations, sources, day-by-day charts | Returning visitors see they're on the list |
| "Where it's leaning" meter while the test runs | Report button for scam/spam pages |
| Wrapped-style verdict reveal, story/post PNGs, public card link (can be turned off) | |
| Edit page, reopen for more days, retrial (pre-filled copy of a test) | |
| CSV export, copy all emails, remove junk reservations | |
| Save account with email + password, one-time recovery code, change password, delete everything | |

### Honest numbers by design
- **The creator's own visits never count.** Their browser doesn't send views, and the server rejects them too.
- **One person = one count.** Unique visitors per device. Reservations are deduped by email *and* device, so a typo fix updates the entry instead of double counting.
- **Bots and link previews are ignored.**
- **Small samples can't fake certainty.** The verdict uses a 90% Wilson confidence interval and shows its confidence level.
- **Friends are flagged.** If most traffic came from group chats, a SHIP comes with a warning.

## How the verdict works

Every price has a bar: cheap things should convert better than expensive ones.

| Price (converted to USD) | SHIP IT if at least | KILL IT if under |
| --- | --- | --- |
| Free waitlist | 20% | 6% |
| Under $20 (impulse buy) | 12% | 4% |
| $20–75 (treat-yourself buy) | 8% | 2.5% |
| $75–250 (think-about-it buy) | 5% | 1.5% |
| $250+ (big purchase) | 3% | 1% |

A waitlist with a price shown has to clear 1.5× the bar, because joining costs nothing. Under 30 visitors the verdict is always **NEED MORE DATA**. On top of the outcome, the engine diagnoses:
- **Hook problem:** almost nobody tapped the button, so the page isn't grabbing people.
- **Close problem:** people tapped but didn't reserve, which points to price or trust.
- **Price check:** the median "what would you pay" compared with your price.
- **Best crowd:** which source converts best.

All of this is a pure, unit-tested function in `src/lib/verdict.ts`.

## Run it locally

Requires Node 20.9+.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The database is a local SQLite file at `data/validly.db`, created automatically.

For a production build:

```bash
npm run build && npm start
```

## Tests

```bash
npm test
```

Unit tests: the verdict engine, money and source helpers.

```bash
npm run build && npm start -- -p 3100
```

```bash
BASE_URL=http://localhost:3100 DATABASE_URL=file:./data/validly.db npm run test:e2e
```

The end-to-end suite drives a real browser through every flow:
- the wizard and its validation, and photo upload;
- 40+ visitors from different sources, owner exclusion, and duplicate and typo handling;
- live stats, CSV export, editing, close and reveal;
- verdict cards (PNG sizes) and privacy toggles;
- reopen, retrial, and save, login, logout and recovery codes;
- the guest-to-account merge, waitlists in GBP, automatic expiry, and reports hiding a page;
- deleting tests and accounts.

`tests/e2e/screens.mjs` renders every theme to PNGs for a visual check.

## Deploy

The app is a standard Next.js 16 app.

1. Create a hosted libSQL database, for example on [Turso](https://turso.tech). Serverless hosts don't keep local files.
2. Set the environment variables (see `.env.example`):
   - `DATABASE_URL=libsql://…`
   - `DATABASE_AUTH_TOKEN=…`
   - `APP_URL=https://your-domain` (optional)
   - `ADMIN_EMAILS=you@example.com` (optional, enables `/admin` moderation)
3. Deploy to Vercel, or anywhere that runs `next start`. Tables are created automatically on first request.

On a single always-on server (a VPS, Railway or Fly with a volume) the local SQLite file works fine. Keep `data/` on a persistent disk.

## Project map

```
src/
  app/
    (site)/            home, wizard (/new), dashboard, account, login, recover, admin
    t/[slug]/          the public pre-launch page
    v/[slug]/          the public verdict card
    api/               tests, track, reserve, report, img, og, card (PNG), auth, interest, admin
  components/          test page, wizard, dashboard, verdict reveal, UI bits
  lib/
    verdict.ts         the verdict engine (pure)
    validation.ts      zod rules shared by browser and server
    catalog.ts         categories, emojis, copy suggestions
    themes.ts          the 6 page themes
    server/            db, auth, repo (data access), guards, card renderer
tests/
  unit/                vitest
  e2e/                 Playwright flows + screenshot script
```

## Roadmap

- Real pre-orders (Stripe) so people can actually pay, refundable if it never ships
- "We run $20 of ads for you" (the button already collects interest)
- Email reservers on launch day
- AI-written page copy from a one-line idea
- A/B test two prices or headlines in one test

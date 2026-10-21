# I spydle: share v2 spec

Replaces the emoji-grid share (section 1 "Share result" of `spec.md`) with an "I spy" challenge share: a short text, a generated image, and a link whose preview matches. Design tokens, fonts and the theme switch are the ones already in `spec.md` section 5.

## 1. Goals

- Reads as **I spy**, not as a Wordle clone.
- A stranger understands what happened in one glance: the first letter, how well the player did, and an invitation to try.
- **Spoiler-free:** the only fact about the answer that ever appears is its first letter, which every player is shown anyway. Never the word, its length, its category, or any letter after the first.

## 2. Share text

The only thing shared: the image is never attached (users preferred the text alone). Line 3 is the image's pip row in emoji.

Win:

```
I spy something beginning with S…
👁️ Sharp eyes: spied it in 5/6. Can you beat me?
⚫⚫⚫⚫🟢⚪
https://<domain>/p/4821
```

Loss:

```
I spy something beginning with S…
🤓 Needed glasses: couldn't spot it in 6. Can you?
⚫⚫⚫⚫⚫⚫
https://<domain>/p/4821
```

Rules:

- Line 1 uses the puzzle's first letter, uppercase.
- The link is the puzzle URL, optionally with the result param from section 5 (`?r=w5` or `?r=l`).
- Rating titles come from one config table (so copy can change without code changes):

| Result           | Title          | Emoji |
| ---------------- | -------------- | ----- |
| Won in 1 or 2    | Eagle eyes     | 🦅    |
| Won in 3, 4 or 5 | Sharp eyes     | 👁️    |
| Won in 6         | Just in time   | 😅    |
| Lost             | Needed glasses | 🤓    |

- Pips: six emoji. Won in n: n − 1 `⚫`, then `🟢`, then `⚪` for the rest. Lost: six `⚫`.
- Phrase for a win: `spied it in {n}/{max}`. Phrase for a loss: `couldn't spot it in {max}`.
- Implement as a pure function `buildShareText({ puzzleNo, firstLetter, status, guessesUsed, maxGuesses, baseUrl, withResultParam })` in `/shared`.

## 3. Share image

A PNG generated on the server by `GET /api/share-image` using `@vercel/og` (`ImageResponse`, Edge runtime). It never touches the database and never receives the answer.

### Query params

| Param   | Values                              | Notes                                                               |
| ------- | ----------------------------------- | ------------------------------------------------------------------- |
| `l`     | a to z                              | first letter (required)                                             |
| `n`     | integer                             | puzzle number, shown in the footer (required)                       |
| `r`     | `w1` to `w6`, or `l`                | result; omit for the neutral "challenge" card used by link previews |
| `style` | `lens`, `tiles`, `eye`              | graphic style, default from `SHARE_STYLE` env var                   |
| `theme` | `light`, `dark`                     | default `light`                                                     |
| `fmt`   | `card` (1080×1350), `og` (1200×630) | default `card`                                                      |

Validate everything: a bad or missing param returns `400`. The response is a PNG with `Cache-Control: public, max-age=31536000, immutable` (the set of possible URLs is small, so the CDN does the work). Alt text for the share sheet and `og:image:alt`: `I spydle puzzle {n}: something beginning with {L}. {Result sentence}.`

### Common layout (the `card` format; `og` is the same content on a wide canvas)

Top to bottom, centred, using the theme tokens:

1. **Wordmark:** small amber circle badge with a magnifier plus "I spydle" in Fredoka 600.
2. **Hero graphic:** one of the three styles below.
3. **Headline:** "I spy something beginning with {L}…" in Nunito 700, large.
4. **Result line:** rating title plus "spied it in 5/6" (win) or "couldn't spot it" (loss). Omitted on the neutral card, where this line becomes "Can you spot it?".
5. **Pips:** six circles. Won in n: n filled in ink, the last one green, the rest outlined. Lost: all six filled in the muted tile colour. Neutral card: all outlined.
6. **Footer:** "Can you beat me?" (neutral: "Play now") and `ispydle.app · #{n}` in the muted text colour.

Never use emoji inside the image (font rendering is unreliable in the renderer); draw every icon as inline SVG. Bundle Fredoka and Nunito font files with the function; don't fetch them at runtime.

### Style options (build all three behind `style`, then keep the winner)

**A. `lens`: the spyglass.** A large magnifying glass: a thick amber ring with the handle at 45° bottom-right, the letter in Fredoka 600 (about 360px, uppercase, ink colour) centred in the glass. The glass interior uses the theme's ground colour with a small white highlight arc in the top-left of the ring. This is the clearest "I spy" signal and the most original of the three.

**B. `tiles`: the prefix row.** The first letter in a large green circle, followed by four dashed ghost circles. The number of ghost circles is always four, so it never reveals the word length. It mirrors the in-game prefix row, which makes it instantly recognisable as the game, but sits closest to Wordle in feel.

**C. `eye`: the eye.** A large almond eye outline in ink, with a green iris circle holding the letter where the pupil would be, a small highlight on the iris and no eyelashes. It's a playful, memorable image, with an "I spy with my little eye" joke built in.

**Loss variants:** the same graphics, but the confirmed green is replaced by the muted tile colour and the ink colour is used for the letter. No red, no sad faces.

## 4. Client behaviour

- The result sheet shows the card as a preview (`fmt=card`, the user's current theme and the default style) above the buttons.
- **Share** (primary):
  1. if `navigator.share` exists, share `{ text }` only (never the image file);
  2. else copy the text to the clipboard and show a "Copied" toast.
- **Save image** (secondary): downloads the PNG as `ispydle-{n}.png`.
- Track the action only as a counter (`share_clicked`), nothing else.

## 5. Link previews (Open Graph)

The app is a single-page app, so crawlers see no per-puzzle meta tags. Add a function that renders them.

- `vercel.json`: rewrite `/p/:puzzleNo` to `/api/page?no=:puzzleNo`. All other routes keep the SPA fallback.
- `/api/page` loads the built `index.html`, looks up the puzzle's first letter, and injects into `<head>`:
  - `og:title` "I spy something beginning with S…"
  - `og:description` "Can you spot it in 6 guesses? Play I spydle."
  - `og:image` `/api/share-image?l=s&n=4821&fmt=og[&r=…]` (absolute URL), plus `og:image:alt`
  - `twitter:card` `summary_large_image`
- Unknown puzzle: serve the plain SPA with generic tags and a `404` status only for crawlers if easy; otherwise plain `200` is acceptable.
- **Optional result param:** `?r=w5` or `?r=l` on the puzzle URL personalises the preview ("spied it in 5/6"). The app ignores `r` for gameplay; it only affects the preview image. Cache the page for 5 minutes (`s-maxage=300`).

## 6. Removing the old share

Delete the emoji-grid builder and its tests, and remove the section from `spec.md`. Update the acceptance criteria, which now say: _the share text and image contain only the first letter of the answer; they contain no other letters, no length and no category._

## 7. Tests

- `buildShareText`: win at 1, 3, 5 and 6 guesses and a loss, with and without the result param; titles match the rating table.
- No-leak test: over a list of 200 sample answers, assert the text contains no character of the answer other than its first letter appearing in the "beginning with" slot, and no digits other than the guess counts and puzzle number.
- `/api/share-image`: returns `image/png` at the right dimensions for `card` and `og`; returns `400` for bad params; sets the immutable cache header; response is identical for the same params (no timestamps).
- `/api/page`: injected tags contain the right letter and an absolute image URL; no answer text appears anywhere in the HTML.
- Playwright: finish a game, tap Share with `navigator.share` stubbed, and assert only the text is passed (no files, even when `canShare` accepts them); check the clipboard fallback.

## 8. Acceptance criteria

- Pasting the text into WhatsApp, iMessage and Slack shows a link preview with the neutral or result card; sharing from the sheet on iOS and Android sends text only.
- A person who has never seen the game can tell, from the share alone, which letter the word started with and how well the sender did.
- Nothing in the text, image or preview reveals the word, its length or its category.
- All three styles render correctly in light and dark; one is chosen and the other two deleted before launch.
- Share still works with images blocked, offline, or when the image endpoint errors.

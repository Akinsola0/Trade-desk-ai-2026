# Images this site expects

Referenced by path, not statically imported, so the build succeeds without
them — each one just falls back to a solid neutral colour until you add the
real file at the exact path below.

| Path                     | Used on                                     | What it should be                                                                                                                 |
| ------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `hero-tradesman.jpg`     | `/` (hero) and `/about`                     | A tradesman on site, hi-vis visible — the photo referenced in the design brief. Landscape, at least 1600×900.                     |
| `about-team.jpg`         | `/about` (mission block)                    | A photo representing the team/product — office, a call being answered, whatever's true.                                           |
| `about-office.jpg`       | `/about` (second story block)               | Same idea, a second image so the page doesn't repeat one photo twice.                                                             |
| `audience-homeowner.jpg` | `/` (homeowner panel, right under the hero) | A homeowner looking at their phone, or a completed job — whatever reads as "the customer side". Roughly square, at least 800×800. |
| `audience-business.jpg`  | `/` (business panel, right under the hero)  | A tradesman with a calendar, phone or tools — "the business side". Roughly square, at least 800×800.                              |

Drop a file at one of these paths (`public/images/<name>.jpg`) and it appears
immediately — the CSS treatment (cover, dark scrim on the hero) is already
wired up, nothing else needs to change.

The "find a tradesman" chat's AI avatar (`components/marketplace/find-tradesman-chat.tsx`) isn't on this list — it's a CSS gradient sphere, not a photo, and isn't waiting on an asset.

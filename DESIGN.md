---
name: Highland Creative
description: A Southern Highlands show schedule in plum card stock, manila entry tags and wood-type numerals.
colors:
  plum: "#7a215c"
  plum-deep: "#561642"
  plum-night: "#34102a"
  olive: "#a39a1c"
  olive-deep: "#48541a"
  manila: "#e3c27c"
  manila-light: "#f0dcac"
  eyelet-brass: "#c7a258"
  ribbon-blue: "#2f6f93"
  sky: "#d5ebf7"
  ground: "#eef1e6"
  ground-2: "#e2e7d6"
  paper: "#fbfcf7"
  ink: "#1f1a1e"
  ink-soft: "#4b4349"
  on-plum: "#f7ecf3"
  on-plum-soft: "#dcbfd1"
  on-olive: "#f4f6e6"
  on-olive-soft: "#d6dcb5"
  error: "#a3123a"
typography:
  display:
    fontFamily: "Bevan, Rockwell, Roboto Slab, serif"
    fontSize: "clamp(2.5rem, 1.5rem + 3.4vw, 4.4rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Bevan, Rockwell, Roboto Slab, serif"
    fontSize: "clamp(2rem, 1.35rem + 2.3vw, 3.35rem)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Bevan, Rockwell, Roboto Slab, serif"
    fontSize: "clamp(1.3rem, 1.1rem + .6vw, 1.6rem)"
    fontWeight: 400
    lineHeight: 1.15
  numeral:
    fontFamily: "Bevan, Rockwell, Roboto Slab, serif"
    fontSize: "2.6rem"
    fontWeight: 400
    lineHeight: 1
  class-title:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: "clamp(1.25rem, 1.1rem + .5vw, 1.55rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "0.05em"
  lede:
    fontFamily: "Sofia Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 1.05rem + .45vw, 1.4rem)"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Sofia Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    fontFeature: "\"kern\", \"liga\""
  label:
    fontFamily: "Sofia Sans Extra Condensed, Arial Narrow, sans-serif"
    fontSize: ".95rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.07em"
rounded:
  hairline: "2px"
  sm: "3px"
  stamp: "4px"
  round: "50%"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  sp-4: "2.5rem"
  sp-5: "4rem"
  sp-6: "clamp(4.5rem, 3rem + 5vw, 8rem)"
components:
  button-plum:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.on-plum}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: ".7rem 1.25rem"
    height: "48px"
  button-plum-hover:
    backgroundColor: "{colors.plum-deep}"
    textColor: "{colors.on-plum}"
  button-manila:
    backgroundColor: "{colors.manila}"
    textColor: "{colors.plum-night}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: ".7rem 1.25rem"
    height: "48px"
  button-manila-hover:
    backgroundColor: "{colors.manila-light}"
    textColor: "{colors.plum-night}"
  button-line:
    backgroundColor: "transparent"
    rounded: "{rounded.sm}"
    padding: ".7rem 1.25rem"
    height: "48px"
  class-ribbon:
    backgroundColor: "{colors.plum}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    padding: ".55rem 1.9rem .55rem .9rem"
    height: "46px"
  class-ribbon-olive:
    backgroundColor: "{colors.olive-deep}"
  class-ribbon-blue:
    backgroundColor: "{colors.ribbon-blue}"
  entry-tag:
    backgroundColor: "{colors.manila}"
    textColor: "{colors.ink}"
    padding: "3.4rem clamp(1.25rem, 2vw, 1.75rem) 1.6rem"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "0"
    padding: ".55rem .2rem .45rem"
    height: "46px"
  section-numeral:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.paper}"
    typography: "{typography.numeral}"
    rounded: "{rounded.round}"
    size: "clamp(3.25rem, 2.6rem + 2vw, 4.5rem)"
  judge-tab:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.hairline}"
    padding: ".4rem .8rem"
    height: "42px"
  judge-tab-selected:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.on-plum}"
  entry-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    padding: ".75rem .75rem 1.1rem"
  care-card:
    backgroundColor: "{colors.paper}"
    padding: "1.5rem 1.5rem 1.25rem"
---

# Design System: Highland Creative

## Overview

**Creative North Star: "The Highlands Show Schedule"**

The system is the printed matter of a country show: a schedule of classes, entry tags, judges' cards and prize ribbons, set on a pale pasture ground. Services are numbered classes, portfolio pieces are entries pinned in the pavilion, testimonials are the judges' words, and every enquiry is lodged on a manila tag. The look is warm, tactile and confident. It reads as paper and card stock, never as a software interface.

Density is moderate and rhythm is generous. Sections are separated by full-bleed changes of stock (pasture ground, sky panel, olive pavilion, manila studio band, plum-night gate) rather than by divider lines. Inside a section, information is set the way a schedule is printed: ruled lists with letterpress numerals, dotted leaders running to a fee, condensed capitals for class names. Composition is deliberately asymmetric. The hero is an off-centre plum cover with a string-hung tag overlapping its edge, and feature grids are 8/4 or 5/7 splits rather than equal columns.

The build rejects the generic studio template of a centred hero, three service cards and a logo strip. Seasonality is a durable brand commitment: the framed tree photograph changes with spring, summer, autumn and winter, the way the studio's own site already rotates its imagery.

**Key Characteristics:**
- Plum card-stock covers with a double manila keyline, on a pale pasture ground.
- Manila tags with clipped top corners, a punched brass eyelet and a hanging string.
- Bevan wood-type for headings and every numeral; condensed capitals for labels; Sofia Sans for reading.
- Ruled schedule lists with dotted leaders and fees set flush right.
- Paper objects carry slight alternating tilts and soft, long shadows.
- States are printed: a rotated double-ruled stamp confirms each submission.

## Colors

A three-stock palette (plum, olive, manila) on a pasture-tint ground, with sky and a single ribbon blue as cool relief.

### Primary
- **Show Plum** (#7a215c): The working accent. Primary buttons, the tap-to-call button, section numeral badges, class numerals, the active nav underline, selected tabs and filters, link hover, focus rings and text selection.
- **Cover Plum** (#561642): Schedule-cover stock on every page hero, primary button hover, and deep plum type for fees, table headers and pull lines. It is also the theme colour.
- **Night Plum** (#34102a): Footer gate stock, the concept bar, text on manila buttons, and the tint for every tag and rosette shadow.

### Secondary
- **Manila** (#e3c27c): Entry tags, the studio band, the secondary button, mini entry tags on work cards, and the only accent permitted on plum or olive stock (headline emphasis, imprint line, phone number, footer labels).
- **Pale Manila** (#f0dcac): Manila hover, season name and labels on plum, and the text-selection foreground.
- **Eyelet Brass** (#c7a258): The ring around every punched eyelet on a tag.

### Tertiary
- **Pavilion Olive** (#48541a): Full-bleed stock behind the work pavilion, the second ribbon in each sequence, tick icons and neutral fees ("By quote").
- **Field Olive** (#a39a1c): Used only for the nav hover underline.
- **Ribbon Blue** (#2f6f93): The third ribbon in each sequence, plus the numeral badge and condition rules on the sky band.
- **Highland Sky** (#d5ebf7): The membership band and the backing of the framed seasonal tree.

### Neutral
- **Pasture Ground** (#eef1e6): The page ground and the header (at 94% opacity with blur). It also fills the eyelet hole.
- **Trodden Ground** (#e2e7d6): Hover fills, unselected filter ribbons, and the scrollbar track.
- **Show Paper** (#fbfcf7): Card faces, photo mounts, frame borders, the proposed-classes sheet, and headline type on plum.
- **Ink** (#1f1a1e): Body and heading text, heavy 3px schedule rules, and outlined control borders.
- **Soft Ink** (#4b4349): Intro paragraphs, descriptions, and secondary meta.
- **On Plum** (#f7ecf3) / **On Plum Soft** (#dcbfd1): Primary and secondary text on plum stock.
- **On Olive** (#f4f6e6) / **On Olive Soft** (#d6dcb5): Primary and secondary text on olive stock.
- **Error Red** (#a3123a): The underline on invalid fields. Error text uses a darker #8f0f33 on manila or paper, and pinks on dark stock.

### Named Rules
**The Card-Stock Rule.** Dark surfaces are always full stock (Cover Plum, Night Plum or Pavilion Olive), never tinted panels. On dark stock, text uses its matching on-colour, and manila is the only accent.

**The Three Ribbons Rule.** Any coloured sequence (class ribbons, plan steps) cycles plum, pavilion olive, ribbon blue in that order. Ribbon text is white.

## Typography

**Display Font:** Bevan (with Rockwell, Roboto Slab, serif)
**Body Font:** Sofia Sans (with Segoe UI, system-ui, sans-serif)
**Label Font:** Sofia Sans Extra Condensed (with Arial Narrow, sans-serif)

All three faces are self-hosted as woff2 with `font-display: swap`. Bevan is preloaded.

**Character:** Bevan is a heavy slab-serif wood type with the weight of a show poster. Its partner is a tall, tight condensed grotesque in capitals that reads like a printed class label, and a plain humanist sans carries every sentence a visitor actually reads.

### Hierarchy
- **Display** (Bevan 400, clamp 2.5–4.4rem, 1.04): Cover headlines, capped at about 12ch on home and 16ch on inner pages. Emphasis (`em`) stays upright and turns manila on plum, or plum on paper.
- **Headline** (Bevan 400, clamp 2–3.35rem, 1.04): Section titles beside a numeral badge, and the footer call to action.
- **Title** (Bevan 400, clamp 1.3–1.6rem, 1.15): Card, member and care-card headings.
- **Numeral** (Bevan 400, 2.6rem, 1): Class numbers, section badges, proposed-class letters, nav and ribbon counts, prices and the big phone number.
- **Class Title** (Sofia Sans Extra Condensed 800, clamp 1.25–1.55rem, 0.05em, uppercase): Names in schedule lists, Q&A summaries, conditions and table headers.
- **Lede** (Sofia Sans 400, clamp 1.15–1.4rem, 1.45): Cover ledes and section intros, 34–52ch.
- **Body** (Sofia Sans 400, 1.0625rem, 1.6): Reading text, 60–68ch.
- **Label** (Sofia Sans Extra Condensed 700–800, 0.9–1.08rem, 0.06–0.1em, uppercase): Nav, buttons, field labels, status, roles, meta and imprint lines. The imprint is tracked wider, at 0.14em.

### Named Rules
**The Wood-Type Numeral Rule.** Every numeral that counts or ranks something is set in Bevan, whether it is a class number, badge, count, price or phone number. Prose figures stay in Sofia Sans, using tabular lining numerals where they align.

**The Single-Weight Display Rule.** Bevan is only ever set at 400. Hierarchy comes from size and stock colour, never from faux bold.

## Layout

The page is a centred wrap capped at 1360px, with fluid gutters (clamp 16–48px). Sections breathe on a large fluid rhythm (`sp-6`, 4.5–8rem), and inner blocks step down to 4rem and 2.5rem. Grids are asymmetric by default: hero cover against tag at 8.2:3.8, schedule at 5:7, judges at 4:8, services at 4:8, contact at 7:5, and featured work on a 12-column grid with one 8-span lead entry and two stacked 4-span entries. Section headers sit beside their numeral badge, never centred above content.

Lists are printed schedules. Each opens with a 3px ink rule and separates rows with 1px rules at 20–25% ink, and dotted leaders run from a class name to its fee. Side headers (schedule aside, service heads) stay sticky at 110px while their content scrolls.

The responsive model has three steps. At 1180px the tag drops below the cover and overlaps it from the right. At 980px the nav collapses into a Menu button and every split grid becomes a single column. At 760px the string is hidden, leaders drop and fees wrap below their class, and the cover imprint tightens. The header stays sticky throughout, with `scroll-padding-top` at 96px.

### Named Rules
**The Ruled Schedule Rule.** Lists of classes, conditions, features or contents use a heavy top rule, hairline row rules and, where there is a value, a dotted leader. They never become a grid of equal cards.

## Elevation & Depth

Depth comes from paper objects lifted off the ground: tags, mounted photographs, cards and frames. Shadows are soft and long, with a negative spread so they pool below the object. They are tinted with night plum or ink, never neutral grey glows. Flat stock bands stay flat and get their separation from colour alone. Hanging tags use a `filter: drop-shadow` so the shadow follows the clipped silhouette.

### Shadow Vocabulary
- **Card** (`0 14px 28px -16px rgb(31 26 30 / .35), 0 2px 5px -1px rgb(31 26 30 / .12)`): Care card, rules sheet, details card, map frame, cover, and resting work-grid cards.
- **Hung Tag** (`filter: drop-shadow(0 18px 18px rgb(52 16 42 / .28)) drop-shadow(0 3px 4px rgb(52 16 42 / .2))`): The entry tag on its string.
- **Pinned Entry** (`0 22px 34px -20px rgb(0 0 0 / .55)`, lifting on hover to `0 30px 44px -22px rgb(0 0 0 / .6)`): Featured entry cards in the pavilion.
- **Framed Plate** (`0 0 0 1px rgb(227 194 124 / .6), 0 18px 30px -14px rgb(0 0 0 / .45)`): The seasonal tree frame, which also has a 6px paper mount.
- **Badge Ring** (`0 0 0 4px <ground>, 0 0 0 6px <badge colour>`): A double ring around section numerals that follows the stock it sits on.

### Named Rules
**The Hung Paper Rule.** Only paper objects cast shadows, and each shadow falls downward with a negative spread. A hard offset shadow is never used.

**The Tilt Budget Rule.** Paper objects tilt by small, alternating amounts: cards ±0.5–1°, the hung tag 2.2°, mini-tags 4°, pending tags −4°. Stamps alone sit at −7°. On hover a tilted card straightens and lifts.

## Shapes

Rectangles are almost square: buttons, the stepper, the search field and icon buttons use 3px, while season buttons, judge tabs and covers use 2px. Full circles are kept for eyelets, section numeral badges and the status dot. The world's shapes come from cut card rather than rounding. Tags have both top corners clipped at 45°, at 26px on the large tag, 16px on pending tags and 10px on mini-tags, with a round eyelet punched centred near the top. Ribbons and filter chips are notched swallowtails, with a 12–14px V cut into the right edge. Plum covers carry a double inset keyline in manila, 2px at 12px inset and 1px at 18px inset. The proposed-classes sheet uses a 2px dashed plum border, because it is a draft schedule.

### Named Rules
**The Cut-Card Rule.** A shape gets its character from a clipped corner, a notch or a punched hole, never from a large radius. Nothing rectangular is rounded above 4px.

## Components

### Buttons
Tactile and stamped. Every button is condensed uppercase type (800, 1.08rem, 0.07em) in a 48px-minimum block.
- **Shape:** Nearly square (3px) with a 2px border slot.
- **Primary (plum):** Show Plum with on-plum text. Hover moves to Cover Plum and lifts 1px; active presses down 1px.
- **Manila:** Manila with night-plum text, used on dark stock and as the hero call to action. Hover turns Pale Manila.
- **Line:** A transparent fill with a currentColor border, so it inherits the stock's ink. Hover adds a 10% white wash.
- **Tel:** A compact plum button (44px) carrying a phone icon. It shrinks to a 44px icon-only square at 760px and below.
- **Focus:** A 3px plum outline at 3px offset, which turns manila on dark stock.

### Class Ribbons and Filter Chips
- **Style:** Swallowtail-notched bands in condensed caps, with the Bevan class number at 85% opacity. Their colours cycle per the Three Ribbons Rule.
- **State:** On hover a ribbon lifts 3px and brightens. Filter chips rest on Trodden Ground and turn plum when pressed (`aria-pressed`), with a Bevan count beside the label.

### Cards / Containers
- **Entry card:** A paper mount (0.75rem padding) around a 4:3 photo, with a Bevan title and plum condensed meta. It tilts slightly at rest, and on hover it straightens, lifts 6px and zooms the photo by 3.5%. A mini manila tag can be pinned to the top-right corner.
- **Care / details card:** A paper face with a 1px olive or ink hairline, the Card shadow and 1.5–1.75rem padding.
- **Rules sheet:** A paper face with an inner 1px plum keyline inset by 10px.
- **Member card:** A paper photo mount with a square portrait. The outer cards tilt in opposite directions.

### Inputs / Fields
- **Style:** Ledger lines on a transparent ground: no box, a 2px bottom rule at 55% ink, 46px minimum height and square corners. Labels are condensed caps (800, 0.92rem, 0.08em). Selects carry a drawn chevron.
- **Focus:** The rule turns plum and the field takes a 30% white wash. The global outline is suppressed in favour of the rule.
- **Error:** The rule turns Error Red and a weight-600 message appears below. On dark stock both shift to pinks.
- **Search (work page):** The exception is a boxed field, with a 2px ink border at 3px radius on paper and an inline SVG search icon.

### Navigation
- **Header:** A sticky pasture strip at 94% opacity with a backdrop blur. It holds the logo, a numbered ordered list of sections (condensed caps with a small Bevan plum numeral) and, at the right, a live studio status dot (pulsing green when open) and the tap-to-call button.
- **States:** On hover a 3px olive underline appears. The current page gets a 3px plum underline and plum-deep text.
- **Mobile (980px and below):** A boxed Menu button opens a full-width dropdown with 1.3rem rows divided by hairlines.
- **Footer gate:** Night-plum stock with a manila badge, a large Bevan phone number in manila, a definition list with manila condensed labels, and a plain link list.

### Entry Tag (signature)
The enquiry form is a manila tag hung from an SVG string, with clipped top corners, a brass-ringed eyelet that shows the ground through it, and a fine paper-grain noise. A header row pairs a Bevan title with a condensed plum entry number above a 2px ink rule. On submit the form body is replaced by a **stamp**: a double-ruled 3px plum border at 4px radius, rotated −7°, in condensed caps with a noise mask and multiply blend. It lands with a 0.5s "thud" scale-in. On first view the tag swings into place over 2.2s.

### Schedule Cover (signature)
A Cover Plum panel with radial plum lift, fine noise and a double manila keyline. It holds the Bevan headline and lede, then a manila and a line button. On the home page it adds a framed seasonal plate with season toggle buttons, which reveals the new tree through a 1.1s circular clip. An imprint line ruled in 40% manila sits along its foot. Inner pages reuse the cover with a large Bevan figure or phone number in manila at the right.

### Section Numeral and Rosette
Section numerals are Bevan figures in filled circles with a double ring, plum on the ground, manila on olive or night plum, and outline-only on the draft sheet. The judges' rosette is an inline SVG built from palette colours (plum, cover plum, manila, eyelet brass, paper) with condensed-cap text.

### Judges' Tabs
Testimonials sit in a large Sofia Sans 500 quote under a Bevan open-quote mark, with condensed-cap attribution. The tablist sits under a 2px ink rule. Its tabs are hairline-bordered (2px radius); hover turns them plum and the selected tab is filled plum. Swapping quotes settles in over 0.6s with a slight rise and an unblur.

## Do's and Don'ts

### Do:
- **Do** separate sections by changing full-bleed stock (ground, sky, olive-deep, manila, night plum) rather than drawing divider lines between them.
- **Do** set every counting or ranking numeral in Bevan 400, and every label, button and class name in Sofia Sans Extra Condensed capitals at 0.05–0.1em tracking.
- **Do** set lists as ruled schedules: a 3px ink top rule, hairline rows and dotted leaders to a value.
- **Do** cycle coloured sequences plum, olive-deep, ribbon blue.
- **Do** give paper objects small alternating tilts and soft downward shadows tinted night plum or ink. Straighten and lift them on hover.
- **Do** confirm a submitted state with the rotated double-ruled stamp.
- **Do** use only manila as the accent on plum or olive stock, with the matching on-colour for text.
- **Do** use `cubic-bezier(.16, 1, .3, 1)` for movement and honour `prefers-reduced-motion`. Under reduced motion every animation and transition collapses to near zero.
- **Do** keep icons as stroked inline SVG (2px stroke, round caps) from the shared sprite.

### Don't:
- **Don't** centre a hero or lay services out as three equal cards. Covers sit off-centre and services are a numbered, ruled schedule.
- **Don't** round rectangles above 4px. Character comes from clipped corners, notches and punched eyelets.
- **Don't** use hard offset shadows or neutral grey glows. Use the Hung Paper Rule.
- **Don't** set Bevan bold or italic, or use it for body copy, labels or buttons.
- **Don't** put a short uppercase eyebrow or kicker above a headline. Condensed caps belong on labels, imprint lines and class names, not as decoration over a heading.
- **Don't** introduce a new hue for a sequence or state. Extend the plum, olive and ribbon-blue cycle or reuse a stock.

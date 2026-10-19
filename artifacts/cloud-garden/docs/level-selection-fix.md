# Level selection and navigation repair

## Changes

- Expanded menu/picker scrolling areas explicitly grow and use a zero flex basis.
  On native Yoga layouts, an existing explicit `flexGrow: 0` can override the
  intended effect of a later `flex: 1` shorthand and collapse the scroll area.
- All level tiles retain their number and name, including locked levels.
  Locked buttons remain disabled and retain an accessible locked description.
- Stars, scores and records use readable mode-specific colors. Genesis buttons
  use light text on their dark secondary background and dark text on orange.
- Tile sizing accounts for system text scale and two lines of scores/badges.
  Short screens scroll the navigation footer rather than squeezing out the grid.
- Automatic positioning keeps chapter controls in view when the current tile
  already fits. Home menu buttons no longer reserve row-style vertical space.
- A direct Home button and Android Back / browser Escape handling connect the
  selector, Home and gameplay. Physics remains paused while a menu is open.
- Picker eligibility and gameplay selection share a bounded, zero-based rule.
  Existing per-mode AsyncStorage records and Genesis fast-pass rules are
  preserved; no player saves are reset.

## Verification

- TypeScript passes. The complete validation suite passes all 966 tests.
- Regression tests cover large-text tile geometry, valid/invalid selection
  indices and immediate Level 1 → Level 2 unlocking after a cold storage reload
  for all five modes.
- A browser run completed actual Campaign Level 1 with the supplied drawing
  solution, earned three stars, immediately selected newly unlocked Level 2,
  and retained `unlocked: 1`, `last: 1`, and the Level 1 stars after reload.
- Compact 320×568, landscape 640×360 and tablet 1024×768 layouts were checked.
  Final chapters and numbered locked tiles were browsed in all five modes.
  Home, close-to-game and Escape navigation were exercised without stacked
  menu sheets.
- The browser found the Genesis Home-button contrast problem. The subsequent
  color-only correction passes type checking and calculated contrast checks:
  secondary 12.15:1 and primary 6.88:1.

## Android testing download

`SliceAndBloom-level-selection-test.apk` is a standalone QA build for
`com.gamevilla.sliceandbloom.preview`, with official Google test ads and public
debug signing. It is not the production package and must not be submitted to
Google Play. Existing Expo-managed production signing credentials are untouched.

The download package includes the current privacy policy, testing instructions
and a source-fingerprint manifest. Native build verification checks the APK
signature, package, bundled configuration and 16KB ZIP alignment.

No physical Android device was available for installation or system-font-scale
testing. Browser results and a successful native build do not establish that
every device layout or AdMob delivery has been verified.

# Building width and stair correction

The web assets now use the ground-floor facade planes, x -5.491 to 5.367 m. First-floor and roof architecture widen around a registered stair core; beds, seating, hot tub and planting assemblies translate without stretching. Elevations remain ground 0.18 m, first 2.94 m, roof 5.84 m. Source Blender files and all three original GLBs were verified unchanged by SHA-256.

## Geometry and navigation

`src/data/building-layout.json` is the shared source for widths, stair paths, openings, supported landing bounds, body radius, ceilings and the web-only divider correction. Both structural slabs and their finish surfaces receive the same opening cut. The original first-floor slab is replaced in the revised export so its previous oversized opening does not remain.

The ground-to-first upper flight stops at z -2.95, then turns west and exits through the existing doorway at x 3.98. It no longer crosses the solid wall at x 4.65. The first-to-roof route uses the same ascending flight orientation to provide headroom between stacked stairs. Its roof exit is centered at x 3.80 in the existing glass doorway. This construction remains inferred, not a verified architectural stair design.

The web-only first-floor stair divider ends at the traced lightwell edge, native y 730; its former extension to y 855.73 obstructed the bedroom corridor. No original Blender geometry is edited.

New supported platforms, beveled treads and guards are included in `building-structure.glb`. Ceilings cover the enclosed ground/first-floor rooms, with undersides at 2.78/5.50 m. Stair openings and outdoor/lightwell areas are cut out. Structure and ceilings display during walkthrough and whole-property inspection; individual-floor inspection hides them. The roof remains open.

Navigation checks walls even while on stairs, includes wall-edge clearance, limits the walking corridor to the physical tread width minus body radius, blocks unsupported voids, and retains small movement substeps. Rapid key taps buffered between rendering frames now preserve their movement distance instead of collapsing into one tap.

## Validation

- Navigation ascent/descent, continuous elevation, corrected doorway and solid wall, bedroom corridor, room/bath doors, roof obstacles, voids, exterior bounds and prevention of floor teleporting pass.
- Blender reimport and world-space mesh ray checks: 375 samples, zero failures. Checks include centre and lateral foot support, headroom, and wall/glazing/guard clearance along both stairs and the bedroom corridor. These sampled checks do not certify every possible user position.
- Browser WASD testing reached the first-floor hallway, a bedroom and the family bathroom, climbed onto the roof terrace, returned through the first-floor landing and descended to the ground floor. Ground-floor camera height on return was 1.93 m.
- Whole-property and individual-floor controls, a 390 x 844 responsive layout, resize, reset and Escape were exercised. Embedded-browser pointer capture is unavailable; drag-look fallback remains. Responsive sizing was tested, not a physical touch device.
- Lint and production build pass.

Screenshots are in the parent workspace: `building-aligned-browser.png`, `first-floor-entrance-corrected.png`, `first-floor-ceiling-browser.png`, `roof-entrance-corrected.png`, and `aligned-mobile-first-floor.png`. Mesh/export reports are `building_mesh_validation.json` and `building_alignment_export.json`.

## Revised assets and rollback

- `public/models/first-floor-aligned.glb`: 28611632 bytes.
- `public/models/roof-floor-aligned.glb`: 48550544 bytes.
- `public/models/building-structure.glb`: 2072580 bytes.
- Ground floor still loads the original `ground-floor.glb`.

All original files remain available. To roll back, restore the previous viewer/navigation code and original first/roof model URLs; do not delete the original assets.

Rebuild from the parent workspace with Blender 5.2: `blender -b --python build_aligned_web.py`. Validate actual exports with `blender -b --python validate_building_geometry.py`. In `viewer`, run `npm run test:navigation`, `npm run lint`, and `npm run build`.

Existing asset licenses remain those recorded in the ground/first/roof asset registers and integration reports. New slabs, ceilings, stairs and guards are custom generated geometry with no additional third-party asset requirements.

This change is local; nothing was pushed to GitHub or deployed to Vercel.

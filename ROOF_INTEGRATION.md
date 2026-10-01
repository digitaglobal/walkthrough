# Three-level walkthrough review

Roof asset: `public/models/roof-floor.glb`, 48,443,036 bytes (46.2 MiB). Ground and first-floor GLBs remain unchanged. Roof meshes retain the shared world transform: slab 5.80 m, finish 5.84 m. Inspection offers Whole property, Ground floor, First floor and Roof terrace. Walkthrough shows all levels and starts downstairs.

## Export and appearance

The workspace parent contains `export_roof_web.py` and `validate_roof_web.py`. The exporter reads `roof_reference_match.blend` without saving it, converts curves, evaluates geometry modifiers and bakes complex albedo/procedural normals. Textures are capped at 2K. Reimport verified 329 meshes, 17 materials, 11 texture images, and both glass and water transmission. Browser lighting approximates Blender; procedural water detail is represented by a baked normal map rather than animated water.

All three Blender source files and both approved floor GLBs passed SHA256 preservation checks. Their checksums and export details are in the parent workspace's `roof_web_export_report.json` and `roof_web_reimport.json`.

## Inferred stair connection

Original roof descending treads, intermediate landing, central divider and handrails are excluded from the web export. The web connector retains the existing ground-to-first route and adds a right-flight ascent, intermediate landing, left-flight ascent and doorway exit at roof level. An approach from the east side of the first-floor landing distinguishes the upward route from the downstairs stair. Upper treads are 0.60 m wide and navigation is limited to a 0.28 m corridor; the lower connector retains its previous dimensions. The connecting route is inferred because elevations and construction dimensions are unavailable. No Blender originals or approved floor assets were modified to make this connection.

The roof trace provides the shared transform, floor polygons, glass and parapet segments, planter bounds, kitchen bounds and hot tub bounds. Navigation blocks these obstacles and exposed floor edges. Stairs interpolate height with small movement substeps, maintaining the existing 1.75 m eye height.

## Verification

- Navigation tests cover both stair connections up/down, room and roof circulation, no level teleport, voids, roof limits, parapets/glazing, planters, kitchen and spa collisions.
- Browser WASD walk reached roof eye height 7.59 m from ground eye height 1.93 m, then returned downstairs. `browser-ascent-check.json` and `browser-descent-check.json` record actual browser camera checkpoints.
- Floor controls, loading overlay, reset and keyboard movement checked in the local browser. Mouse capture was unavailable in the embedded browser; drag-look fallback remains supported and Escape was exercised.
- Browser resizing during walking no longer resets the camera. The 390 × 844 mobile layout was inspected; all floor controls remain accessible. Touch mode uses the existing coarse-pointer detection and omits desktop walking controls; a physical touch device was not tested.
- A temporary missing roof asset produced the expected 404 model error and Try again control; the asset was restored and recovery checked.
- Screenshots: roof-overview-browser.png, whole-property-browser.png, roof-walkthrough-browser.png, roof-mobile-browser.png, roof-loading-error-browser.png.
- `npm run test:navigation`, `npm run lint` and `npm run build` pass. No GitHub push or deployment performed.

## Asset licenses

Roof furniture, leaves, cabinetry, spa and architecture are custom geometry generated in the workspace. Existing texture assets are Poly Haven CC0: [Wood Floor](https://polyhaven.com/a/wood_floor), [Concrete Floor 01](https://polyhaven.com/a/concrete_floor_01), and [Hochsal Field](https://polyhaven.com/a/hochsal_field). [Poly Haven license](https://polyhaven.com/license). The HDR environment is illustrative lighting/background, not the actual property surroundings. The user-supplied plan was used as reference; it is not included in the new GLB.

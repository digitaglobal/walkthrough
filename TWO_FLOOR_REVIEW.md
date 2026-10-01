# Ground and first floor walkthrough

Both GLBs share Blender's world coordinates, converted to glTF Y-up. Do not independently center either asset. The upper floor is approximately 2.90 m above ground; the walking surfaces use 0.18 m and 2.94 m with a 1.75 m eye offset. Dimensions are estimates from the plans.

Whole property shows both levels. Ground floor and First floor buttons isolate a level for orbit inspection. Walk through always shows both levels and begins downstairs. WASD/arrow keys move, Shift speeds up, click captures mouse look, Escape releases it, and drag-to-look works when embedded browsers reject pointer capture. Reset returns to the downstairs starting point in walk mode. Coarse-pointer devices use orbit inspection; narrow screens receive a wider overview framing.

## Inferred stairs

The reviewed source first-floor meshes include onward stair flights and a continuous structural slab. The web export excludes those flights and cuts a stair opening at world X 2.68–5.28, Z -5.79–-2.07. A separate connector rises north, turns east at its intermediate landing, then returns south onto the upper landing. It replaces the old ground stair treads at runtime. Ground under-stair divider meshes are hidden for clearance. Room geometry is preserved; stair details are inferred rather than construction-verified.

Navigation uses traced wall runs with door gaps plus floor boundaries and excludes the lightwell and unsupported stair areas. A narrow supported stair corridor overrides the stairwell wall trace, interpolates elevation and permits only adjacent height changes. Motion substeps are at most 8 cm. This is basic architectural collision, not a physics simulation or furniture collision.

## Export and checks

From the parent workspace run Blender with `--python export_first_floor_web.py`, then `--python validate_first_floor_web.py`. Neither script saves changes into the source blends. The export applies bevels and triangulation, converts detail curves and bakes complex albedo onto a complete repeating UV tile. Existing PBR normal and roughness maps remain; texture dimensions are capped at 2048. Generic cloth overlays are limited to the existing ground asset.

First-floor GLB: 29,001,128 bytes (27.7 MiB); unchanged ground GLB: 34,568,552 bytes (33.0 MiB). Total model transfer is approximately 63.6 MB before HTTP compression. Reimport verified 307 meshes, 19 materials, 11 textures, maximum texture dimension 2048 and retained glazing transmission. Source-file SHA-256 preservation is recorded in the parent workspace export report.

`npm run test:navigation` checks stair ascent/descent, smooth elevation, bedroom access, voids, bounds and prevention of teleporting between floors. `npm run lint` and `npm run build` validate the app. Browser review verified loading, both floor inspection controls, stacked geometry, keyboard movement, reset, missing-model error/retry and a 390 × 844 responsive layout. Embedded pointer lock was rejected by the host browser; drag look is supplied as fallback. Actual touch hardware and a full manual stair traverse in a standalone browser remain useful user checks; deterministic stair traversal passes.

Textures and HDRI are existing Poly Haven CC0 assets (wood_floor, floor_tiles_04, concrete_floor_01 and hochsal_field). Furniture, plants and stair connector are locally modeled. Source images are reference documents and are not included in the GLB. Blender and browser lighting differ, so this is not a pixel-identical Cycles render. No roof geometry, deployment or GitHub push is included.

# Temporary doors and single stair system

Room/service door leaves are hidden by `HIDE_ROOM_DOORS = true` in `src/lib/modelVisibility.ts`. Set it to false to restore them. Nine explicitly identified leaves are affected; thresholds, frames, fixed/exterior glazing, wardrobes, car doors and the closed exterior stair-core panel remain. Mesh names are normalized because Three.js replaces spaces with underscores while loading GLBs.

The original ground-floor stair hiding rule used unsanitized names, so legacy steps remained visible over the navigation-aligned stairs. New `ground-floor-single-stair.glb` removes 12 legacy treads, their upper landing and the already excluded closet dividers. The ground asset is now 33,119,700 bytes. `building-structure-single-stair.glb` (1,359,568 bytes) consolidates coplanar flat path strips and landing platforms, including the duplicated shared first-floor entry/exit surface. Inclined flights, walls, ceilings and guards remain; the shared navigation path and elevations are unchanged.

Reproduce from the workspace root with `blender --background --python build_single_stair_web.py`. Validate with `blender --background --python validate_single_stair_geometry.py`. The build hashes the original Blender and web assets and confirms they remain unchanged. Previous GLBs remain available for rollback; point the viewer back to `ground-floor.glb` and `building-structure.glb` to restore those versions.

Validation: lint, navigation tests and production build passed. Reimported meshes passed 375 support/headroom/body-clearance samples and 276 exterior coverage samples with no failures. Browser movement reached first-floor eye height 4.69 m, roof 7.59 m and returned downstairs to 1.93 m through both connections. Explicit name checks confirmed all nine leaves are selected while frames, thresholds, car handles, glazing and exterior closure are excluded.

Screenshots in the workspace root: `single-stair-first-landing.png` and `single-stair-roof-landing.png`. Original assets and Blender files were preserved. No push or deployment was performed; no third-party assets were added.

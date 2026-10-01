# Exterior enclosure and camera correction

The viewer now loads `public/models/first-floor-enclosed.glb` (28,706,792 bytes). Ground, roof and structural assets retain their existing filenames and contents. Original Blender files and previous GLBs were verified unchanged by SHA-256; see `../first_floor_enclosure_report.json`.

## Geometry

Replaced the compressed west and collapsed east exterior facades with 120 mm opaque walls extending inward from the approved facade planes. Rebuilt horizontal exterior runs, window sill/head panels and the lower-right bedroom's stepped west return. Existing glazing and openings remain. A closed panel fills the unused external stair-core doorway; this inferred detail does not alter either internal stair route. The roof, balconies, parking and gardens remain outdoors.

Complete bed assemblies moved inward without resizing: bedroom 1 +12 mm, bedroom 2 +125 mm, bedroom 3 −9 mm along X. Furniture counts and room layouts remain unchanged. Collision planes follow the new facade centers and stepped return.

Reproduce from the workspace root with Blender: `blender --background --python build_enclosed_web.py`. This imports the rollback asset and creates only the revised web GLB; it does not save over a Blender original. Validate with `blender --background --python validate_enclosed_geometry.py`.

## Camera

Yaw/pitch initialize from the camera quaternion when entering or resetting walkthrough. Orientation reconstructs with zero roll and ±85° pitch limits. Pointer capture leaves orientation unchanged; its first movement is ignored. Escape, blur and pointer-lock changes reset tracking. Captured look uses relative deltas; drag fallback uses client-coordinate differences.

## Validation

- Lint, navigation regression checks and production build passed.
- Actual exported meshes: 276 exterior ray coverage checks at four heights found zero leaks; 375 walking-path samples found zero support, headroom or wall-clearance failures across both stair connections and the bedroom corridor.
- Browser: first click and repeated clicks retained orientation; drag changed yaw/pitch with zero roll; Escape, reset and overview-to-walkthrough transition remained upright.
- Walked from ground level through the first-floor stair doorway into a furnished bedroom and inspected its restored opaque headboard wall and ceiling junction. Screenshot: `../first-floor-bedroom-wall-fixed.png`; downstairs camera screenshot: `../camera-fixed-walkthrough.png`.
- The embedded browser rejects pointer capture, so browser testing exercised drag fallback. Successful native pointer-lock capture/release still requires testing in a desktop browser; its transition handling is implemented.

No GitHub push or deployment was performed. Added wall geometry is custom; no additional third-party assets or licenses are introduced.

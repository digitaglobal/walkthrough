"use client";

import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, useProgress } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import * as THREE from "three";
import { walkingSurface, EYE_HEIGHT, WALK_START } from "@/lib/navigation";
import { makeWeaveTexture } from "@/lib/detailTexture";

import StairConnector from "./StairConnector";
import { HIDE_ROOM_DOORS, isRoomDoor } from "@/lib/modelVisibility";
type FloorView = "whole" | "ground" | "first" | "roof";
type Mode = "orbit" | "walk";
const OVERVIEW = new THREE.Vector3(14, 22, 20);

class ModelErrorBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ onReady, level, visible }: { onReady: () => void; level: "ground" | "first" | "roof"; visible: boolean }) {
  const { scene } = useGLTF(level === "first" ? "/models/first-floor-enclosed.glb" : level === "ground" ? "/models/ground-floor-single-stair.glb" : "/models/roof-floor-aligned.glb");
  useEffect(() => {
    const fabric = makeWeaveTexture();
    const rug = makeWeaveTexture(true);
    const detailed = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      if (isRoomDoor(object.name)) object.visible = !HIDE_ROOM_DOORS;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (detailed.has(material) || !(material instanceof THREE.MeshStandardMaterial)) continue;
        detailed.add(material);
        if (level === "ground" && /upholstery|cushion|linen/i.test(material.name) && !material.map) {
          material.map = fabric;
          material.roughness = 0.92;
          material.needsUpdate = true;
        } else if (level === "ground" && /woven rug/i.test(material.name) && !material.map) {
          material.map = rug;
          material.roughness = 0.95;
          material.needsUpdate = true;
        }
      }
      const glass = materials.some((material) => material.transparent || (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0));
      object.castShadow = !glass;
      object.receiveShadow = !glass && (level !== "ground" || /^(Drive and parking approach|Two-car parking|Garden passage|Planted garden|Upper entry hall|Stairwell|Main ground floor|Powder room$|Service room$|Kitchen finish|Living rug|Front terrace$|Under-stair closet floor)/.test(object.name));
    });
  }, [scene, level]);
  useEffect(() => { onReady(); }, [onReady]);
  return <primitive object={scene} visible={visible} />;
}

function CameraControls({ mode, floorView, reset, onLock }: { mode: Mode; floorView: FloorView; reset: number; onLock: (locked: boolean) => void }) {
  const { camera, gl, size } = useThree();
  const orbit = useRef<OrbitControlsType>(null);
  const keys = useRef(new Set<string>());
  const queuedSteps = useRef({ forward: 0, strafe: 0 });
  const locked = useRef(false);
  const direction = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  const look = useRef({yaw:0,pitch:0});
  const dragOrigin = useRef<{x:number;y:number}|null>(null);
  const ignoreCaptureMove = useRef(false);

  useEffect(() => {
    keys.current.clear();
    queuedSteps.current = { forward: 0, strafe: 0 };
    if (mode === "orbit") {
      document.exitPointerLock?.();
      if (camera instanceof THREE.PerspectiveCamera) camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(THREE.MathUtils.degToRad(45) / 2)));
      const targetHeight = floorView === "roof" ? 5.84 : floorView === "first" ? 2.94 : floorView === "whole" ? 2.9 : 0;
      camera.position.copy(floorView === "roof" ? new THREE.Vector3(10, 21, 12) : floorView === "first" ? new THREE.Vector3(10, 19, 12) : OVERVIEW);
      camera.lookAt(0, targetHeight, 0);
      orbit.current?.target.set(0, targetHeight, 0);
      orbit.current?.update();
    } else {
      if (camera instanceof THREE.PerspectiveCamera) camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(THREE.MathUtils.degToRad(64) / 2)));
      camera.position.set(WALK_START.x, WALK_START.height, WALK_START.z);
      camera.up.set(0,1,0);
      camera.lookAt((760 - 639) * 0.0095, 1.05, (1940 - 1280) * 0.0095);
      const initial = new THREE.Euler().setFromQuaternion(camera.quaternion,"YXZ");
      look.current = {yaw:initial.y,pitch:initial.x};
      camera.quaternion.setFromEuler(new THREE.Euler(initial.x,initial.y,0,"YXZ"));
      dragOrigin.current=null;
      ignoreCaptureMove.current=false;
    }
  }, [mode, floorView, reset, camera]);

  useEffect(() => {
    if (mode !== "orbit") return;
    camera.position.copy(floorView === "roof" ? new THREE.Vector3(10,21,12) : floorView === "first" ? new THREE.Vector3(10,19,12) : OVERVIEW);
    camera.position.multiplyScalar(Math.max(1,.85*size.height/size.width));
    orbit.current?.update();
  }, [mode,floorView,reset,camera,size.height,size.width]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (mode !== "walk") return;
      if(event.code === "Escape"){dragOrigin.current=null;keys.current.clear();queuedSteps.current={forward:0,strafe:0};return;}
      keys.current.add(event.code);
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      if (!event.repeat) {
        if (event.code === "KeyW" || event.code === "ArrowUp") queuedSteps.current.forward += 1;
        if (event.code === "KeyS" || event.code === "ArrowDown") queuedSteps.current.forward -= 1;
        if (event.code === "KeyD" || event.code === "ArrowRight") queuedSteps.current.strafe += 1;
        if (event.code === "KeyA" || event.code === "ArrowLeft") queuedSteps.current.strafe -= 1;
      }
    };
    const up = (event: KeyboardEvent) => keys.current.delete(event.code);
    const blur = () => { keys.current.clear(); queuedSteps.current = { forward: 0, strafe: 0 }; dragOrigin.current=null; };
    const change = () => { locked.current = document.pointerLockElement === gl.domElement; onLock(locked.current); dragOrigin.current=null; ignoreCaptureMove.current=locked.current; if (!locked.current) blur(); };
    const beginDrag = (event:PointerEvent) => {if(mode === "walk" && event.button === 0 && !locked.current)dragOrigin.current={x:event.clientX,y:event.clientY};};
    const endDrag = () => {dragOrigin.current=null;};
    const dragLook = (event: PointerEvent) => {
      if(mode !== "walk")return;
      let dx=0,dy=0;
      if(locked.current){
        if(ignoreCaptureMove.current){ignoreCaptureMove.current=false;return;}
        dx=event.movementX;dy=event.movementY;
      } else {
        if(event.buttons !== 1 || !dragOrigin.current)return;
        dx=event.clientX-dragOrigin.current.x;dy=event.clientY-dragOrigin.current.y;
        dragOrigin.current={x:event.clientX,y:event.clientY};
      }
      if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
      look.current.yaw-=THREE.MathUtils.clamp(dx,-100,100)*.003;
      look.current.pitch=THREE.MathUtils.clamp(look.current.pitch-THREE.MathUtils.clamp(dy,-100,100)*.003,-Math.PI*85/180,Math.PI*85/180);
      camera.quaternion.setFromEuler(new THREE.Euler(look.current.pitch,look.current.yaw,0,"YXZ"));
    };
    const capture = () => {
      if (mode !== "walk" || locked.current || typeof gl.domElement.requestPointerLock !== "function") return;
      try { Promise.resolve(gl.domElement.requestPointerLock()).catch(() => {}); } catch { /* Embedded browsers may reject capture; drag look remains available. */ }
    };
    gl.domElement.addEventListener("pointerdown",beginDrag);
    window.addEventListener("pointerup",endDrag);
    gl.domElement.addEventListener("pointercancel",endDrag);
    gl.domElement.addEventListener("pointermove", dragLook);
    gl.domElement.addEventListener("click", capture);
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); document.addEventListener("pointerlockchange", change);
    return () => { gl.domElement.removeEventListener("pointerdown",beginDrag); window.removeEventListener("pointerup",endDrag); gl.domElement.removeEventListener("pointercancel",endDrag); gl.domElement.removeEventListener("pointermove", dragLook); gl.domElement.removeEventListener("click", capture); window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); document.removeEventListener("pointerlockchange", change); };
  }, [gl, onLock, mode, camera]);

  useFrame(({ camera: activeCamera }, delta) => {
    if (process.env.NODE_ENV === "development") {
      gl.domElement.setAttribute("data-camera-position", activeCamera.position.toArray().map(v => v.toFixed(4)).join(","));
      activeCamera.getWorldDirection(direction.current);
      gl.domElement.setAttribute("data-camera-direction", direction.current.toArray().map(v => v.toFixed(4)).join(","));
      const angles=new THREE.Euler().setFromQuaternion(activeCamera.quaternion,"YXZ");
      gl.domElement.setAttribute("data-camera-angles",[angles.x,angles.y,angles.z].map(v=>v.toFixed(6)).join(","));
    }
    if (mode !== "walk") return;
    const tap = queuedSteps.current;
    queuedSteps.current = { forward: 0, strafe: 0 };
    const forward = Number(keys.current.has("KeyW") || keys.current.has("ArrowUp")) - Number(keys.current.has("KeyS") || keys.current.has("ArrowDown")) + tap.forward;
    const strafe = Number(keys.current.has("KeyD") || keys.current.has("ArrowRight")) - Number(keys.current.has("KeyA") || keys.current.has("ArrowLeft")) + tap.strafe;
    if (!forward && !strafe) return;
    activeCamera.getWorldDirection(direction.current);
    direction.current.y = 0;
    direction.current.normalize();
    side.current.crossVectors(direction.current, camera.up).normalize();
    const speed = (keys.current.has("ShiftLeft") || keys.current.has("ShiftRight") ? 4.3 : 2.2) * (Math.min(delta, 0.05) + Math.hypot(tap.forward, tap.strafe) * 0.08) / Math.hypot(forward, strafe);
    const dx = (direction.current.x * forward + side.current.x * strafe) * speed;
    const dz = (direction.current.z * forward + side.current.z * strafe) * speed;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
    for (let i = 0; i < steps; i++) {
      const xHeight = walkingSurface(activeCamera.position.x + dx / steps, activeCamera.position.z, activeCamera.position.y - EYE_HEIGHT);
      if (xHeight !== null) { activeCamera.position.x += dx / steps; activeCamera.position.y = xHeight + EYE_HEIGHT; }
      const zHeight = walkingSurface(activeCamera.position.x, activeCamera.position.z + dz / steps, activeCamera.position.y - EYE_HEIGHT);
      if (zHeight !== null) { activeCamera.position.z += dz / steps; activeCamera.position.y = zHeight + EYE_HEIGHT; }
    }

  });

  return mode === "orbit"
    ? <OrbitControls ref={orbit} enableDamping minDistance={3} maxDistance={55} maxPolarAngle={Math.PI / 2.02} />
    : null;
}

function Loading({ progress }: { progress: number }) {
  return <div className="overlay"><div className="overlay-card"><h2>Preparing your walkthrough</h2><p>Loading both floors, the roof terrace, and their detailed materials.</p><div className="progress"><div style={{ width: `${progress}%` }} /></div><p>{Math.round(progress)}%</p></div></div>;
}

function webglAvailable() {
  try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; }
}

export default function PropertyViewer() {
  const [mode, setMode] = useState<Mode>("orbit");
  const [floorView, setFloorView] = useState<FloorView>("whole");
  const [loaded, setLoaded] = useState({ground:false,first:false,roof:false,structure:false});
  const [reset, setReset] = useState(0);
  const ready = loaded.ground && loaded.first && loaded.roof && loaded.structure;
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [touch, setTouch] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const { progress } = useProgress();
  useEffect(() => { const id = window.setTimeout(() => { setWebgl(webglAvailable()); setTouch(window.matchMedia("(pointer: coarse)").matches); }, 0); return () => window.clearTimeout(id); }, []);
  const groundReady = useCallback(() => setLoaded(v => v.ground ? v : {...v,ground:true}), []);
  const firstReady = useCallback(() => setLoaded(v => v.first ? v : {...v,first:true}), []);
  const roofReady = useCallback(() => setLoaded(v => v.roof ? v : {...v,roof:true}), []);
  const structureReady = useCallback(() => setLoaded(v => v.structure ? v : {...v,structure:true}), []);
  const handleError = (message: string) => setError(message);
  const handleLock = (isLocked: boolean) => setLocked(isLocked);

  return <main className="app">
    {webgl && <div className="viewer"><Canvas shadows camera={{ position: [12, 18, 18], fov: 45, near: 0.05, far: 200 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1; gl.shadowMap.type = THREE.PCFShadowMap; }}>
      <color attach="background" args={["#cbd4d0"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-9, 18, 10]} intensity={2.0} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-near={0.5} shadow-camera-far={60} shadow-bias={-0.0002} shadow-normalBias={0.04} />
      <ModelErrorBoundary onError={handleError}><Suspense fallback={null}><Environment files="/env/hochsal_field_2k.hdr" background={mode === "walk"} environmentIntensity={0.65} /><Model level="ground" visible={mode === "walk" || (floorView === "whole" || floorView === "ground")} onReady={groundReady} /><Model level="first" visible={mode === "walk" || (floorView === "whole" || floorView === "first")} onReady={firstReady} /><Model level="roof" visible={mode === "walk" || floorView === "whole" || floorView === "roof"} onReady={roofReady} /><StairConnector visible={mode === "walk" || floorView === "whole"} onReady={structureReady} /></Suspense></ModelErrorBoundary>
      <EffectComposer multisampling={4}><N8AO aoRadius={1.4} distanceFalloff={0.5} intensity={1.15} quality="medium" halfRes /></EffectComposer>

      <CameraControls mode={mode} floorView={floorView} reset={reset} onLock={handleLock} />
    </Canvas></div>}
    <header className="topbar"><div className="brand"><div className="mark">⌂</div><div><p className="eyebrow">Interactive residence</p><h1>Townhouse Type A</h1></div></div><span className="tag">Two floors + roof · 3,619 sq ft</span></header>
    <div className="bottom"><div className="panel"><p className="eyebrow">Explore the space</p><p className="intro">Explore all three levels from above or walk upstairs to the roof terrace.</p>{mode === "orbit" && <div className="controls" aria-label="Floor inspection">{(["whole", "ground", "first", "roof"] as FloorView[]).map(level => <button key={level} className={`control ${floorView === level ? "active" : ""}`} onClick={() => setFloorView(level)}>{level === "whole" ? "Whole property" : level === "ground" ? "Ground floor" : level === "first" ? "First floor" : "Roof terrace"}</button>)}</div>}<div className="controls"><button className={`control ${mode === "orbit" ? "active" : ""}`} onClick={() => setMode("orbit")}>Overview</button>{!touch && <button className={`control ${mode === "walk" ? "active" : ""}`} onClick={() => setMode("walk")}>Walk through</button>}<button className="control" onClick={() => setReset((value) => value + 1)}>Reset camera</button></div><p className="instructions">{mode === "orbit" ? "Drag to rotate · Scroll to zoom · Right-drag to pan" : "WASD to move and climb stairs · Shift to move faster · Click or drag to look · Esc releases mouse"}</p></div><div className="details">3 bedrooms · 3.5 baths<br />2 parking spaces</div></div>
    {mode === "walk" && !locked && ready && !error && <div className="capture-hint">Click for mouse look · Drag if capture is unavailable</div>}
    {!ready && !error && webgl && <Loading progress={progress} />}
    {(!webgl || error) && <div className="overlay"><div className="overlay-card"><h2>3D view unavailable</h2><p>{!webgl ? "This browser does not support WebGL. Try a current desktop browser with hardware acceleration enabled." : `The model could not be loaded. ${error}`}</p><button className="control" onClick={() => window.location.reload()}>Try again</button></div></div>}
  </main>;
}

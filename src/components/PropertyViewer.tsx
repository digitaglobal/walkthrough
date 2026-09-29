"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls, PointerLockControls, useGLTF, useProgress } from "@react-three/drei";
import { EffectComposer, N8AO } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import * as THREE from "three";
import { canWalk, WALK_START } from "@/lib/navigation";
import { makeWeaveTexture } from "@/lib/detailTexture";

type Mode = "orbit" | "walk";
const OVERVIEW = new THREE.Vector3(12, 18, 18);

class ModelErrorBoundary extends Component<{ children: ReactNode; onError: (message: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onError(error.message); }
  render() { return this.state.failed ? null : this.props.children; }
}

function Model({ onReady }: { onReady: () => void }) {
  const { scene } = useGLTF("/models/ground-floor.glb");
  useEffect(() => {
    const fabric = makeWeaveTexture();
    const rug = makeWeaveTexture(true);
    const detailed = new Set<THREE.Material>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) {
        if (detailed.has(material) || !(material instanceof THREE.MeshStandardMaterial)) continue;
        detailed.add(material);
        if (/upholstery|cushion|linen/i.test(material.name) && !material.map) {
          material.map = fabric;
          material.roughness = 0.92;
          material.needsUpdate = true;
        } else if (/woven rug/i.test(material.name) && !material.map) {
          material.map = rug;
          material.roughness = 0.95;
          material.needsUpdate = true;
        }
      }
      const glass = materials.some((material) => material.transparent || (material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0));
      object.castShadow = !glass;
      object.receiveShadow = !glass && /^(Drive and parking approach|Two-car parking|Garden passage|Planted garden|Upper entry hall|Stairwell|Main ground floor|Powder room$|Service room$|Kitchen finish|Living rug|Front terrace$|Under-stair closet floor)/.test(object.name);
    });
  }, [scene]);
  useEffect(() => { onReady(); }, [onReady]);
  return <primitive object={scene} />;
}

function CameraControls({ mode, reset, onLock }: { mode: Mode; reset: number; onLock: (locked: boolean) => void }) {
  const { camera, gl } = useThree();
  const orbit = useRef<OrbitControlsType>(null);
  const keys = useRef(new Set<string>());
  const queuedSteps = useRef({ forward: 0, strafe: 0 });
  const locked = useRef(false);
  const direction = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());

  useEffect(() => {
    keys.current.clear();
    queuedSteps.current = { forward: 0, strafe: 0 };
    if (mode === "orbit") {
      document.exitPointerLock?.();
      if (camera instanceof THREE.PerspectiveCamera) camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(THREE.MathUtils.degToRad(45) / 2)));
      camera.position.copy(OVERVIEW);
      camera.lookAt(0, 0, 0);
      orbit.current?.target.set(0, 0, 0);
      orbit.current?.update();
    } else {
      if (camera instanceof THREE.PerspectiveCamera) camera.setFocalLength(camera.getFilmHeight() / (2 * Math.tan(THREE.MathUtils.degToRad(64) / 2)));
      camera.position.set(WALK_START.x, WALK_START.height, WALK_START.z);
      camera.lookAt((760 - 639) * 0.0095, 1.05, (1940 - 1280) * 0.0095);
    }
  }, [mode, reset, camera]);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (mode !== "walk") return;
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
    const blur = () => { keys.current.clear(); queuedSteps.current = { forward: 0, strafe: 0 }; };
    const change = () => { locked.current = document.pointerLockElement === gl.domElement; onLock(locked.current); if (!locked.current) keys.current.clear(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); document.addEventListener("pointerlockchange", change);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); document.removeEventListener("pointerlockchange", change); };
  }, [gl, onLock, mode]);

  useFrame(({ camera: activeCamera }, delta) => {
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
    const speed = (keys.current.has("ShiftLeft") || keys.current.has("ShiftRight") ? 4.3 : 2.2) * (Math.min(delta, 0.05) + (tap.forward || tap.strafe ? 0.08 : 0)) / Math.hypot(forward, strafe);
    const dx = (direction.current.x * forward + side.current.x * strafe) * speed;
    const dz = (direction.current.z * forward + side.current.z * strafe) * speed;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
    for (let i = 0; i < steps; i++) {
      if (canWalk(activeCamera.position.x + dx / steps, activeCamera.position.z)) activeCamera.position.x += dx / steps;
      if (canWalk(activeCamera.position.x, activeCamera.position.z + dz / steps)) activeCamera.position.z += dz / steps;
    }
    activeCamera.position.y = WALK_START.height;
  });

  return mode === "orbit"
    ? <OrbitControls ref={orbit} enableDamping minDistance={3} maxDistance={55} maxPolarAngle={Math.PI / 2.02} />
    : <PointerLockControls selector=".viewer canvas" />;
}

function Loading({ progress }: { progress: number }) {
  return <div className="overlay"><div className="overlay-card"><h2>Preparing your walkthrough</h2><p>Loading the detailed ground-floor model and materials.</p><div className="progress"><div style={{ width: `${progress}%` }} /></div><p>{Math.round(progress)}%</p></div></div>;
}

function webglAvailable() {
  try { const canvas = document.createElement("canvas"); return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl")); } catch { return false; }
}

export default function PropertyViewer() {
  const [mode, setMode] = useState<Mode>("orbit");
  const [reset, setReset] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [touch, setTouch] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const { progress } = useProgress();
  useEffect(() => { const id = window.setTimeout(() => { setWebgl(webglAvailable()); setTouch(window.matchMedia("(pointer: coarse)").matches); }, 0); return () => window.clearTimeout(id); }, []);
  const handleReady = () => setReady(true);
  const handleError = (message: string) => setError(message);
  const handleLock = (isLocked: boolean) => setLocked(isLocked);

  return <main className="app">
    {webgl && <div className="viewer"><Canvas shadows camera={{ position: [12, 18, 18], fov: 45, near: 0.05, far: 200 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.AgXToneMapping; gl.toneMappingExposure = 1; gl.shadowMap.type = THREE.PCFShadowMap; }}>
      <color attach="background" args={["#cbd4d0"]} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[-9, 18, 10]} intensity={2.0} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22} shadow-camera-near={0.5} shadow-camera-far={60} shadow-bias={-0.0002} shadow-normalBias={0.04} />
      <ModelErrorBoundary onError={handleError}><Suspense fallback={null}><Environment files="/env/hochsal_field_2k.hdr" background={mode === "walk"} environmentIntensity={0.65} /><Model onReady={handleReady} /></Suspense></ModelErrorBoundary>
      <EffectComposer multisampling={4}><N8AO aoRadius={1.4} distanceFalloff={0.5} intensity={1.15} quality="medium" halfRes /></EffectComposer>
      <CameraControls mode={mode} reset={reset} onLock={handleLock} />
    </Canvas></div>}
    <header className="topbar"><div className="brand"><div className="mark">⌂</div><div><p className="eyebrow">Interactive residence</p><h1>Townhouse Type A</h1></div></div><span className="tag">Ground floor · 3,619 sq ft</span></header>
    <div className="bottom"><div className="panel"><p className="eyebrow">Explore the space</p><p className="intro">Inspect the approved ground floor from above or walk through it at eye level.</p><div className="controls"><button className={`control ${mode === "orbit" ? "active" : ""}`} onClick={() => setMode("orbit")}>Overview</button>{!touch && <button className={`control ${mode === "walk" ? "active" : ""}`} onClick={() => setMode("walk")}>Walk through</button>}<button className="control" onClick={() => setReset((value) => value + 1)}>Reset camera</button></div><p className="instructions">{mode === "orbit" ? "Drag to rotate · Scroll to zoom · Right-drag to pan" : "WASD to move · Shift to move faster · Click the scene for mouse look · Esc releases mouse"}</p></div><div className="details">3 bedrooms · 3.5 baths<br />2 parking spaces</div></div>
    {mode === "walk" && !locked && ready && !error && <div className="capture-hint">Click the scene to look around</div>}
    {!ready && !error && webgl && <Loading progress={progress} />}
    {(!webgl || error) && <div className="overlay"><div className="overlay-card"><h2>3D view unavailable</h2><p>{!webgl ? "This browser does not support WebGL. Try a current desktop browser with hardware acceleration enabled." : `The model could not be loaded. ${error}`}</p><button className="control" onClick={() => window.location.reload()}>Try again</button></div></div>}
  </main>;
}

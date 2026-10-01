import { useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
export default function StairConnector({visible,onReady}:{visible:boolean;onReady:()=>void}){
 const {scene}=useGLTF("/models/building-structure-single-stair.glb");
 useEffect(()=>{scene.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=true;o.receiveShadow=true;}});onReady();},[scene,onReady]);
 return <primitive object={scene} visible={visible}/>;
}

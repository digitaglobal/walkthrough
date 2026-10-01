import layout from "@/data/building-layout.json";
import ground from "@/data/ground-floor-trace.json";
import first from "@/data/first-floor-trace.json";
import roof from "@/data/roof-trace.json";

type Point = [number, number];
export const GROUND_HEIGHT = .18;
export const FIRST_HEIGHT = 2.94;
export const ROOF_HEIGHT = 5.84;
export const EYE_HEIGHT = 1.75;
export const STAIR_PATH = layout.stairs[0].path;
export const ROOF_STAIR_PATH = layout.stairs[1].path;
export const STAIR_PATHS=[STAIR_PATH,ROOF_STAIR_PATH];
const radius=layout.body_radius, scale=ground.estimated_m_per_px, nativeScale=.0081/(1500/1367);
function warp(x:number,level:"first"|"roof"){const w=layout.warps[level];const [west,east]=layout.facade_planes;return x<=w.core?west+(x-w.west)*(layout.core_left-west)/(w.core-w.west):layout.core_left+(x-w.core)*(east-layout.core_left)/(w.east-w.core);}
export function firstToWorld([x,y]:number[]):Point {return [warp(3.98+(x-1141*1500/1367)*nativeScale,"first"),-3.92+(y-340*2000/1823)*nativeScale];}
export function roofToWorld([x,y]:number[]):Point {const r=roof.registration;return [warp(r.anchor_world_xy[0]+(x-r.anchor_px[0])*r.m_per_px,"roof"),-r.anchor_world_xy[1]+(y-r.anchor_px[1])*r.m_per_px];}
function groundToWorld([x,y]:number[]):Point{return [(x-639)*scale,(y-1280)*scale];}
function inPolygon(x:number,z:number,p:number[][]){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,zi]=p[i],[xj,zj]=p[j];if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;}return inside;}
function projection(x:number,z:number,a:readonly number[],b:readonly number[]){const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return {t,distance:Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)};}
const groundWalls=ground.walls.filter(w=>!w.name.startsWith("Stair lower closet divider")).map(w=>[groundToWorld(w.a),groundToWorld(w.b)]);
const firstWalls:Point[][]=[];
for(const sourceWall of first.walls){const wall=sourceWall.name==="Stair upper divider"?{...sourceWall,end_px:layout.first_wall_end_overrides["Stair upper divider"]}:sourceWall;let start=wall.start_px;for(const [end,next] of [...wall.gaps_px,[wall.end_px,wall.end_px]]){if(end>start)firstWalls.push(wall.axis==='h'?[firstToWorld([start,wall.at_px]),firstToWorld([end,wall.at_px])]:[firstToWorld([wall.at_px,start]),firstToWorld([wall.at_px,end])]);start=next;}}
const groundZones=ground.zones.filter(z=>!['garden','rug'].includes(z.kind)).map(z=>z.points.map(groundToWorld));
// Rebuilt facades use real inward wall thickness at the approved exterior planes.
for(const wall of firstWalls){
 if(wall.every(p=>Math.abs(p[0]-firstToWorld([68.03,300.6])[0])<.002))for(const p of wall)p[0]=layout.facade_planes[0]+.06;
 if(wall.every(p=>Math.abs(p[0]-firstToWorld([1420.99,94.35])[0])<.002))for(const p of wall)p[0]=layout.facade_planes[1]-.06;
}
const returnX=firstToWorld([850,1690])[0]+.06;
firstWalls.push([[returnX,firstToWorld([850,1680.75])[1]],[returnX,firstToWorld([850,1922.11])[1]]]);
const firstFootprint=first.footprint.map(firstToWorld);
const firstVoids=[first.zones.stair_left,first.zones.stair_right,first.zones.light_well].map(p=>p.map(firstToWorld));
const roofZones=['main_oak_deck','lower_cross_deck','stair_entry_deck','white_paved_strip'].map(key=>roof.zones[key as keyof typeof roof.zones].map(roofToWorld));
function roofContainsBody(x:number,z:number){return [[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>roofZones.some(p=>inPolygon(x+dx,z+dz,p)));}
const roofWalls=[...roof.boundaries,...roof.glazing].map(w=>[roofToWorld(w.a),roofToWorld(w.b)]);
const roofBlocks=[...Object.entries(roof.zones).filter(([key])=>key.includes('planter')||key==='ribbed_core_cover'||key==='stair_opening').map(([,points])=>points.map(roofToWorld)),...['hot_tub','kitchen_counter','kitchen_island'].map(key=>{const [a,b,c,d]=roof.furniture[key as keyof typeof roof.furniture];return [[a,b],[c,b],[c,d],[a,d]].map(roofToWorld);})];
const sharedOpening:Point[]=[[layout.opening[0],layout.opening[1]],[layout.opening[2],layout.opening[1]],[layout.opening[2],layout.opening[3]],[layout.opening[0],layout.opening[3]]];
function blockedByPolygon(x:number,z:number,p:Point[]){return inPolygon(x,z,p)||p.some((a,i)=>projection(x,z,a,p[(i+1)%p.length]).distance<radius);}
export function walkingSurface(x:number,z:number,currentHeight:number):number|null{
 const walls = [...(currentHeight<2.86?groundWalls:[]), ...(currentHeight+EYE_HEIGHT>2.90&&currentHeight<5.58?firstWalls:[]), ...(currentHeight+EYE_HEIGHT>5.8?roofWalls:[])];
 if(walls.some(([a,b])=>projection(x,z,a,b).distance<radius+.06))return null;
 const candidates=STAIR_PATHS.flatMap((path,pathIndex)=>path.slice(0,-1).map((a,i)=>{const b=path[i+1],p=projection(x,z,a,b);return {height:a[2]+(b[2]-a[2])*p.t,distance:p.distance,width:layout.stairs[pathIndex].width/2-radius};})).filter(p=>p.distance<p.width&&Math.abs(p.height-currentHeight)<.28);
 if(candidates.length && Math.abs(currentHeight-ROOF_HEIGHT)<.12 && roofWalls.some(([a,b])=>projection(x,z,a,b).distance<radius))return null;
 if(candidates.length)return candidates.sort((a,b)=>a.distance-b.distance || Math.abs(a.height-currentHeight)-Math.abs(b.height-currentHeight))[0].height;
 if(Math.abs(currentHeight-GROUND_HEIGHT)<.25){if(!groundZones.some(p=>inPolygon(x,z,p))||groundWalls.some(([a,b])=>projection(x,z,a,b).distance<radius))return null;if(x>2.68&&x<5.28&&z< -2.15&&z> -5.79)return null;return GROUND_HEIGHT;}
 if(Math.abs(currentHeight-FIRST_HEIGHT)<.25){
 const [a,b,c,d]=layout.landing_bounds;if(x>a+radius&&x<c-radius&&z>b+radius&&z<d-radius)return FIRST_HEIGHT;if(![[0,0],[radius,0],[-radius,0],[0,radius],[0,-radius]].every(([dx,dz])=>inPolygon(x+dx,z+dz,firstFootprint))||firstVoids.some(p=>inPolygon(x,z,p))||firstWalls.some(([a,b])=>projection(x,z,a,b).distance<.12))return null;return FIRST_HEIGHT;}
 if(Math.abs(currentHeight-ROOF_HEIGHT)<.25){if(blockedByPolygon(x,z,sharedOpening)||!roofContainsBody(x,z)||roofBlocks.some(p=>blockedByPolygon(x,z,p))||roofWalls.some(([a,b])=>projection(x,z,a,b).distance<radius))return null;return ROOF_HEIGHT;}
 return null;
}
export const WALK_START={x:(740-639)*scale,z:(1470-1280)*scale,height:GROUND_HEIGHT+EYE_HEIGHT};

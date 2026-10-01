/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS test harness for transpiled TypeScript and JSON fixtures. */
const fs=require('node:fs'),assert=require('node:assert/strict'),ts=require('typescript');
const source=fs.readFileSync('src/lib/navigation.ts','utf8').replaceAll('@/data/','./src/data/');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
const mod={exports:{}};new Function('require','exports','module',compiled)(require,mod.exports,mod);
const {walkingSurface,STAIR_PATH,GROUND_HEIGHT,FIRST_HEIGHT,firstToWorld,roofToWorld,ROOF_HEIGHT,ROOF_STAIR_PATH}=mod.exports;
function traverse(path,start){let height=start;for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1];const count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.04);for(let j=0;j<=count;j++){const t=j/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,next=walkingSurface(x,z,height);assert.notEqual(next,null,`Blocked stair at ${x},${z},${height}`);assert.ok(Math.abs(next-height)<.08);height=next;}}return height;}
assert.ok(Math.abs(traverse(STAIR_PATH,GROUND_HEIGHT)-FIRST_HEIGHT)<.01);
assert.ok(Math.abs(traverse([...STAIR_PATH].reverse(),FIRST_HEIGHT)-GROUND_HEIGHT)<.01);
assert.equal(walkingSurface(20,20,GROUND_HEIGHT),null);
assert.equal(walkingSurface(20,20,FIRST_HEIGHT),null);
const trace=require('./src/data/first-floor-trace.json');
for(const zone of ['bedroom_1_oak','bedroom_2_oak','bedroom_3_oak','landing_oak']){const p=trace.zones[zone];const centre=p.reduce((s,v)=>[s[0]+v[0]/p.length,s[1]+v[1]/p.length],[0,0]);const [x,z]=firstToWorld(centre);assert.equal(walkingSurface(x,z,FIRST_HEIGHT),FIRST_HEIGHT,zone);assert.notEqual(walkingSurface(x,z,GROUND_HEIGHT),FIRST_HEIGHT);}
const [vx,vz]=firstToWorld([980,650]);assert.equal(walkingSurface(vx,vz,FIRST_HEIGHT),null,'lightwell void');
for(const wall of trace.walls.filter(w=>/bedroom|bath|ensuite/i.test(w.name)&&!w.name.startsWith("First floor")&&w.name!=="Ensuite north wall")){
 for(const gap of wall.gaps_px){const mid=(gap[0]+gap[1])/2;
  const covered=trace.walls.some(other=>other!==wall&&other.axis===wall.axis&&Math.abs(other.at_px-wall.at_px)<.5&&other.start_px<mid&&other.end_px>mid&&!other.gaps_px.some(([a,b])=>mid>a&&mid<b));
  if(covered)continue;
  const walkableSamples=Array.from({length:19},(_,i)=>(i+1)/20).some(t=>{const position=gap[0]+(gap[1]-gap[0])*t;const p=wall.axis==='h'?[position,wall.at_px]:[wall.at_px,position];const [x,z]=firstToWorld(p);return walkingSurface(x,z,FIRST_HEIGHT)===FIRST_HEIGHT;});
  assert.ok(walkableSamples,`door gap: ${wall.name}`);}
}
console.log('PASS stair ascent/descent, height continuity, rooms, void, bounds, no floor teleport');

assert.ok(Math.abs(traverse(ROOF_STAIR_PATH,FIRST_HEIGHT)-ROOF_HEIGHT)<.01);
assert.ok(Math.abs(traverse([...ROOF_STAIR_PATH].reverse(),ROOF_HEIGHT)-FIRST_HEIGHT)<.01);
for(const pixel of [[800,1000],[775,1250],[1050,740],[1066,690],[125,900]]){const [x,z]=roofToWorld(pixel);assert.equal(walkingSurface(x,z,ROOF_HEIGHT),ROOF_HEIGHT,`roof circulation ${pixel}`);assert.notEqual(walkingSurface(x,z,FIRST_HEIGHT),ROOF_HEIGHT,'no teleport to roof');}
for(const pixel of [[960,1400],[950,900],[1170,1000],[230,750],[1165,1300],[800,220],[20,1000],[1050,320],[1235,1000]]){const [x,z]=roofToWorld(pixel);assert.equal(walkingSurface(x,z,ROOF_HEIGHT),null,`roof obstacle ${pixel}`);}
assert.equal(walkingSurface(20,20,ROOF_HEIGHT),null);
console.log('PASS roof ascent/descent, circulation, hot tub, kitchen, planters, core, glazing, edges and void');

assert.equal(walkingSurface(4.65,-2.543,FIRST_HEIGHT),null,'solid wall cannot serve as stair exit');
assert.equal(walkingSurface(3.98,-2.543,FIRST_HEIGHT),FIRST_HEIGHT,'real doorway remains open');
for(const point of [[2.7,-3.5],[5.25,-3.5]])assert.equal(walkingSurface(...point,FIRST_HEIGHT),null,'stair void edge blocked');
console.log('PASS corrected doorway, solid wall and stair void edges');

for(const [x,z] of [[2.9,-.65],[2.3,-.65],[1.65,-.65],[1.65,2.417],[.89,2.417]])assert.equal(walkingSurface(x,z,FIRST_HEIGHT),FIRST_HEIGHT,'supported bedroom corridor');
console.log('PASS landing to bedroom corridor');

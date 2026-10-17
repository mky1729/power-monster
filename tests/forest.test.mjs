import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync } from 'node:fs';
import { powmons, forestSpots, forestItems, forestTrees, nextForestPowmon, captureChance } from '../lib/powmon.ts';

test('every encounter and item is reachable from the forest entrance', () => {
  const blocked = new Set(forestTrees.map(([x,y]) => `${x},${y}`));
  const queue = [[1,6]], visited = new Set(['1,6']);
  for (let i=0; i<queue.length; i++) {
    const [x,y] = queue[i];
    for (const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
      if(nx<1||nx>8||ny<1||ny>6||blocked.has(key)||visited.has(key)) continue;
      visited.add(key);queue.push([nx,ny]);
    }
  }
  for(const spot of [...forestSpots,...forestItems]) assert(visited.has(`${spot.x},${spot.y}`), `${spot.label ?? spot.name} is unreachable`);
  assert(visited.has('1,6'), 'return exit must be reachable');
});

test('all nine new species can be found without replaying completed story missions', () => {
  const collection = ['ally-001','enemy-001','enemy-overdrive'];
  for(const spot of forestSpots) {
    let id;
    while((id=nextForestPowmon(spot.pool, collection))) { assert(powmons.some(p=>p.id===id));collection.push(id); }
  }
  assert.equal(new Set(collection).size,12);
  assert.equal(collection.length,12);
  assert.equal(new Set(powmons.map(p=>p.id)).size,12);
});

test('all new artwork and named card designs resolve to included assets', () => {
  const urls = powmons.flatMap(p => [p.image,p.evolvedImage,...Object.values(p.cards??{}),...Object.values(p.evolvedCards??{})]).concat(forestItems.map(i=>i.image)).filter(Boolean);
  const used = new Set(urls.map(url=>new URL(url).pathname.split('/main/public/')[1]));
  for(const path of used) if(path.startsWith('forest/') || /cards\/(monster_card_(heruberos|raihin|raimon|rigan|rigin)|rare_card_)/.test(path)) assert(existsSync(new URL(`../public/${path}`,import.meta.url)),path);
  assert.equal([...used].filter(p=>p.startsWith('forest/')).length,12);
});

test('stronger cards improve capture chances for normal and boss encounters', () => {
  for(const boss of [false,true]) {
    assert(captureChance('monster',boss)<captureChance('super',boss));
    assert(captureChance('super',boss)<captureChance('rare',boss));
    assert(captureChance('rare',boss)<1);
  }
});

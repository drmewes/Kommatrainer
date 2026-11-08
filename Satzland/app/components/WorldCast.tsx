'use client';
import { useEffect } from 'react';

// The figures of Satzland inside its exercises. The princess stands with Schreibi beside the task and reacts to the
// answer; Kleckser waits at the end of the progress path. The rascal only reacts to right answers (he loses his loot): a child with LRS is never mocked.
export type World = 'sl';
export type CastMood = 'idle' | 'right' | 'wrong';

const art: Record<World, { host: Record<CastMood, string>; rascal: Record<CastMood, string>; hostName: string }> = {
  sl: {
    host: { idle: '/satzland/princess.webp', right: '/satzland/prinzessin-jubel.webp', wrong: '/satzland/prinzessin-denkt.webp' },
    rascal: { idle: '/satzland/kleckser-freut.webp', right: '/satzland/kleckser-aerger.webp', wrong: '/satzland/kleckser-freut.webp' },
    hostName: 'die Prinzessin',
  },
};
export const hostName = (world: World) => art[world].hostName;

/** Loads every pose once, so a reaction never waits for the network. */
function usePreload(world: World) {
  useEffect(() => { for (const src of [...Object.values(art[world].host), ...Object.values(art[world].rascal)]) { const img = new Image(); img.src = src; } }, [world]);
}

export function CastHost({ world, mood = 'idle' }: { world: World; mood?: CastMood }) {
  usePreload(world);
  const src = art[world].host[mood];
  // The key restarts the little hop whenever the pose changes.
  return <img key={mood} className={'cast-host cast-' + world + ' mood-' + mood} src={src} alt="" aria-hidden="true"/>;
}

export function CastRascal({ world, mood = 'idle' }: { world: World; mood?: CastMood }) {
  const pose = mood === 'right' ? 'right' : 'idle';
  return <img key={pose} className={'cast-rascal cast-' + world + ' mood-' + pose} src={art[world].rascal[pose]} alt="" aria-hidden="true"/>;
}

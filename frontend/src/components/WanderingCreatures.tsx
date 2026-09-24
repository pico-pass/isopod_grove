import { useEffect, useMemo, useState } from 'react';
import type { Species } from '../api/types';
import { SpeciesImage } from './SpeciesImage';

// 화면이 과하게 붐비거나 느려지지 않도록 한 번에 그리는 최대 개체 수
const MAX_VISIBLE = 40;
const MOVE_INTERVAL_MS = 2800;

interface Position {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min);

function nextPosition(prev?: Position): Position {
  if (!prev) {
    return { x: randomBetween(4, 84), y: randomBetween(12, 68) };
  }
  // 쉬는 개체도 있도록 일부는 제자리에 두고, 나머지는 근처로 조금씩 이동시킨다.
  if (Math.random() < 0.25) return prev;
  return {
    x: clamp(prev.x + randomBetween(-18, 18), 4, 84),
    y: clamp(prev.y + randomBetween(-16, 16), 12, 68),
  };
}

export function WanderingCreatures({
  population,
  speciesById,
  paused,
  onObserve,
}: {
  population: Record<string, number>;
  speciesById: Map<string, Species>;
  paused: boolean;
  onObserve: (speciesId: string) => void;
}) {
  // 종별 마릿수만큼 개체를 만든다. 마릿수가 많으면 MAX_VISIBLE까지만 그린다.
  const individuals = useMemo(() => {
    const list: { key: string; speciesId: string }[] = [];
    for (const speciesId of Object.keys(population).sort()) {
      if (!speciesById.has(speciesId)) continue;
      for (let n = 0; n < (population[speciesId] || 0) && list.length < MAX_VISIBLE; n++) {
        list.push({ key: `${speciesId}-${n}`, speciesId });
      }
    }
    return list;
  }, [population, speciesById]);

  const [positions, setPositions] = useState<Record<string, Position>>({});
  const keySignature = individuals.map((i) => i.key).join(',');

  useEffect(() => {
    const keys = keySignature ? keySignature.split(',') : [];
    const step = (moveExisting: boolean) =>
      setPositions((prev) => {
        const next: Record<string, Position> = {};
        for (const key of keys) {
          next[key] = prev[key] && !moveExisting ? prev[key] : nextPosition(prev[key]);
        }
        return next;
      });

    step(false); // 새로 생긴 개체에만 처음 위치를 준다.
    if (paused) return;
    const id = setInterval(() => step(true), MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [keySignature, paused]);

  // 개체가 많을수록 작게 그려서 사육장 안에 여유를 둔다.
  const size = individuals.length <= 10 ? 64 : individuals.length <= 24 ? 52 : 44;

  return (
    <div className="creatures">
      {individuals.map(({ key, speciesId }) => {
        const sp = speciesById.get(speciesId);
        const pos = positions[key];
        if (!sp || !pos) return null;
        return (
          <button
            key={key}
            className="creature"
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: size, height: size }}
            onClick={() => onObserve(speciesId)}
            title={`${sp.name} 관찰하기`}
          >
            <SpeciesImage species={sp} style={{ filter: sp.filter }} draggable={false} />
          </button>
        );
      })}
    </div>
  );
}

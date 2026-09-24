import type { CSSProperties } from 'react';
import type { Species } from '../api/types';

export const FALLBACK_IMAGE = '/assets/isopod.png';

export function SpeciesImage({
  species,
  alt,
  style,
  draggable,
}: {
  species: Pick<Species, 'image' | 'name' | 'filter'>;
  alt?: string;
  style?: CSSProperties;
  draggable?: boolean;
}) {
  return (
    <img
      src={species.image ?? FALLBACK_IMAGE}
      alt={alt ?? species.name}
      style={style}
      draggable={draggable}
      // 이미지 파일이 없거나 로드에 실패하면 기본 이미지로 대체한다.
      onError={(e) => {
        const img = e.currentTarget;
        if (!img.src.endsWith(FALLBACK_IMAGE)) img.src = FALLBACK_IMAGE;
      }}
    />
  );
}

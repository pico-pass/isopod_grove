import type { DecorItem } from '../api/types';
import { normalizeDecorProps } from '../utils/decor';

// 사육장 사진 위에 올라가는 꾸미기 층: 배경의 색 그라데이션과 바닥의 소품들.
// 식구 레이어(.creatures)보다 아래에 그려지고 클릭을 막지 않는다. 내 사육장·남의 사육장·꾸미기 미리보기가 같이 쓴다.
export function TerrariumDecorLayer({
  catalog,
  backdropId,
  propIds,
}: {
  catalog: DecorItem[];
  backdropId?: string | null;
  propIds?: readonly string[] | null;
}) {
  const byId = new Map(catalog.map((d) => [d.decorId, d]));
  const backdrop = backdropId ? byId.get(backdropId) : undefined;
  const props = normalizeDecorProps(propIds, catalog);
  return (
    <>
      {backdrop?.kind === 'backdrop' && backdrop.tint && (
        <div
          className="decor-tint"
          data-decor={backdrop.decorId}
          style={{ background: `linear-gradient(180deg, ${backdrop.tint[0]}, ${backdrop.tint[1]})` }}
        />
      )}
      <div className="decor-props" aria-hidden="true">
        {props.map((id, i) => {
          const item = id ? byId.get(id) : undefined;
          if (!item) return null;
          return (
            <span key={i} className={`decor-prop slot-${i}`} title={item.name}>
              {item.icon}
            </span>
          );
        })}
      </div>
    </>
  );
}

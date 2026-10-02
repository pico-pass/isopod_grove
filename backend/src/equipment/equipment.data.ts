// 장비 카탈로그. 코드가 기준이라 DB에 시딩하지 않고 그대로 읽는다(전투 계산에서 바로 참조하려고).
// 무기=공격력, 방어구=방어력, 장신구=HP를 올린다. 희귀도 0~4는 일반~신화다.
export type EquipmentCategory = 'weapon' | 'armor' | 'charm';

export interface EquipmentCatalogItem {
  equipmentId: string;
  name: string;
  icon: string;
  category: EquipmentCategory;
  rarity: number;
  description: string;
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  // ---- 무기(공격력) ----
  { equipmentId: 'pine_spear', name: '솔잎 창', icon: '🗡️', category: 'weapon', rarity: 0, description: '솔잎을 단단히 엮어 만든 작은 창.' },
  { equipmentId: 'acorn_hammer', name: '도토리 망치', icon: '🔨', category: 'weapon', rarity: 0, description: '커다란 도토리 모자로 만든 묵직한 망치.' },
  { equipmentId: 'thorn_whip', name: '가시 덩굴 채찍', icon: '🌿', category: 'weapon', rarity: 1, description: '가시가 돋은 덩굴을 꼬아 만든 채찍.' },
  { equipmentId: 'twig_blades', name: '나뭇가지 쌍검', icon: '⚔️', category: 'weapon', rarity: 1, description: '곧은 나뭇가지를 깎아 만든 한 쌍의 검.' },
  { equipmentId: 'mushroom_staff', name: '버섯 지팡이', icon: '🍄', category: 'weapon', rarity: 2, description: '포자를 머금은 버섯이 달린 지팡이.' },
  { equipmentId: 'beetle_horn_lance', name: '딱정벌레 뿔 창', icon: '🔱', category: 'weapon', rarity: 2, description: '장수 딱정벌레의 뿔로 벼린 창.' },
  { equipmentId: 'amber_blade', name: '호박 결정 검', icon: '🪓', category: 'weapon', rarity: 3, description: '수액이 굳어 빛나는 호박으로 만든 검.' },
  { equipmentId: 'moss_lightning_axe', name: '번개 이끼 도끼', icon: '⚡', category: 'weapon', rarity: 3, description: '푸른 불꽃이 튀는 이끼를 두른 도끼.' },
  { equipmentId: 'moondew_greatsword', name: '달빛 이슬 대검', icon: '🌙', category: 'weapon', rarity: 4, description: '달빛 아래 맺힌 이슬로 벼린 전설의 대검.' },
  { equipmentId: 'worldtree_root_spear', name: '세계수 뿌리 창', icon: '🌳', category: 'weapon', rarity: 4, description: '세계수의 뿌리 끝을 깎아 만든 창.' },

  // ---- 방어구(방어력) ----
  { equipmentId: 'leaf_armor', name: '낙엽 갑옷', icon: '🍂', category: 'armor', rarity: 0, description: '마른 낙엽을 겹겹이 이어 붙인 갑옷.' },
  { equipmentId: 'bark_shield', name: '나무껍질 방패', icon: '🛡️', category: 'armor', rarity: 0, description: '오래된 나무껍질을 둥글게 다듬은 방패.' },
  { equipmentId: 'moss_armor', name: '이끼 갑옷', icon: '🌱', category: 'armor', rarity: 1, description: '촉촉한 이끼가 두껍게 덮인 갑옷.' },
  { equipmentId: 'pinecone_shield', name: '솔방울 방패', icon: '🌲', category: 'armor', rarity: 1, description: '솔방울 비늘이 겹쳐진 단단한 방패.' },
  { equipmentId: 'mycelium_cloak', name: '균사 망토', icon: '🧥', category: 'armor', rarity: 2, description: '땅속 균사를 엮어 짠 부드러운 망토.' },
  { equipmentId: 'stone_moss_shield', name: '돌이끼 방패', icon: '🪨', category: 'armor', rarity: 2, description: '이끼 낀 돌을 깎아 만든 방패.' },
  { equipmentId: 'amber_plate', name: '호박 갑주', icon: '🟠', category: 'armor', rarity: 3, description: '굳은 수액 속에 햇빛이 갇힌 갑주.' },
  { equipmentId: 'crystal_shell_armor', name: '수정 껍질 갑옷', icon: '🐚', category: 'armor', rarity: 3, description: '맑은 수정처럼 빛나는 껍질로 만든 갑옷.' },
  { equipmentId: 'moonlight_hide', name: '월광 외피', icon: '🌕', category: 'armor', rarity: 4, description: '달빛을 머금어 은은하게 빛나는 외피.' },
  { equipmentId: 'worldtree_bark_armor', name: '세계수 수피 갑옷', icon: '🌳', category: 'armor', rarity: 4, description: '세계수의 수피로 지은 전설의 갑옷.' },

  // ---- 장신구(HP) ----
  { equipmentId: 'clover_charm', name: '클로버 부적', icon: '🍀', category: 'charm', rarity: 0, description: '네잎클로버를 말려 만든 작은 부적.' },
  { equipmentId: 'dewdrop_necklace', name: '이슬 방울 목걸이', icon: '💧', category: 'charm', rarity: 0, description: '아침 이슬을 담은 맑은 목걸이.' },
  { equipmentId: 'dandelion_charm', name: '민들레 씨앗 부적', icon: '🌼', category: 'charm', rarity: 1, description: '바람에 날리는 민들레 씨앗을 엮은 부적.' },
  { equipmentId: 'acorn_pendant', name: '도토리 팬던트', icon: '🌰', category: 'charm', rarity: 1, description: '반질반질한 도토리를 깎아 만든 팬던트.' },
  { equipmentId: 'firefly_lamp', name: '반딧불 램프', icon: '🏮', category: 'charm', rarity: 2, description: '반딧불이 깃든 작은 램프.' },
  { equipmentId: 'spore_sachet', name: '버섯 포자 향낭', icon: '🍄', category: 'charm', rarity: 2, description: '포근한 포자 향이 나는 향낭.' },
  { equipmentId: 'amber_necklace', name: '호박 보석 목걸이', icon: '📿', category: 'charm', rarity: 3, description: '속에 작은 벌레가 잠든 호박 보석 목걸이.' },
  { equipmentId: 'fairy_wing_charm', name: '요정 날개 장식', icon: '🧚', category: 'charm', rarity: 3, description: '숲 요정의 날개 한 조각을 담은 장식.' },
  { equipmentId: 'starlight_orb', name: '별빛 이슬 구슬', icon: '🔮', category: 'charm', rarity: 4, description: '별빛이 스며든 이슬로 빚은 구슬.' },
  { equipmentId: 'worldtree_sprout_charm', name: '세계수 새싹 부적', icon: '🌱', category: 'charm', rarity: 4, description: '세계수에서 막 돋아난 새싹을 담은 부적.' },
];

export const EQUIPMENT_BY_ID = new Map(EQUIPMENT_CATALOG.map((e) => [e.equipmentId, e]));

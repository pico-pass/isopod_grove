// 종의 계열. 전투에서 계열끼리 상성이 있다(불꽃 > 숲 > 서리 > 불꽃). 종 이름의 색·소재에서 정한 표시용 분류이고,
// 능력치는 계열과 무관하게 희귀도·레벨로만 정해진다. 계열은 시드가 기준이라 서버가 시작될 때마다 DB에 다시 쓴다.
export type SpeciesFamily = 'fire' | 'forest' | 'frost';
export const SPECIES_FAMILIES: readonly SpeciesFamily[] = ['fire', 'forest', 'frost'];

export const FAMILY_BY_SPECIES_ID: Record<string, SpeciesFamily> = {
  // 일반
  happynon: 'forest',
  milktea: 'frost',
  murinaWhite: 'frost',
  pakChong: 'forest',
  pallashiorange: 'fire',
  pandaKing: 'forest',
  pinkPandaKing: 'fire',
  redPandaKing: 'fire',
  soil: 'forest',
  yellowzebra: 'fire',
  zebrachocolete: 'forest',
  // 희귀
  muricatum: 'frost',
  'blind satoon': 'frost',
  iceFlower: 'frost',
  mandarinDucky: 'fire',
  sunlize: 'fire',
  tiramisu: 'forest',
  vex: 'forest',
  // 에픽
  ibericum: 'fire',
  milkyEdge: 'frost',
  bumblebee: 'fire',
  bumblpot: 'fire',
  capuchino: 'forest',
  cherryBlossom: 'forest',
  crabby: 'forest',
  durianSpaiky: 'forest',
  ember: 'fire',
  emberbee: 'fire',
  hopemansaegiOrange: 'fire',
  ivorySpaiky: 'frost',
  loverbee: 'forest',
  rubberDucky: 'frost',
  skalet: 'fire',
  tryColor: 'frost',
  werneri: 'forest',
  whiteskurspaiky: 'frost',
  // 전설
  latte: 'fire',
  BlondeDucky: 'fire',
  angrymonkHighqual: 'forest',
  ddalgiratte: 'fire',
  emberfireflyOG: 'fire',
  flamewhiteducky: 'fire',
  jupiter: 'forest',
  lemonblue: 'frost',
  pandaFirefly: 'forest',
  pinklambo: 'fire',
  sapron: 'forest',
  siberianTiger: 'frost',
  wgiteTiger: 'frost',
  whiteDuckyFireFly: 'frost',
  whiteIslandTiger: 'frost',
  // 신화
  albomarginatum: 'forest',
  R5: 'fire',
  ationtgayter: 'forest',
  bonpentom: 'frost',
  glassSkaleton: 'frost',
  mos: 'forest',
  mucuri: 'frost',
  saichanispaiky: 'fire',
  spinosus: 'fire',
};

// 매핑에 없는 종(DB에서 직접 추가한 종)의 기본 계열
export const DEFAULT_FAMILY: SpeciesFamily = 'forest';
export const familyOf = (speciesId: string): SpeciesFamily => FAMILY_BY_SPECIES_ID[speciesId] ?? DEFAULT_FAMILY;

// 종 문서의 계열. DB에 아직 계열이 없거나(시딩 전) 알 수 없는 값이면 매핑에서 찾는다.
export const resolveFamily = (species: { speciesId: string; family?: string }): SpeciesFamily =>
  (SPECIES_FAMILIES as readonly string[]).includes(species.family ?? '')
    ? (species.family as SpeciesFamily)
    : familyOf(species.speciesId);

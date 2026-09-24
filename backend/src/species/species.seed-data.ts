// price: 희귀도별 분양 가격(G). 시드의 종별 price보다 우선하며, 서버 시작 시 모든 종에 적용된다.
export const RARITIES = [
  { name: '일반', color: '#b7ce9a', odds: 65, price: 120 },
  { name: '희귀', color: '#90c9de', odds: 20, price: 300 },
  { name: '에픽', color: '#c5a7e5', odds: 10, price: 2500 },
  { name: '전설', color: '#e6c37e', odds: 3.5, price: 15000 },
  { name: '신화', color: '#aadfc0', odds: 1.5, price: 40000 },
];

export interface SpeciesSeed {
  speciesId: string;
  name: string;
  latin: string;
  rarity: number;
  price: number;
  rate: number;
  breed: number;
  image?: string;
  filter: string;
  description: string;
}

export const SPECIES_SEED: SpeciesSeed[] = [
  {
    speciesId: 'pandaKing',
    name: '쿠바리스 판다킹',
    image: '/assets/kong/pandaking.png',
    latin: 'Cubaris sp. "Panda King"',
    rarity: 0,
    price: 35,
    rate: 0.11,
    breed: 90,
    filter: 'none',
    description:
      '입문자 국밥 콩벌레!',
  },
  {
    speciesId: 'redPandaKing',
    name: '쿠바리스 레드판다킹',
    image: '/assets/kong/redpandaking.png',
    latin: 'Cubaris sp. "Red Panda King"',
    rarity: 0,
    price: 35,
    rate: 0.11,
    breed: 90,
    filter: 'none',
    description:
      '판다킹의 레드 변이',
  },
  {
    speciesId: 'murinaWhite',
    name: '쿠바리스 무리나 화웃',
    image: '/assets/kong/whiteout.png',
    latin: 'Cubaris sp. "Murina White-Out"',
    rarity:0,
    price: 55,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '무리나 화이트 모프',
  },
  {
    speciesId: 'pinkPandaKing',
    name: '쿠바리스 핑크판다킹',
    image: '/assets/kong/pinkpandaking.png',
    latin: 'Cubaris sp. "Pink Panda King"',
    rarity: 0,
    price: 55,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '판다킹의 핑크 변이',
  },
  {
    speciesId: 'pakChong',
    name: '쿠바리스 팍총',
    image: '/assets/kong/packchong.png',
    latin: 'Cubaris sp. "Pak Chong"',
    rarity: 0,
    price: 230,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '팍총 콩벌레!',
  },
  {
    speciesId: 'soil',
    name: '트로글로딜로 소일',
    image: '/assets/kong/soil.png',
    latin: 'Troglodillo sp. "Soil"',
    rarity: 0,
    price: 230,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '트로글로딜로 소일!',
  },
  {
    speciesId: 'rubberDucky',
    name: '쿠바리스 러버 더키',
    image: '/assets/kong/loverducky.png',
    latin: 'Cubaris sp. "Rubber Ducky"',
    rarity: 0,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '노란 오리 얼굴을 떠올리게 하는 인기 많은 친구. 한 번 마주치면 쉽게 잊기 어려운 모습이에요.',
  },
  {
    speciesId: 'milktea',
    name: '쿠바리스 시트러스 밀크티',
    image: '/assets/kong/milktea.png',
    latin: 'Cubaris sp. "Milk Tea"',
    rarity: 0,
    price: 1400,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '레드판다킹의 패턴리스 변이!',
  },
  {
    speciesId: 'yellowzebra',
    name: '옐로우 제브라',
    image: '/assets/kong/yellowzebra.png',
    latin: 'Armadillidium maculatum "Yellow Zebra"',
    rarity: 0,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '옐로우 제브라 콩벌레!',
  },

  {
    speciesId: 'zebrachocolete',
    name: '제브라 초콜릿',
    image: '/assets/kong/zebrachocolete.png',
    latin: 'Armadillidium maculatum "Zebra Chocolete"',
    rarity: 0,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '제브라 초콜릿 모프!',
  },{
    speciesId: 'pallashiorange',
    name: '팔라시 오렌지',
    image: '/assets/kong/pallashiorange.png',
    latin: 'Armadillidium "Pallasii Orange"',
    rarity: 0,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '팔라시 오렌지!',
  },{
    speciesId: 'happynon',
    name: '쿠바리스 해피넌',
    image: '/assets/kong/happynon.png',
    latin: 'Cubaris sp. "Happinun"',
    rarity: 0,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '해삐해삐해삐',
  },




  {
    speciesId: 'vex',
    name: '트로글로딜로 벡스',
    image: '/assets/kong/vex.png',
    latin: 'Troglodillo sp. "Vex"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '트로글로딜로 벡스!',
  },{
    speciesId: 'tiramisu',
    name: '쿠바리스 티라미수',
    image: '/assets/kong/tiramisu.png',
    latin: 'Cubaris sp. "Tiramisu"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '티라미수 콩벌레!',
  },{
    speciesId: 'sunlize',
    name: '트로글로딜로 선라이즈',
    image: '/assets/kong/sunlize.png',
    latin: 'Troglodillo sp. "SunRise"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '선라이즈',
  },{
    speciesId: 'blind satoon',
    name: '쿠바리스 블라인드사툰',
    image: '/assets/kong/satoon.png',
    latin: 'Cubaris sp. "Blind Saturn"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '블라인드사툰',
  },{
    speciesId: 'iceFlower',
    name: '쿠바리스 아이스플라워',
    image: '/assets/kong/iceflower.png',
    latin: 'Cubaris sp. "Ice Flower"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '아이스플라워',
  },{
    speciesId: 'mandarinDucky',
    name: '쿠바리스 만다린더키',
    image: '/assets/kong/mandarinducky.png',
    latin: 'Cubaris sp. "Mandarin Ducky"',
    rarity: 1,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '만다린 더키',
  },




  {
    speciesId: 'whiteskurspaiky',
    name: '라라우레울라 화이트스컬 스파이키',
    image: '/assets/kong/whiteskurspaiky.png',
    latin: 'Laureola sp. "White Skull Spiky"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '화이트스컬 스파이키',
  },{
    speciesId: 'ivorySpaiky',
    name: '라라우레울라 아이보리 스파이키',
    image: '/assets/kong/iborispaiki.png',
    latin: 'Laureola sp. "Ivory Spiky"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '아이보리 스파이키',
  },{
    speciesId: 'durianSpaiky',
    name: '라라우레울라 두리안 스파이키',
    image: '/assets/kong/goldspaiky.png',
    latin: 'Laureola sp. "Durian Spiky"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '두리안 스파이키',
  },{
    speciesId: 'werneri',
    name: '포셀리오 워너리',
    image: '/assets/kong/wanari.png',
    latin: 'Porcellio "Werneri"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '워너리',
  },{
    speciesId: 'tryColor',
    name: '아르덴티엘라 트라이컬러',
    image: '/assets/kong/trycolor.png',
    latin: 'Ardentiella sp. "tri Color"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '아르덴 트라이컬러',
  },{
    speciesId: 'skalet',
    name: '아르덴티엘라 스칼렛',
    image: '/assets/kong/skalet.png',
    latin: 'Ardentiella sp. "Scarlet"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '아르덴 스칼렛',
  },{
    speciesId: 'emberbee',
    name: '아르덴티엘라 엠버비',
    image: '/assets/kong/emberbee.png',
    latin: 'Ardentiella sp. "Amber Bee"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '아르덴 엠버비',
  },{
    speciesId: 'ember',
    name: '쿠바리스 앰버더키',
    image: '/assets/kong/ember.png',
    latin: 'Cubaris sp. "Amber Ducky"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '엠버더키',
  },{
    speciesId: 'crabby',
    name: '쿠바리스 응우옌(a.k.a.크래비)',
    image: '/assets/kong/enguyaen.png',
    latin: 'Cubaris sp. "Nguyen"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '응우옌',
  },{
    speciesId: 'bumblebee',
    name: '쿠바리스 범블비',
    image: '/assets/kong/bumblebee.png',
    latin: 'Cubaris sp. "Bumble Bee"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '범블비',
  },{
    speciesId: 'bumblpot',
    name: '필리피노딜로 범블팟',
    image: '/assets/kong/bumblepot.png',
    latin: 'Filipinodillo sp. "Bumble Pot"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '범블팟',
  },{
    speciesId: 'cherryBlossom',
    name: '쿠바리스 체리블라썸',
    image: '/assets/kong/charryblasom.png',
    latin: 'Cubaris sp. "Cherry Blossom"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '체블',
  },{
    speciesId: 'hopemansaegiOrange',
    name: '호프만세기 오렌지',
    image: '/assets/kong/hopemansaegiorange.png',
    latin: 'Porcellio Hoffmannseggi "Orange"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '호프만세기오렌지',
  },{
    speciesId: 'loverbee',
    name: '쿠바리스 러버비',
    image: '/assets/kong/loverbee.png',
    latin: 'Cubaris sp. "Rubber Bee"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '러버비',
  },{
    speciesId: 'capuchino',
    name: '쿠바리스 카푸치노',
    image: '/assets/kong/kapuchino.png',
    latin: 'Cubaris sp. "Cappuccino"',
    rarity: 2,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '카푸치노',
  },



  {
    speciesId: 'loverducky',
    name: '쿠바리스 러버더키',
    image: '/assets/kong/loverducky.png',
    latin: 'Cubaris sp. "Rubber Ducky"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '러버더키',
  },{
    speciesId: 'wgiteTiger',
    name: '쿠바리스 화이트타이거',
    image: '/assets/kong/whitetiger.png',
    latin: 'Cubaris sp. "White Tiger"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '화타',
  },{
    speciesId: 'whiteIslandTiger',
    name: '쿠바리스 화이트아일랜드타이거',
    image: '/assets/kong/whiteislandtiger.png',
    latin: 'Cubaris sp. "White Island Tiger"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '화알타',
  },{
    speciesId: 'whiteDuckyFireFly',
    name: '쿠바리스 화이트더키 파이어플라이이',
    image: '/assets/kong/whiteduckyfirefly.png',
    latin: 'Cubaris sp. "White Ducky Firefly"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '화덕파플',
  },{
    speciesId: 'siberianTiger',
    name: '쿠바리스 시베리안타이거',
    image: '/assets/kong/shibaeriantiger.png',
    latin: 'Cubaris sp. "Siberian Tiger"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '시타',
  },{
    speciesId: 'sapron',
    name: '쿠바리스 사프론',
    image: '/assets/kong/sapron.png',
    latin: 'Cubaris sp. "Saffron Serpent"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '사프론',
  },{
    speciesId: 'pinklambo',
    name: '아르덴티엘라 핑크람보',
    image: '/assets/kong/pinklambo.png',
    latin: 'Ardentiella sp. "Pink Lambo"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '핑람',
  },{
    speciesId: 'pandaFirefly',
    name: '쿠바리스 판다파이어플라이이',
    image: '/assets/kong/pandafirefly.png',
    latin: 'Cubaris sp. "Panda Firefly"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '판파플',
  },{
    speciesId: 'BlondeDucky',
    name: '쿠바리스 블론드더키',
    image: '/assets/kong/blondducky.png',
    latin: 'Cubaris sp. "Blonde Ducky"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '블덕',
  },{
    speciesId: 'ddalgiratte',
    name: '쿠바리스 딸기라떼',
    image: '/assets/kong/ddalgiratte.png',
    latin: 'Cubaris sp. "Cappuccino Pink"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '$',
  },{
    speciesId: 'emberfireflyOG',
    name: '쿠바리스 엠버파이어플라이 OG',
    image: '/assets/kong/emberfirefly.png',
    latin: 'Cubaris sp. "Amber Firefly OG"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '엠파플 오지',
  },{
    speciesId: 'lemonblue',
    name: '쿠바리스 레몬블루',
    image: '/assets/kong/lemonblue.png',
    latin: 'Cubaris sp. "Lemon Blue"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '레블',
  },{
    speciesId: 'jupiter',
    name: '쿠바리스 쥬피터',
    image: '/assets/kong/jupiter.png',
    latin: 'Cubaris sp. "Jupiter"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '쥬피터',
  },{
    speciesId: 'angrymonkHighqual',
    name: '쿠바리스 앵그리몽크 하이퀄',
    image: '/assets/kong/highcalityangrymonk.png',
    latin: 'Cubaris sp. "Angry Monk High Cality"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '앵몽 하이퀄',
  },{
    speciesId: 'flamewhiteducky',
    name: '쿠바리스 플레임화이트더키',
    image: '/assets/kong/flamewhiteducky.png',
    latin: 'Cubaris sp. "Flame White Ducky"',
    rarity: 3,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '플화덕',
  },





  {
    speciesId: 'ationtgayter',
    name: '아이소포다 에이션트게이터',
    image: '/assets/kong/ationtgayter.png',
    latin: 'Isopoda sp. "Ancient Gator"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '에게',
  },{
    speciesId: 'bonpentom',
    name: '쿠바리스 본팬텀',
    image: '/assets/kong/bonpantom.png',
    latin: 'Cubaris sp. "Bone Phantom"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '뻑킹 말레이종',
  },{
    speciesId: 'glassSkaleton',
    name: '글래스스켈레톤',
    image: '/assets/kong/glassskeleton.png',
    latin: 'Troglodillo sp. "Glass Skaleton"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '글래스스켈레톤',
  },{
    speciesId: 'mos',
    name: '모스',
    image: '/assets/kong/mos.png',
    latin: 'Troglodillo sp. "Moth"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '모스',
  },{
    speciesId: 'mucuri',
    name: '쿠바리스 머큐리',
    image: '/assets/kong/mucuri.png',
    latin: 'Cubaris sp. "Moth"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '머큐리',
  },{
    speciesId: 'R5',
    name: '필리피노딜로 R5자이언트',
    image: '/assets/kong/R5.png',
    latin: 'Fillipinodillo sp. "R5 Giant"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      'R5자이언트',
  },{
    speciesId: 'spinosus',
    name: '스피노수스',
    image: '/assets/kong/spinosus.png',
    latin: 'Pseudarmadillo spinosus',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '스삐노',
  },{
    speciesId: 'saichanispaiky',
    name: '샤이차니 스파이키',
    image: '/assets/kong/saichanispaiky.png',
    latin: 'Isopoda sp. "Saichani Spiky"',
    rarity: 4,
    price: 35,
    rate: 0.15,
    breed: 70,
    filter: 'none',
    description:
      '샤이차니스파이키',
  },
];

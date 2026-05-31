/* ─────────────────────────────────────────────────────────────────────────
   Demo listings used when the live marketplace returns no items, so the
   marketplace and detail pages still have something to render in a fresh
   environment. IDs are prefixed `mock-` so the UI can opt out of write
   actions (cart, wishlist) when an item isn't real.
   ───────────────────────────────────────────────────────────────────────── */

export interface MockItem {
  id: string;
  name: string;
  market_name: string;
  type: string;
  rarity: string;
  condition: string;
  price: number;
  image: string;
  float: string;
  priceChange: number;
  seller: { steamId: string; name: string };
  special?: 'stattrak' | 'souvenir';
}

export const MOCK_MARKET_ITEMS: MockItem[] = [
  {
    id: 'mock-1',
    name: 'AWP | Dragon Lore',
    market_name: 'AWP | Dragon Lore (Field-Tested)',
    type: 'Sniper Rifle',
    rarity: 'Covert',
    condition: 'Field-Tested',
    price: 142500,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.21',
    priceChange: 12.4,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-2',
    name: 'AK-47 | Fire Serpent',
    market_name: 'AK-47 | Fire Serpent (Minimal Wear)',
    type: 'Rifle',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 38900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.09',
    priceChange: -3.2,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-3',
    name: 'Karambit | Doppler',
    market_name: '★ Karambit | Doppler (Factory New)',
    type: 'Knife',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 89400,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou7TyJgRf0vL3dDpV4M-im5SOhfL4MITdn2xZ_Pp9j-vT8Y2migzj_kdrYW-iJoaUcVdoNgnY-Vi-w-vphMToupzKwHB9-n51KmGdwUKnP-uOLdM/360fx360f',
    float: '0.007',
    priceChange: 5.1,
    seller: { steamId: 'mock-seller-3', name: 'TyphonGG' },
    special: 'stattrak',
  },
  {
    id: 'mock-4',
    name: 'M4A4 | Howl',
    market_name: 'M4A4 | Howl (Factory New)',
    type: 'Rifle',
    rarity: 'Contraband',
    condition: 'Factory New',
    price: 215000,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.04',
    priceChange: 18.7,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-5',
    name: 'Glock-18 | Fade',
    market_name: 'Glock-18 | Fade (Factory New)',
    type: 'Pistol',
    rarity: 'Restricted',
    condition: 'Factory New',
    price: 4290,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.012',
    priceChange: 2.3,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-6',
    name: 'USP-S | Kill Confirmed',
    market_name: 'USP-S | Kill Confirmed (Minimal Wear)',
    type: 'Pistol',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 2150,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.09',
    priceChange: -1.1,
    seller: { steamId: 'mock-seller-4', name: 'A_Long' },
  },
  {
    id: 'mock-7',
    name: 'M4A1-S | Hyper Beast',
    market_name: 'M4A1-S | Hyper Beast (Factory New)',
    type: 'Rifle',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 1890,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpouj63LQRm-PrgZThR5cmim5GRqOH6IbnUmlRd6cF4n-T--Y3nj1H6_xY-Z2H7coSWcw9rNQ7Vrla6lO_n08K8tJjImXY1u3VxsHbcyhDl1B5SLrs4lvCKWdb0kg/360fx360f',
    float: '0.05',
    priceChange: 0.4,
    seller: { steamId: 'mock-seller-5', name: 'Hooch' },
  },
  {
    id: 'mock-8',
    name: 'Desert Eagle | Blaze',
    market_name: 'Desert Eagle | Blaze (Factory New)',
    type: 'Pistol',
    rarity: 'Restricted',
    condition: 'Factory New',
    price: 5780,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.008',
    priceChange: 7.9,
    seller: { steamId: 'mock-seller-3', name: 'TyphonGG' },
  },
  {
    id: 'mock-9',
    name: 'Butterfly Knife | Doppler',
    market_name: '★ Butterfly Knife | Doppler (Factory New)',
    type: 'Knife',
    rarity: 'Covert',
    condition: 'Factory New',
    price: 78900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpou7TyJgRf0vL3dDpV4M-im5SOhfL4MITdn2xZ_Pp9j-vT8Y2migzj_kdrYW-iJoaUcVdoNgnY-Vi-w-vphMToupzKwHB9-n51KmGdwUKnP-uOLdM/360fx360f',
    float: '0.006',
    priceChange: 9.2,
    seller: { steamId: 'mock-seller-1', name: 'BluePhase' },
  },
  {
    id: 'mock-10',
    name: 'P250 | Asiimov',
    market_name: 'P250 | Asiimov (Field-Tested)',
    type: 'Pistol',
    rarity: 'Classified',
    condition: 'Field-Tested',
    price: 920,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposr-kLQpf7v_3IzhX09GwhpKAk-zLP7LWnn8fucMo2u3D8diniwa1qBdoa2H1cYWQc1U7N1HXq1S4xLrshpa9v8nIyXYxv3F2sCqIyhKxnxxIcKUx0sk7zfQI/360fx360f',
    float: '0.21',
    priceChange: -2.5,
    seller: { steamId: 'mock-seller-2', name: 'CT_Camper' },
  },
  {
    id: 'mock-11',
    name: 'AWP | Asiimov',
    market_name: 'AWP | Asiimov (Field-Tested)',
    type: 'Sniper Rifle',
    rarity: 'Covert',
    condition: 'Field-Tested',
    price: 2840,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.18',
    priceChange: 4.6,
    seller: { steamId: 'mock-seller-5', name: 'Hooch' },
  },
  {
    id: 'mock-12',
    name: 'Sport Gloves | Pandora’s Box',
    market_name: '★ Sport Gloves | Pandora’s Box (Minimal Wear)',
    type: 'Gloves',
    rarity: 'Covert',
    condition: 'Minimal Wear',
    price: 64900,
    image:
      'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV09-1mZWMmuPLJ7XEhGRu7Mwn3evP9NWg2QPj_Bc4N2yhI4eVcQE2YlmC_FntyL_n0Z6_v52cnSdgsiAh4mGdwULdz5l_GhA/360fx360f',
    float: '0.10',
    priceChange: 11.2,
    seller: { steamId: 'mock-seller-4', name: 'A_Long' },
  },
];

export const findMockItem = (id: string | undefined): MockItem | undefined => {
  if (!id) return undefined;
  return MOCK_MARKET_ITEMS.find((m) => m.id === id);
};

// CS2 weapon categories with all available weapons
export interface WeaponCategory {
  name: string;
  icon?: string;
  weapons: string[];
  description: string;
}

export const weaponCategories: { [key: string]: WeaponCategory } = {
  'Pistols': {
    name: 'Pistols',
    icon: '🔫',
    description: 'Secondary weapons and eco round essentials',
    weapons: [
      'Glock-18',
      'USP-S',
      'P2000',
      'P250',
      'Dual Berettas',
      'Five-SeveN',
      'Tec-9',
      'CZ75-Auto',
      'Desert Eagle',
      'R8 Revolver'
    ]
  },
  'Rifles': {
    name: 'Rifles',
    icon: '🎯',
    description: 'Primary weapons for all situations',
    weapons: [
      'AK-47',
      'M4A4',
      'M4A1-S',
      'Galil AR',
      'FAMAS',
      'AUG',
      'SG 553',
      'SSG 08',
      'AWP',
      'G3SG1',
      'SCAR-20'
    ]
  },
  'SMGs': {
    name: 'SMGs',
    icon: '⚡',
    description: 'High mobility and close-range combat',
    weapons: [
      'MAC-10',
      'MP5-SD',
      'MP7',
      'MP9',
      'UMP-45',
      'P90',
      'PP-Bizon'
    ]
  },
  'Heavy': {
    name: 'Heavy',
    icon: '💥',
    description: 'Maximum firepower and defensive strength',
    weapons: [
      'Nova',
      'MAG-7',
      'Sawed-Off',
      'XM1014',
      'M249',
      'Negev'
    ]
  },
  'Knives': {
    name: 'Knives',
    icon: '🔪',
    description: 'Prestige items and ultimate status symbols',
    weapons: [
      'Bayonet',
      'M9 Bayonet', 
      'Karambit',
      'Butterfly Knife',
      'Huntsman Knife',
      'Falchion Knife',
      'Gut Knife',
      'Shadow Daggers',
      'Bowie Knife',
      'Flip Knife',
      'Stiletto Knife',
      'Ursus Knife',
      'Navaja Knife',
      'Talon Knife',
      'Skeleton Knife',
      'Survival Knife',
      'Nomad Knife',
      'Paracord Knife',
      'Classic Knife'
    ]
  },
  'Gloves': {
    name: 'Gloves',
    icon: '🧤',
    description: 'Premium hand protection and style statements',
    weapons: [
      'Bloodhound Gloves',
      'Sport Gloves',
      'Specialist Gloves',
      'Moto Gloves',
      'Hand Wraps',
      'Driver Gloves',
      'Hydra Gloves',
      'Broken Fang Gloves'
    ]
  },
  'Containers': {
    name: 'Containers',
    icon: '📦',
    description: 'Cases, packages, and boxes containing CS2 items',
    weapons: [
      'Weapon Cases',
      'Souvenir Packages',
      'Sticker Capsules',
      'Graffiti Boxes',
      'Music Kit Boxes',
      'StatTrak Music Kit Boxes'
    ]
  },
  'Other': {
    name: 'Other',
    icon: '⚙️',
    description: 'Utility and special equipment',
    weapons: [
      'Zeus x27'
    ]
  }
};

export const getAllWeapons = (): string[] => {
  const allWeapons = new Set<string>();
  Object.values(weaponCategories).forEach(category => {
    category.weapons.forEach(weapon => allWeapons.add(weapon));
  });
  return Array.from(allWeapons).sort();
};
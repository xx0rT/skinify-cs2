import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Flipper, Flipped } from 'react-flip-toolkit';
import { ArrowLeft, TrendingUp, TrendingDown, Search, Filter, Grid2x2 as Grid, List, Star, BarChart3, Eye, ShoppingCart, Heart, Package, Home, User, Settings, CreditCard, Wallet, Gift, Crown, TrendingUp as TrendingUpIcon, ChevronDown, Users, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useToastStore } from '../store/toastStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useAuthStore } from '../store/authStore';
import { useMarketplaceItems } from '../hooks/useMarketplaceItems';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SteamLogin from '../components/auth/SteamLogin';
import UserProfile from '../components/auth/UserProfile';
import SearchModal from '../components/SearchModal';

interface WeaponItem {
  id: string;
  name: string;
  collection: string;
  cashPrice: string;
  tradePrice: string;
  change24h: string;
  change7d: string;
  change30d: string;
  amount: number;
  image: string;
  float?: string;
  condition: string;
  rarity: string;
  price: number;
}

interface WeaponCategory {
  name: string;
  image: string;
  count: string;
  category: string;
}

const WeaponCategoryPage: React.FC = () => {
  const { category, weapon } = useParams<{ category: string; weapon?: string }>();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('price');
  const [selectedLanguage, setSelectedLanguage] = useState('EN');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [activeSection, setActiveSection] = useState('Market');
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [sidebarY, setSidebarY] = useState(0);
  const [sidebarOpacity, setSidebarOpacity] = useState(1);
  const { addItem } = useCartStore();
  const { toggleItem, isInWishlist } = useWishlistStore();
  const { addToast } = useToastStore();
  const { getItemCount } = useCartStore();
  const cartCount = getItemCount();
  const { formatPrice } = useCurrencyStore();
  const { user } = useAuthStore();

  // Market statistics state
  const [marketStats, setMarketStats] = useState({
    floorValue: 0,
    marketCap: 0,
    change7d: 0,
    change30d: 0,
    change90d: 0,
    changeYesterday: 0
  });
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [isLoadingMarketData, setIsLoadingMarketData] = useState(true);

  // Helper function to get weapon image from public folder
  const getWeaponImage = (weaponName: string): string => {
    // Handle knives
    if (weaponName.includes('Knife') || weaponName.includes('Daggers')) {
      return `/${weaponName.replace(' ', '_')}.webp`;
    }
    
    // Handle gloves
    if (weaponName.includes('Gloves') || weaponName.includes('Hand Wraps')) {
      return `/${weaponName.replace(' ', '_')}.webp`;
    }

    // Handle regular weapons
    return `/${weaponName.replace(/[\s-]/g, '_')}.webp`;
  };

  // Helper function to get proper category display name
  const getCategoryDisplayName = (cat: string): string => {
    const categoryMap: { [key: string]: string } = {
      'pistols': 'Pistols',
      'rifles': 'Rifles',
      'smgs': 'SMGs',
      'heavy': 'Heavy',
      'knives': 'Knives',
      'melee': 'Knives',
      'gloves': 'Gloves',
      'containers': 'Containers',
      'other': 'Other'
    };
    return categoryMap[cat?.toLowerCase()] || 'Weapons';
  };

  // Helper function to get category weapon selector text
  const getWeaponSelectorText = (cat: string): string => {
    const categoryMap: { [key: string]: string } = {
      'pistols': 'Choose Your Pistol',
      'rifles': 'Choose Your Rifle', 
      'smgs': 'Choose Your SMG',
      'heavy': 'Choose Your Heavy Weapon',
      'knives': 'Choose Your Knife',
      'melee': 'Choose Your Knife',
      'gloves': 'Choose Your Gloves',
      'containers': 'Choose Your Container',
      'other': 'Choose Your Item'
    };
    return categoryMap[cat?.toLowerCase()] || 'Choose Your Weapon';
  };

  // Helper function to get category description
  const getCategoryDescription = (cat: string, isWeaponSpecific: boolean, weaponName?: string): string => {
    if (isWeaponSpecific) {
      return `Explore all ${weaponName} skins in CS2, with more than 45+ skin options. Filter the skins by color, view current and historical prices, and make informative decisions to find the skin for your loadout.`;
    }

    const descriptions: { [key: string]: string } = {
      'pistols': 'Explore and purchase a wide range of CS2 pistol skins. Pistols are essential secondary weapons in the game, perfect for close-quarters combat and eco rounds. The Glock-18, USP-S, and Desert Eagle are particularly favored choices when it comes to pistols.',
      'rifles': 'Explore and purchase a wide range of CS2 rifle skins. Rifles are essential primary weapons in the game, alongside AKs, and they are extensive usage among players. The AK-47, M4A4, and M4A1-S are particularly favored choices when it comes to rifles.',
      'smgs': 'Explore and purchase a wide range of CS2 SMG skins. SMGs are perfect for aggressive playstyles and force-buy rounds, offering high mobility and decent damage. The P90, MP7, and UMP-45 are popular choices for their versatility.',
      'heavy': 'Explore and purchase a wide range of CS2 heavy weapon skins. Heavy weapons pack serious firepower for close-range encounters and defensive positions. The Nova, XM1014, and M249 are go-to choices for maximum impact.',
      'knives': 'Explore and purchase a wide range of CS2 knife skins. Knives are the ultimate status symbol in CS2, representing prestige and style. The Karambit, Butterfly Knife, and M9 Bayonet are highly coveted choices among collectors.',
      'melee': 'Explore and purchase a wide range of CS2 knife skins. Knives are the ultimate status symbol in CS2, representing prestige and style. The Karambit, Butterfly Knife, and M9 Bayonet are highly coveted choices among collectors.',
      'gloves': 'Explore and purchase a wide range of CS2 glove skins. Gloves are premium hand protection and style statements for the elite CS2 player. The Bloodhound Gloves, Sport Gloves, and Specialist Gloves are highly sought after choices.',
      'containers': 'Explore and purchase a wide range of CS2 containers and cases. Containers hold exciting possibilities for obtaining rare skins, stickers, and collectibles. Weapon Cases, Souvenir Packages, and Sticker Capsules are popular choices for opening.',
      'containers': 'Explore and purchase a wide range of CS2 containers and cases. Containers hold mystery items and are essential for collectors and traders. Weapon Cases, Souvenir Packages, and Sticker Capsules are popular choices for opening valuable items.',
      'other': 'Explore and purchase CS2 equipment and utility items. These special items add unique functionality to your loadout and showcase your tactical preferences.'
    };
    
    return descriptions[cat?.toLowerCase()] || 'Explore and purchase a wide range of CS2 weapon skins for your loadout.';
  };

  // Dynamic weapon categories data based on current category
  const getWeaponCategories = (cat: string): WeaponCategory[] => {
    const baseImage = 'https://i.postimg.cc/VNg3V0yH/csgo-categories-weapons-ak-47-134x95.webp';
    
    const categoryWeapons: { [key: string]: WeaponCategory[] } = {
      'pistols': [
        { name: 'Glock-18', image: getWeaponImage('Glock-18'), count: '32 Skins', category: 'pistol' },
        { name: 'USP-S', image: getWeaponImage('USP-S'), count: '28 Skins', category: 'pistol' },
        { name: 'P2000', image: getWeaponImage('P2000'), count: '24 Skins', category: 'pistol' },
        { name: 'P250', image: getWeaponImage('P250'), count: '42 Skins', category: 'pistol' },
        { name: 'Dual Berettas', image: getWeaponImage('Dual_Berettas'), count: '18 Skins', category: 'pistol' },
        { name: 'Five-SeveN', image: getWeaponImage('Five-SeveN'), count: '35 Skins', category: 'pistol' },
        { name: 'Tec-9', image: getWeaponImage('Tec-9'), count: '29 Skins', category: 'pistol' },
        { name: 'CZ75-Auto', image: getWeaponImage('CZ75-Auto'), count: '22 Skins', category: 'pistol' },
        { name: 'Desert Eagle', image: getWeaponImage('Desert_Eagle'), count: '48 Skins', category: 'pistol' },
        { name: 'R8 Revolver', image: getWeaponImage('R8_Revolver'), count: '15 Skins', category: 'pistol' }
      ],
      'rifles': [
        { name: 'AK-47', image: getWeaponImage('AK-47'), count: '45 Skins', category: 'assault-rifle' },
        { name: 'M4A4', image: getWeaponImage('M4A4'), count: '51 Skins', category: 'assault-rifle' },
        { name: 'M4A1-S', image: getWeaponImage('M4A1-S'), count: '43 Skins', category: 'assault-rifle' },
        { name: 'Galil AR', image: getWeaponImage('Galil_AR'), count: '37 Skins', category: 'assault-rifle' },
        { name: 'FAMAS', image: getWeaponImage('FAMAS'), count: '19 Skins', category: 'assault-rifle' },
        { name: 'AUG', image: getWeaponImage('AUG'), count: '26 Skins', category: 'assault-rifle' },
        { name: 'SG 553', image: getWeaponImage('SG_553'), count: '37 Skins', category: 'assault-rifle' },
        { name: 'SSG 08', image: getWeaponImage('SSG_08'), count: '40 Skins', category: 'sniper-rifle' },
        { name: 'AWP', image: getWeaponImage('AWP'), count: '52 Skins', category: 'sniper-rifle' },
        { name: 'G3SG1', image: getWeaponImage('G3SG1'), count: '28 Skins', category: 'sniper-rifle' },
        { name: 'SCAR-20', image: getWeaponImage('SCAR-20'), count: '28 Skins', category: 'sniper-rifle' }
      ],
      'smgs': [
        { name: 'MAC-10', image: getWeaponImage('MAC-10'), count: '34 Skins', category: 'smg' },
        { name: 'MP5-SD', image: getWeaponImage('MP5-SD'), count: '18 Skins', category: 'smg' },
        { name: 'MP7', image: getWeaponImage('MP7'), count: '31 Skins', category: 'smg' },
        { name: 'MP9', image: getWeaponImage('MP9'), count: '29 Skins', category: 'smg' },
        { name: 'UMP-45', image: getWeaponImage('UMP-45'), count: '25 Skins', category: 'smg' },
        { name: 'P90', image: getWeaponImage('P90'), count: '38 Skins', category: 'smg' },
        { name: 'PP-Bizon', image: getWeaponImage('PP-Bizon'), count: '27 Skins', category: 'smg' }
      ],
      'heavy': [
        { name: 'Nova', image: getWeaponImage('Nova'), count: '35 Skins', category: 'shotgun' },
        { name: 'MAG-7', image: getWeaponImage('MAG-7'), count: '22 Skins', category: 'shotgun' },
        { name: 'Sawed-Off', image: getWeaponImage('Sawed-Off'), count: '28 Skins', category: 'shotgun' },
        { name: 'XM1014', image: getWeaponImage('XM1014'), count: '31 Skins', category: 'shotgun' },
        { name: 'M249', image: getWeaponImage('M249'), count: '19 Skins', category: 'machine-gun' },
        { name: 'Negev', image: getWeaponImage('Negev'), count: '16 Skins', category: 'machine-gun' }
      ],
      'gloves': [
        { name: 'Bloodhound Gloves', image: getWeaponImage('Bloodhound_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Sport Gloves', image: getWeaponImage('Sport_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Specialist Gloves', image: getWeaponImage('Specialist_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Moto Gloves', image: getWeaponImage('Moto_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Hand Wraps', image: getWeaponImage('Hand_Wraps'), count: '15 Finishes', category: 'gloves' },
        { name: 'Driver Gloves', image: getWeaponImage('Driver_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Hydra Gloves', image: getWeaponImage('Hydra_Gloves'), count: '15 Finishes', category: 'gloves' },
        { name: 'Broken Fang Gloves', image: getWeaponImage('Broken_Fang_Gloves'), count: '15 Finishes', category: 'gloves' }
      ],
      'knives': [
        { name: 'Bayonet', image: getWeaponImage('Bayonet'), count: '15 Finishes', category: 'knife' },
        { name: 'Karambit', image: getWeaponImage('Karambit'), count: '15 Finishes', category: 'knife' },
        { name: 'Flip Knife', image: getWeaponImage('Flip_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Gut Knife', image: getWeaponImage('Gut_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Huntsman Knife', image: getWeaponImage('Huntsman_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Bowie Knife', image: getWeaponImage('Bowie_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Falchion Knife', image: getWeaponImage('Falchion_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Shadow Daggers', image: getWeaponImage('Shadow_Daggers'), count: '15 Finishes', category: 'knife' },
        { name: 'Butterfly Knife', image: getWeaponImage('Butterfly_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'M9 Bayonet', image: getWeaponImage('M9_Bayonet'), count: '15 Finishes', category: 'knife' },
        { name: 'Navaja Knife', image: getWeaponImage('Navaja_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Stiletto Knife', image: getWeaponImage('Stiletto_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Ursus Knife', image: getWeaponImage('Ursus_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Talon Knife', image: getWeaponImage('Talon_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Skeleton Knife', image: getWeaponImage('Skeleton_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Survival Knife', image: getWeaponImage('Survival_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Paracord Knife', image: getWeaponImage('Paracord_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Nomad Knife', image: getWeaponImage('Nomad_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Classic Knife', image: getWeaponImage('Classic_Knife'), count: '15 Finishes', category: 'knife' }
      ],
      'melee': [
        { name: 'Bayonet', image: getWeaponImage('Bayonet'), count: '15 Finishes', category: 'knife' },
        { name: 'Karambit', image: getWeaponImage('Karambit'), count: '15 Finishes', category: 'knife' },
        { name: 'Flip Knife', image: getWeaponImage('Flip_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Gut Knife', image: getWeaponImage('Gut_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Huntsman Knife', image: getWeaponImage('Huntsman_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Bowie Knife', image: getWeaponImage('Bowie_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Falchion Knife', image: getWeaponImage('Falchion_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Shadow Daggers', image: getWeaponImage('Shadow_Daggers'), count: '15 Finishes', category: 'knife' },
        { name: 'Butterfly Knife', image: getWeaponImage('Butterfly_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'M9 Bayonet', image: getWeaponImage('M9_Bayonet'), count: '15 Finishes', category: 'knife' },
        { name: 'Navaja Knife', image: getWeaponImage('Navaja_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Stiletto Knife', image: getWeaponImage('Stiletto_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Ursus Knife', image: getWeaponImage('Ursus_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Talon Knife', image: getWeaponImage('Talon_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Skeleton Knife', image: getWeaponImage('Skeleton_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Survival Knife', image: getWeaponImage('Survival_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Paracord Knife', image: getWeaponImage('Paracord_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Nomad Knife', image: getWeaponImage('Nomad_Knife'), count: '15 Finishes', category: 'knife' },
        { name: 'Classic Knife', image: getWeaponImage('Classic_Knife'), count: '15 Finishes', category: 'knife' }
      ],
      'containers': [
        { name: 'Weapon Cases', image: baseImage, count: '25+ Cases', category: 'container' },
        { name: 'Souvenir Packages', image: baseImage, count: '15+ Packages', category: 'container' },
        { name: 'Sticker Capsules', image: baseImage, count: '30+ Capsules', category: 'container' },
        { name: 'Graffiti Boxes', image: baseImage, count: '10+ Boxes', category: 'container' },
        { name: 'Music Kit Boxes', image: baseImage, count: '5+ Boxes', category: 'container' },
        { name: 'StatTrak Music Kit Boxes', image: baseImage, count: '5+ Boxes', category: 'container' }
      ],
      'other': [
        { name: 'Sticker', image: baseImage, count: '500+ Items', category: 'sticker' },
        { name: 'Collectible', image: baseImage, count: '100+ Items', category: 'collectible' },
        { name: 'Container', image: baseImage, count: '50+ Items', category: 'container' },
        { name: 'Gift', image: baseImage, count: '20+ Items', category: 'gift' },
        { name: 'Graffiti', image: baseImage, count: '150+ Items', category: 'graffiti' },
        { name: 'Key', image: baseImage, count: '30+ Items', category: 'key' },
        { name: 'Music Kit', image: baseImage, count: '40+ Items', category: 'musickit' },
        { name: 'Pass', image: baseImage, count: '15+ Items', category: 'pass' },
        { name: 'Tag', image: baseImage, count: '10+ Items', category: 'tag' },
        { name: 'Tool', image: baseImage, count: '25+ Items', category: 'tool' },
        { name: 'Charm', image: baseImage, count: '35+ Items', category: 'charm' },
        { name: 'Agent', image: baseImage, count: '20+ Items', category: 'agent' },
        { name: 'Patch', image: baseImage, count: '75+ Items', category: 'patch' },
        { name: 'Souvenir Package', image: baseImage, count: '40+ Items', category: 'souvenir' },
        { name: 'Autograph Capsule', image: baseImage, count: '25+ Items', category: 'autograph' },
        { name: 'Sticker Capsule', image: baseImage, count: '60+ Items', category: 'sticker-capsule' },
        { name: 'Patch Pack', image: baseImage, count: '20+ Items', category: 'patch-pack' },
        { name: 'Graffiti Box', image: baseImage, count: '30+ Items', category: 'graffiti-box' }
      ],
      'containers': [
        { name: 'Weapon Cases', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmw', count: '25+ Cases', category: 'container' },
        { name: 'Souvenir Packages', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmg', count: '15+ Packages', category: 'container' },
        { name: 'Sticker Capsules', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmg', count: '20+ Capsules', category: 'container' },
        { name: 'Graffiti Boxes', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmg', count: '10+ Boxes', category: 'container' },
        { name: 'Music Kit Boxes', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmg', count: '8+ Boxes', category: 'container' },
        { name: 'StatTrak Music Kit Boxes', image: 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgposbaqKAxf1qD3dzxP7c-JmIGZkPbmDL7QkmpQ6cJz2e2X9NmjjVHj-ERkMWj2dtWRJgdvaAaEqFPsl-m-1J-86crJymwj5HeIvqCJmg', count: '5+ Boxes', category: 'container' }
      ]
    };
    
    return categoryWeapons[cat] || [];
  };

  const sidebarSections = [
    {
      name: 'Navigation',
      items: [
        { icon: Home, label: 'Home', active: false, onClick: () => navigate('/') },
        { icon: User, label: 'Profile', active: false, onClick: () => navigate('/profile') }
      ]
    },
    {
      name: 'Trading',
      items: [
        { icon: Star, label: 'Rewards', active: false, onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Rewards system is coming soon!' }) },
        { icon: TrendingUpIcon, label: 'Stats', active: false, onClick: () => navigate('/profile?tab=overview') }
      ]
    },
    {
      name: 'Wallet',
      items: [
        { icon: CreditCard, label: 'Deposit', active: false, onClick: () => navigate('/profile?tab=balance') },
        { icon: Wallet, label: 'Withdraw', active: false, onClick: () => navigate('/profile?tab=balance') }
      ]
    },
    {
      name: 'Features',
      items: [
        { icon: Gift, label: 'Bonuses', active: false, onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'Bonus system is coming soon!' }) },
        { icon: Crown, label: 'VIP', active: false, onClick: () => addToast({ type: 'info', title: 'Coming Soon', message: 'VIP program is coming soon!' }) },
        { icon: Settings, label: 'Settings', active: false, onClick: () => navigate('/profile?tab=settings') }
      ]
    }
  ];

  const languages = [
    { code: 'EN', flag: '🇬🇧', name: 'English' },
    { code: 'ES', flag: '🇪🇸', name: 'Español' },
    { code: 'DE', flag: '🇩🇪', name: 'Deutsch' },
    { code: 'FR', flag: '🇫🇷', name: 'Français' }
  ];

const navigationItems = [
    { name: 'Market', href: '/', icon: ShoppingCart, onClick: () => { setActiveSection('Market'); } },
    { name: 'Referral', href: '/referral', icon: Users, onClick: () => { setActiveSection('Referral'); navigate('/referral'); } },
    { name: 'Search', href: '/', icon: Search, onClick: () => { setActiveSection('Search'); setShowSearchModal(true); } },
    { name: 'Affiliate', href: '/affiliate', icon: Gift, onClick: () => { setActiveSection('Affiliate'); addToast({ type: 'info', title: 'Coming Soon', message: 'Affiliate program coming soon!' }); } },
    { name: 'Claims', href: '/claims', icon: Trophy, onClick: () => { setActiveSection('Claims'); addToast({ type: 'info', title: 'Coming Soon', message: 'Claims system coming soon!' }); } }
  ];

  const handleNavigation = (item: any) => {
    if (item.onClick) {
      item.onClick();
    }
  };

  // Generate market chart data
  const generateMarketData = () => {
    const data = [];
    const basePrice = weapon === 'AK-47' ? 150 : 100;
    
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      
      const variation = Math.sin(i / 5) * 0.1 + (Math.random() - 0.5) * 0.05;
      const price = basePrice * (1 + variation);
      
      data.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        price: Math.round(price * 100) / 100,
        value: Math.round(price * 23.5 * 100) / 100 // Convert to CZK
      });
    }
    
    return data;
  };

  // Fetch real market data from database
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!category) return;

      setIsLoadingMarketData(true);

      try {
        // Map category to item types for database query
        const categoryItemTypes: { [key: string]: string[] } = {
          'pistols': ['Pistol'],
          'rifles': ['Rifle', 'Sniper Rifle'],
          'smgs': ['SMG'],
          'heavy': ['Shotgun', 'Machinegun'],
          'knives': ['Knife'],
          'melee': ['Knife'],
          'gloves': ['Gloves'],
          'containers': ['Container'],
          'other': ['Graffiti', 'Music Kit', 'Patch', 'Sticker', 'Agent']
        };

        const itemTypes = categoryItemTypes[category.toLowerCase()] || [];
        console.log(`Fetching market data for category: ${category}, itemTypes:`, itemTypes);

        // Fetch all active listings for this category
        const { data: listings, error } = await supabase
          .from('marketplace_listings')
          .select('id, price, item_type, created_at')
          .eq('is_active', true);

        console.log('All listings fetched:', listings?.length || 0, 'Error:', error);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        // Filter by item type if we have specific types
        const filteredListings = itemTypes.length > 0
          ? listings?.filter(l => itemTypes.includes(l.item_type))
          : listings;

        console.log(`Filtered listings for ${category}:`, filteredListings?.length || 0, filteredListings);

        if (filteredListings && filteredListings.length > 0) {
          // Calculate floor value (minimum price)
          const floorValue = Math.min(...filteredListings.map(l => Number(l.price)));

          // Calculate market cap (sum of all prices)
          const marketCap = filteredListings.reduce((sum, l) => sum + Number(l.price), 0);

          console.log(`Market Stats - Floor: ${floorValue}, Market Cap: ${marketCap}`);

          // Fetch price history for the last 90 days
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const { data: priceHistoryData, error: historyError } = await supabase
            .from('marketplace_price_history')
            .select('price, recorded_at, listing_id')
            .gte('recorded_at', ninetyDaysAgo.toISOString())
            .order('recorded_at', { ascending: true });

          if (historyError) throw historyError;

          // Filter price history to only include listings from our category
          const listingIds = filteredListings.map(l => l.id);
          const categoryPriceHistory = priceHistoryData?.filter(ph =>
            listingIds.includes(ph.listing_id)
          ) || [];

          // Group price history by date and calculate average price per day
          const dailyPrices: { [key: string]: number[] } = {};
          categoryPriceHistory.forEach(ph => {
            const date = new Date(ph.recorded_at).toLocaleDateString();
            if (!dailyPrices[date]) {
              dailyPrices[date] = [];
            }
            dailyPrices[date].push(Number(ph.price));
          });

          // Convert to chart data format
          const chartData = Object.entries(dailyPrices)
            .map(([date, prices]) => {
              const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
              const dateObj = new Date(date);
              return {
                date: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
                value: Math.round(avgPrice * 100) / 100,
                price: Math.round(avgPrice * 100) / 100
              };
            })
            .sort((a, b) => {
              const dateA = new Date(a.date);
              const dateB = new Date(b.date);
              return dateA.getTime() - dateB.getTime();
            });

          setPriceHistory(chartData.length > 0 ? chartData : generateMarketData());

          // Calculate percentage changes
          const calculateChange = (daysAgo: number) => {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() - daysAgo);

            const historicalPrices = categoryPriceHistory.filter(ph => {
              const recordDate = new Date(ph.recorded_at);
              return recordDate <= targetDate;
            });

            if (historicalPrices.length === 0) return 0;

            const historicalAvg = historicalPrices.reduce((sum, ph) => sum + Number(ph.price), 0) / historicalPrices.length;
            const currentAvg = filteredListings.reduce((sum, l) => sum + Number(l.price), 0) / filteredListings.length;

            return ((currentAvg - historicalAvg) / historicalAvg) * 100;
          };

          setMarketStats({
            floorValue,
            marketCap,
            change7d: calculateChange(7),
            change30d: calculateChange(30),
            change90d: calculateChange(90),
            changeYesterday: calculateChange(1)
          });
        } else {
          // No listings found, use mock data
          console.warn(`No listings found for category: ${category}`);
          setPriceHistory(generateMarketData());
          setMarketStats({
            floorValue: 145.68,
            marketCap: 80918003,
            change7d: 2.1,
            change30d: 6.67,
            change90d: 1.58,
            changeYesterday: -6.87
          });
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        // Fallback to mock data on error
        setPriceHistory(generateMarketData());
        setMarketStats({
          floorValue: 145.68,
          marketCap: 80918003,
          change7d: 2.1,
          change30d: 6.67,
          change90d: 1.58,
          changeYesterday: -6.87
        });
      } finally {
        setIsLoadingMarketData(false);
      }
    };

    fetchMarketData();
  }, [category, weapon]);

  const marketData = priceHistory.length > 0 ? priceHistory : generateMarketData();

  // Get current weapon categories based on category parameter
  const currentWeaponCategories = getWeaponCategories(category || 'rifles');

  // AK-47 skins data
  const ak47Skins: WeaponItem[] = [
    {
      id: '1',
      name: 'Nightwatch',
      collection: 'The Danger Zone Collection',
      cashPrice: '$4.23',
      tradePrice: '$5.14',
      change24h: '+2.54%',
      change7d: '+25.1%',
      change30d: '+23.7%',
      amount: 280,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.156',
      condition: 'Field-Tested',
      rarity: 'Restricted',
      price: 125
    },
    {
      id: '2',
      name: 'Asiimov',
      collection: 'The Phoenix Collection',
      cashPrice: '$68.37',
      tradePrice: '$201.36',
      change24h: '0%',
      change7d: '+70.19%',
      change30d: '+54.37%',
      amount: 463,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.245',
      condition: 'Field-Tested',
      rarity: 'Covert',
      price: 4750
    },
    {
      id: '3',
      name: 'Leet Museo',
      collection: 'The Mirage Collection',
      cashPrice: '$40.44',
      tradePrice: '$196.29',
      change24h: '+5.76%',
      change7d: '+20.1%',
      change30d: '+62.5%',
      amount: 1143,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.089',
      condition: 'Minimal Wear',
      rarity: 'Covert',
      price: 2850
    },
    {
      id: '4',
      name: 'First Class',
      collection: 'The Danger Zone Collection',
      cashPrice: '$29.42',
      tradePrice: '$103.20',
      change24h: '+6.1%',
      change7d: '+16.7%',
      change30d: '+32.4%',
      amount: 1642,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.234',
      condition: 'Field-Tested',
      rarity: 'Covert',
      price: 2425
    },
    {
      id: '5',
      name: 'Frontside Misty',
      collection: 'The Cache Collection',
      cashPrice: '$11.73',
      tradePrice: '$14.05',
      change24h: '+15.67%',
      change7d: '+79.09%',
      change30d: '+36.4%',
      amount: 32,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.087',
      condition: 'Minimal Wear',
      rarity: 'Classified',
      price: 375
    },
    {
      id: '6',
      name: 'Gold Arabesque',
      collection: 'The Mirage Collection',
      cashPrice: '$1,849.05',
      tradePrice: '$2,227.80',
      change24h: '+15.4%',
      change7d: '+173.8%',
      change30d: '+38.1%',
      amount: 664,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.012',
      condition: 'Factory New',
      rarity: 'Covert',
      price: 52500
    },
    {
      id: '7',
      name: 'Bloodsport',
      collection: 'The Spectrum Collection',
      cashPrice: '$307.45',
      tradePrice: '$473.52',
      change24h: '+8.61%',
      change7d: '-16.7%',
      change30d: '+32.4%',
      amount: 18,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.078',
      condition: 'Minimal Wear',
      rarity: 'Covert',
      price: 11250
    },
    {
      id: '8',
      name: 'The Empress',
      collection: 'The Spectrum Collection',
      cashPrice: '$77.94',
      tradePrice: '$379.81',
      change24h: '+6.51%',
      change7d: '-12.68%',
      change30d: '+10.1%',
      amount: 249,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.156',
      condition: 'Field-Tested',
      rarity: 'Covert',
      price: 1950
    },
    {
      id: '9',
      name: 'Emerald Pinstripe',
      collection: 'The Bank Collection',
      cashPrice: '$2.19',
      tradePrice: '$13.37',
      change24h: '+0.81%',
      change7d: '+20.1%',
      change30d: '+31.5%',
      amount: 4082,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.342',
      condition: 'Field-Tested',
      rarity: 'Mil-Spec Grade',
      price: 65
    },
    {
      id: '10',
      name: 'Point Disarray',
      collection: 'The Falchion Collection',
      cashPrice: '$30.02',
      tradePrice: '$194.76',
      change24h: '+10.87%',
      change7d: '+76%',
      change30d: '+135.3%',
      amount: 122,
      image: 'https://community.cloudflare.steamstatic.com/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwKGZZLQHTxDZ7I56KU0Zwwo4NUX4oFJZEHLbXH5ApeO4YmlhxYQknCRvCo04DEVlxkKgpot7HxfDhjxszJemkV08-jhIWZlP_1IbzUklRc7cF4n-T--Y3nj1H6-ENkMWv7LYCRewdtNAmCrFO5l-lucZW_vo74h2wj5Hes8hnXzg/360fx360f',
      float: '0.167',
      condition: 'Field-Tested',
      rarity: 'Classified',
      price: 750
    }
  ];

  // Fetch marketplace listings for current category
  const { items: marketplaceItems, loading: marketplaceLoading } = useMarketplaceItems();
  
  // Filter items by current category
  const categoryItems = React.useMemo(() => {
    if (!marketplaceItems || marketplaceItems.length === 0) return [];
    
    return marketplaceItems.filter(item => {
      const itemType = item.type.toLowerCase();
      const itemName = item.name.toLowerCase();
      const categoryLower = (category || '').toLowerCase();
      
      switch (categoryLower) {
        case 'pistols':
          return itemType.includes('pistol') || 
                 itemName.includes('glock') || 
                 itemName.includes('usp') ||
                 itemName.includes('p250') ||
                 itemName.includes('desert eagle') ||
                 itemName.includes('five-seven') ||
                 itemName.includes('tec-9') ||
                 itemName.includes('cz75') ||
                 itemName.includes('dual berettas') ||
                 itemName.includes('p2000') ||
                 itemName.includes('r8 revolver');
        case 'rifles':
          return itemType.includes('rifle') ||
                 itemName.includes('ak-47') ||
                 itemName.includes('m4a4') ||
                 itemName.includes('m4a1-s') ||
                 itemName.includes('awp') ||
                 itemName.includes('famas') ||
                 itemName.includes('galil') ||
                 itemName.includes('aug') ||
                 itemName.includes('sg 553') ||
                 itemName.includes('ssg 08') ||
                 itemName.includes('g3sg1') ||
                 itemName.includes('scar-20');
        case 'smgs':
          return itemType.includes('smg') ||
                 itemName.includes('mac-10') ||
                 itemName.includes('mp5-sd') ||
                 itemName.includes('mp7') ||
                 itemName.includes('mp9') ||
                 itemName.includes('ump-45') ||
                 itemName.includes('p90') ||
                 itemName.includes('pp-bizon');
        case 'heavy':
          return itemType.includes('shotgun') ||
                 itemType.includes('machinegun') ||
                 itemName.includes('nova') ||
                 itemName.includes('mag-7') ||
                 itemName.includes('sawed-off') ||
                 itemName.includes('xm1014') ||
                 itemName.includes('m249') ||
                 itemName.includes('negev');
        case 'knives':
          return itemType.includes('knife') || itemName.includes('★');
        case 'gloves':
          return itemType.includes('gloves') || itemName.includes('gloves');
        case 'containers':
          return itemType.includes('case') ||
                 itemName.includes('Case') ||
                 itemName.includes('Weapon Case');
        default:
          return false;
      }
    }).slice(0, 12); // Limit to 12 items for better performance
  }, [marketplaceItems, category]);

  // Helper function to get collection name from item type
  const getCollectionName = (type: string): string => {
    const collections: { [key: string]: string } = {
      'rifle': 'The Assault Collection',
      'pistol': 'The Sidearm Collection',
      'smg': 'The Submachine Collection',
      'shotgun': 'The Heavy Collection',
      'knife': 'The Blade Collection',
      'gloves': 'The Hand Collection'
    };
    return collections[type.toLowerCase()] || 'The Standard Collection';
  };

  // Map items based on category and weapon filter
  const displayItems = React.useMemo(() => {
    let items = categoryItems;
    
    if (weapon) {
      items = items.filter(item => 
        item.name.toLowerCase().includes(weapon.toLowerCase()) ||
        item.market_name.toLowerCase().includes(weapon.toLowerCase())
      );
    }
    
    // Convert marketplace items to weapon items format for display
    return items.map(item => ({
      id: item.id,
      name: item.name,
      collection: getCollectionName(item.type),
      cashPrice: formatPrice(item.price * 0.9),
      tradePrice: formatPrice(item.price),
      change24h: `${(Math.random() * 20 - 10).toFixed(1)}%`,
      change7d: `${(Math.random() * 15 - 5).toFixed(1)}%`,
      change30d: `${(Math.random() * 25 - 10).toFixed(1)}%`,
      amount: Math.floor(Math.random() * 1000) + 50,
      image: item.image,
      float: item.float || (Math.random() * 0.8 + 0.01).toFixed(3),
      condition: item.condition,
      rarity: item.rarity,
      price: item.price
    }));
  }, [categoryItems, weapon, formatPrice]);

  const currentItems = weapon === 'AK-47' ? ak47Skins : displayItems;
  const isShowingWeaponSpecific = !!weapon;
  const currentWeaponName = weapon || category;

  const filteredItems = currentItems.filter(item =>
    !searchQuery || 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.collection.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalValue = filteredItems.reduce((sum, item) => sum + item.price, 0);
  const avgChange = filteredItems.reduce((sum, item) => 
    sum + parseFloat(item.change24h.replace('%', '').replace('+', '')), 0) / filteredItems.length;

  const handleAddToCart = (item: WeaponItem) => {
    const cartItem = {
      id: item.id,
      name: `AK-47 | ${item.name}`,
      market_name: `AK-47 | ${item.name} (${item.condition})`,
      type: 'Rifle',
      condition: item.condition,
      price: item.price,
      image: item.image,
      rarity: item.rarity,
      seller: { steamId: 'marketplace', name: 'Marketplace' }
    };
    
    addItem(cartItem);
    addToast({
      type: 'success',
      title: 'Added to Cart!',
      message: `AK-47 | ${item.name} - ${formatPrice(item.price)}`
    });
  };

  const handleToggleFavorite = (item: WeaponItem) => {
    const wishlistItem = {
      id: item.id,
      name: `AK-47 | ${item.name}`,
      price: item.price,
      image: item.image,
      rarity: item.rarity
    };
    
    const wasInWishlist = isInWishlist(item.id);
    toggleItem(wishlistItem);
    
    addToast({
      type: wasInWishlist ? 'info' : 'success',
      title: wasInWishlist ? 'Removed from Wishlist' : 'Added to Wishlist',
      message: `AK-47 | ${item.name}`
    });
  };

  const getChangeColor = (change: string) => {
    const value = parseFloat(change.replace('%', '').replace('+', ''));
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (change: string) => {
    const value = parseFloat(change.replace('%', '').replace('+', ''));
    if (value > 0) return <TrendingUp size={12} />;
    if (value < 0) return <TrendingDown size={12} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">

      {/* Main Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar */}
        <div className="group fixed left-0 top-0 h-full z-50 w-16 hover:w-64 bg-gray-800/80 backdrop-blur-md border-r border-gray-700/50 flex flex-col transition-all duration-300 ease-in-out py-4 shadow-xl">
          {/* Logo */}
          <div className="h-12 flex items-center justify-center mb-4 mx-auto group-hover:mx-3 overflow-hidden">
            <div className="relative flex items-center">
              <motion.img
                src="https://i.postimg.cc/rsN3wQRf/skinfy1-2-removebg-preview.png"
                alt="Skinify Logo"
                className="h-10 w-auto object-contain"
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              
              <div className="hidden group-hover:block">
                <motion.img
                  src="https://i.postimg.cc/xqdxTY2d/skinify2-2-removebg-preview.png"
                  alt="Skinify Logo Extended"
                  className="h-10 w-auto object-contain"
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    transition: { 
                      delay: 0.15,
                      duration: 0.4,
                      type: "spring",
                      stiffness: 200,
                      damping: 20
                    }
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    transition: { duration: 0.2 }
                  }}
                  style={{ 
                    filter: 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.3))'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Sidebar Items */}
          <div className="flex flex-col space-y-1 flex-1 px-2 group-hover:px-3">
            {sidebarSections.map((section, sectionIndex) => (
              <div key={section.name} className="relative">
                {sectionIndex > 0 && (
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent my-2 mx-2" />
                )}
                
                <div className="hidden group-hover:block mb-2">
                  <div className="text-xs text-purple-400 font-medium px-3 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200">
                    {section.name}
                  </div>
                </div>
                
                {section.items.map((item, itemIndex) => (
                  <button
                    key={itemIndex}
                    onClick={item.onClick}
                    className={`relative flex items-center p-3 rounded-lg transition-all duration-300 overflow-hidden group/item w-full mb-1 ${
                      item.active 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <item.icon size={20} className="flex-shrink-0" />
                    
                    <div className="hidden group-hover:block ml-3">
                      <span className="text-current whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-150">
                        {item.label}
                      </span>
                    </div>
                    
                    <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900/95 border border-gray-600/50 text-white text-sm opacity-0 group-hover:opacity-0 group/item:hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-[60]">
                      {item.label}
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col ml-16 relative">
          
      {/* Main Header Navigation */}
      <motion.header
        style={{
          y: sidebarY,
          opacity: sidebarOpacity,
        }}
        className="fixed left-16 right-0 bg-gray-800 border-b border-gray-700/50 p-4 z-30 shadow-lg"
      >
        <div className="flex items-center relative">
          {/* Center Navigation */}
          <div className="flex justify-center w-full">
            <Flipper flipKey={`${activeSection}-${hoveredNavItem}`}>
              <motion.nav 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                <div 
                  className="flex justify-center space-x-1 bg-gray-900 px-6 py-3 border border-purple-500/40 shadow-2xl rounded-lg"
                  style={{ 
                    boxShadow: '0 0 30px rgba(168, 85, 247, 0.4), 0 8px 32px rgba(0, 0, 0, 0.3)',
                    background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.95), rgba(31, 41, 55, 0.9))'
                  }}
                >
                  {navigationItems.map((item, index) => (
                    <Flipped key={item.name} flipId={`header-nav-${item.name}`}>
                      <motion.button
                        onClick={() => handleNavigation(item)}
                        onMouseEnter={() => setHoveredNavItem(item.name)}
                        onMouseLeave={() => setHoveredNavItem(null)}
                        whileHover={{ 
                          scale: 1.05,
                          filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.9))'
                        }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex justify-center relative px-4 py-2 text-sm font-medium transition-all duration-300 flex items-center space-x-2 rounded-lg ${
                          activeSection === item.name
                            ? 'text-white bg-purple-600'
                            : hoveredNavItem === item.name
                              ? 'text-purple-200 bg-purple-500/30'
                              : 'text-gray-300 hover:text-white hover:bg-purple-500/20'
                        }`}
                        style={activeSection === item.name ? {
                          boxShadow: '0 0 25px rgba(168, 85, 247, 0.7), 0 4px 20px rgba(147, 51, 234, 0.5)',
                          background: 'linear-gradient(145deg, #9333EA, #A855F7)'
                        } : hoveredNavItem === item.name ? {
                          boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)',
                          background: 'linear-gradient(145deg, rgba(147, 51, 234, 0.3), rgba(168, 85, 247, 0.3))'
                        } : {}}
                      >
                        <motion.div
                          animate={{ 
                            scale: activeSection === item.name || hoveredNavItem === item.name ? 1.1 : 1,
                            color: activeSection === item.name ? '#E879F9' : hoveredNavItem === item.name ? '#D8B4FE' : '#9CA3AF'
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <item.icon size={16} />
                        </motion.div>
                        <span>{item.name}</span>
                        
                        {(activeSection === item.name || hoveredNavItem === item.name) && (
                          <Flipped flipId="header-nav-glow">
                            <motion.div
                              layoutId="headerNavActiveIndicator"
                              className="absolute inset-0 bg-gradient-to-r from-purple-600/50 via-purple-500/70 to-purple-600/50 -z-10 rounded-lg"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ 
                                type: "spring", 
                                stiffness: 400, 
                                damping: 30,
                                duration: 0.3 
                              }}
                            />
                          </Flipped>
                        )}
                      </motion.button>
                    </Flipped>
                  ))}
                </div>
              </motion.nav>
            </Flipper>
          </div>

          {/* Right Side - Positioned Absolutely */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {/* Wishlist Button */}
            <motion.button
              onClick={() => navigate('/profile?tab=wishlist')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
            >
              <Heart size={20} />
            </motion.button>

            {/* Cart Button */}
            <motion.button
              onClick={() => navigate('/cart')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-300 hover:text-purple-400 transition-colors relative"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </motion.button>

            {/* Sign In / User Profile */}
            <div className="ml-2">
              {user ? <UserProfile /> : <SteamLogin />}
            </div>
          </div>
        </div>
      </motion.header>

          {/* Weapon Category Content */}
          <div className="flex-1 pt-20 p-6 overflow-y-auto">
          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-2 mt-9"
          >
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Link to="/marketplace" className="hover:text-purple-400 top-25 transition-colors">
                CS2 Skins
              </Link>
              <span>&gt;</span>
              <Link to={`/weapons/${category}`} className="hover:text-purple-400 transition-colors">
                {getCategoryDisplayName(category || 'rifles')}
              </Link>
              {weapon && (
                <>
                  <span>&gt;</span>
                  <span className="text-white">{weapon}</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-16 h-16 bg-gray-800/50 rounded-lg flex items-center justify-center border border-gray-700/50">
                <img 
                  src={getWeaponImage(weapon || getCategoryDisplayName(category || 'rifles').slice(0, -1))}
                  alt={currentWeaponName}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  {isShowingWeaponSpecific ? `${weapon} Skins In CS2` : `${getCategoryDisplayName(category || 'rifles')} Skins In CS2`}
                </h1>
                <p className="text-gray-300 text-lg mt-2">
                  {getCategoryDescription(category || 'rifles', isShowingWeaponSpecific, weapon)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Weapon Categories Grid (Only for general category page) */}
          {!isShowingWeaponSpecific && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-white mb-6">{getWeaponSelectorText(category || 'rifles')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {currentWeaponCategories.map((weaponCat, index) => (
                  <motion.button
                    key={weaponCat.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => navigate(`/weapons/${category}/${weaponCat.name}`)}
                    whileHover={{ scale: 1.05, y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 group text-center"
                  >
                    <div className="w-24 h-16 bg-gray-700/50 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-gray-600/50 transition-colors">
                      <img 
                        src={weaponCat.image}
                        alt={weaponCat.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                      {weaponCat.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{weaponCat.count}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Market Overview Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Market Stats */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-6">
                  {isShowingWeaponSpecific ? `${weapon} Market` : `${getCategoryDisplayName(category || 'rifles')} Market`}
                </h3>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <div className="text-3xl font-bold text-blue-400">
                      {isLoadingMarketData ? '...' : marketStats.floorValue.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm">FLOOR VALUE</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {isLoadingMarketData ? '...' : formatPrice(marketStats.marketCap)}
                    </div>
                    <div className="text-gray-400 text-sm">MARKET CAP</div>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">7 days</span>
                    <span className={marketStats.change7d >= 0 ? "text-green-400" : "text-red-400"}>
                      {marketStats.change7d >= 0 ? '+' : ''}{marketStats.change7d.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">1 month</span>
                    <span className={marketStats.change30d >= 0 ? "text-green-400" : "text-red-400"}>
                      {marketStats.change30d >= 0 ? '+' : ''}{marketStats.change30d.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">3 months</span>
                    <span className={marketStats.change90d >= 0 ? "text-green-400" : "text-red-400"}>
                      {marketStats.change90d >= 0 ? '+' : ''}{marketStats.change90d.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="mt-6 text-right">
                  <div className={`text-2xl font-bold ${marketStats.changeYesterday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {marketStats.changeYesterday >= 0 ? '+' : ''}{marketStats.changeYesterday.toFixed(2)}%
                  </div>
                  <div className="text-gray-400 text-sm">From Yesterday</div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-xl font-bold text-white mb-6">Price History</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={marketData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#9CA3AF"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => `${value.toLocaleString('cs-CZ')}`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#FFFFFF'
                        }}
                        formatter={(value: any) => [`${value.toLocaleString('cs-CZ')} Kč`, 'Price']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8B5CF6" 
                        strokeWidth={3}
                        dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Items Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            {/* Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 space-y-4 lg:space-y-0">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isShowingWeaponSpecific ? `${weapon} Skins` : `${getCategoryDisplayName(category || 'rifles')} Collection`}
                </h2>
                <p className="text-gray-400">
                  {filteredItems.length} items • Total value: {formatPrice(totalValue)}
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search skins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-gray-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Grid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Items Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 overflow-hidden group cursor-pointer"
                    onClick={() => navigate(`/item/${item.id}`)}
                  >
                    <div className="relative">
                      <div className="aspect-square bg-gray-900/50 flex items-center justify-center p-4">
                        <img 
                          src={item.image}
                          alt={item.name}
                          className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      
                      {/* Action buttons */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(item);
                          }}
                          className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                            isInWishlist(item.id) 
                              ? 'bg-red-500/80 text-white' 
                              : 'bg-black/40 text-gray-300 hover:bg-red-500/60 hover:text-white'
                          }`}
                        >
                          <Heart size={14} fill={isInWishlist(item.id) ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(item);
                          }}
                          className="p-2 bg-blue-600/80 hover:bg-blue-500/80 text-white rounded-full backdrop-blur-sm transition-all duration-300"
                        >
                          <ShoppingCart size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-white font-bold text-sm mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {isShowingWeaponSpecific ? item.name : item.name}
                      </h3>
                      <div className="text-gray-400 text-xs mb-3">{item.collection}</div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Cash Price</span>
                          <span className="text-green-400 font-bold text-sm">{item.cashPrice}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">Trade Price</span>
                          <span className="text-blue-400 font-bold text-sm">{item.tradePrice}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs">24h Change</span>
                          <span className={`font-bold text-xs flex items-center space-x-1 ${getChangeColor(item.change24h)}`}>
                            {getChangeIcon(item.change24h)}
                            <span>{item.change24h}</span>
                          </span>
                        </div>
                        <div className="text-center pt-2 border-t border-gray-700/50">
                          <span className="text-xs text-gray-500">{item.amount} available</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
                {/* Table Header */}
                <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-700/50">
                  <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="col-span-1">#</div>
                    <div className="col-span-3">NAME</div>
                    <div className="col-span-2">CASH PRICE</div>
                    <div className="col-span-2">TRADE PRICE</div>
                    <div className="col-span-1">24H</div>
                    <div className="col-span-1">7D</div>
                    <div className="col-span-1">30D</div>
                    <div className="col-span-1">AMOUNT</div>
                  </div>
                </div>

                {/* Table Body */}
                <div className="divide-y divide-gray-700/50">
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/item/${item.id}`)}
                      className="px-6 py-4 hover:bg-gray-700/30 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-1">
                          <span className="text-gray-400 font-medium">{index + 1}</span>
                        </div>
                        
                        <div className="col-span-3 flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-700/50 rounded-lg flex items-center justify-center">
                            <img 
                              src={item.image}
                              alt={item.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div>
                            <div className="text-white font-medium group-hover:text-purple-400 transition-colors">
                              {isShowingWeaponSpecific ? item.name : item.name}
                            </div>
                            <div className="text-gray-400 text-xs">{item.collection}</div>
                          </div>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="text-green-400 font-bold">{item.cashPrice}</span>
                        </div>
                        
                        <div className="col-span-2">
                          <span className="text-blue-400 font-bold">{item.tradePrice}</span>
                        </div>
                        
                        <div className="col-span-1">
                          <span className={`font-bold text-sm flex items-center space-x-1 ${getChangeColor(item.change24h)}`}>
                            {getChangeIcon(item.change24h)}
                            <span>{item.change24h}</span>
                          </span>
                        </div>
                        
                        <div className="col-span-1">
                          <span className={`font-bold text-sm flex items-center space-x-1 ${getChangeColor(item.change7d)}`}>
                            {getChangeIcon(item.change7d)}
                            <span>{item.change7d}</span>
                          </span>
                        </div>
                        
                        <div className="col-span-1">
                          <span className={`font-bold text-sm flex items-center space-x-1 ${getChangeColor(item.change30d)}`}>
                            {getChangeIcon(item.change30d)}
                            <span>{item.change30d}</span>
                          </span>
                        </div>
                        
                        <div className="col-span-1">
                          <span className="text-gray-300 font-medium">{item.amount}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Trends Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-12"
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="p-6 border-b border-gray-700/50">
                <h3 className="text-xl font-bold text-white">
                  {isShowingWeaponSpecific ? `${weapon} Trends` : `${getCategoryDisplayName(category || 'rifles')} Trends`}
                </h3>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-700/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name..."
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Trends Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">#</th>
                      <th className="px-6 py-3 text-left">NAME</th>
                      <th className="px-6 py-3 text-right">CASH PRICE</th>
                      <th className="px-6 py-3 text-right">TRADE PRICE</th>
                      <th className="px-6 py-3 text-right">24H</th>
                      <th className="px-6 py-3 text-right">7D</th>
                      <th className="px-6 py-3 text-right">30D</th>
                      <th className="px-6 py-3 text-right">AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700/50">
                    {filteredItems.slice(0, 10).map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => navigate(`/item/${item.id}`)}
                        className="hover:bg-gray-700/30 transition-all duration-300 cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-gray-400 font-medium">{index + 1}</span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-700/50 rounded flex items-center justify-center">
                              <img 
                                src={item.image}
                                alt={item.name}
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div>
                              <div className="text-white font-medium group-hover:text-purple-400 transition-colors text-sm">
                                {isShowingWeaponSpecific ? `AK-47 | ${item.name}` : item.name}
                              </div>
                              <div className="text-gray-500 text-xs">
                                {item.condition} • {item.amount > 1000 ? `${Math.floor(item.amount/1000)}k` : item.amount} available
                              </div>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className="text-green-400 font-bold">{item.cashPrice}</span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className="text-blue-400 font-bold">{item.tradePrice}</span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold flex items-center justify-end space-x-1 ${getChangeColor(item.change24h)}`}>
                            {getChangeIcon(item.change24h)}
                            <span>{item.change24h}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold flex items-center justify-end space-x-1 ${getChangeColor(item.change7d)}`}>
                            {getChangeIcon(item.change7d)}
                            <span>{item.change7d}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className={`font-bold flex items-center justify-end space-x-1 ${getChangeColor(item.change30d)}`}>
                            {getChangeIcon(item.change30d)}
                            <span>{item.change30d}</span>
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 text-right">
                          <span className="text-gray-300 font-medium">{item.amount}</span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-6 border-t border-gray-700/50">
                <div className="flex items-center justify-center space-x-2">
                  {[1, 2, 3, 4, 5, '...', 44, 45].map((page, index) => (
                    <button
                      key={index}
                      className={`px-3 py-2 rounded transition-colors text-sm ${
                        page === 1 
                          ? 'bg-purple-600 text-white' 
                          : typeof page === 'number'
                            ? 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            : 'text-gray-500 cursor-default'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Back to Market */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="text-center"
          >
            <Link
              to="/"
              className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-lg transition-all duration-300 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span>Back to Marketplace</span>
            </Link>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="mt-8"
            >
              <Footer />
            </motion.div>
          </motion.div>
        </div>
        </div>
      </div>
      
      {/* Search Modal */}
      <SearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </div>
  );
};

export default WeaponCategoryPage;
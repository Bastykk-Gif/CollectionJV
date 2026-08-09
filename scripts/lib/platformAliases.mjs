// Correspondance entre nos noms de plateforme (index.html) et les noms utilisés par
// TheGamesDB, pour filtrer/mettre en avant les bons résultats. Filtre "souple" :
// une plateforme non reconnue ici n'exclut jamais un résultat, elle n'aide juste
// pas à le trier — la validation humaine reste le filtre final.
export const PLATFORM_ALIASES = {
  'Amstrad': { include: ['amstrad cpc'] },
  'Atari 2600': { include: ['atari 2600'] },
  'Atari 400/800/XL/XE': { include: ['atari 8-bit', 'atari 400', 'atari 800'] },
  'Colecovision': { include: ['colecovision'] },
  'Commodore 64': { include: ['commodore 64', 'c64'] },
  'Dreamcast': { include: ['dreamcast'] },
  'Game Boy': { include: ['game boy'], exclude: ['advance', 'color'] },
  'Game Boy Advance': { include: ['game boy advance'] },
  'Game Boy Color': { include: ['game boy color'] },
  'Game Gear': { include: ['game gear'] },
  'Gamecube': { include: ['gamecube', 'game cube'] },
  'Intellivision': { include: ['intellivision'] },
  'Megadrive': { include: ['mega drive', 'genesis'] },
  'MSX': { include: ['msx'] },
  'NES': { include: ['entertainment system', 'nes'], exclude: ['super'] },
  'Nintendo 3DS': { include: ['nintendo 3ds'] },
  'Nintendo 64': { include: ['nintendo 64'] },
  'Nintendo DS': { include: ['nintendo ds'], exclude: ['3ds'] },
  'PC': { include: ['pc', 'windows', 'steam', 'dos'] },
  'Playstation': { include: ['playstation'], exclude: ['2', '3', '4', '5', 'vita', 'portable'] },
  'Playstation 2': { include: ['playstation 2'] },
  'Playstation 3': { include: ['playstation 3'] },
  'Playstation 4': { include: ['playstation 4'] },
  'Playstation 5': { include: ['playstation 5'] },
  'PS VITA': { include: ['vita'] },
  'PSP': { include: ['psp', 'portable'] },
  'Saturn': { include: ['saturn'] },
  'Super NES': { include: ['super nintendo', 'snes'] },
  'Switch': { include: ['switch'], exclude: ['switch 2'] },
  'Switch 2': { include: ['switch 2'] },
  'Wii': { include: ['wii'], exclude: ['wii u'] },
  'WiiU': { include: ['wii u'] },
  'Xbox': { include: ['xbox'], exclude: ['360', 'one', 'series'] },
  'Xbox 360': { include: ['xbox 360'] },
  'Xbox One': { include: ['xbox one'] },
  'ZX Spectrum': { include: ['zx spectrum'] },
  // 'Rollet' : nom non reconnu par TheGamesDB, pas d'alias — filtrage désactivé pour cette plateforme.
};

export function platformMatches(ourPlatform, tgdbPlatformName){
  const alias = PLATFORM_ALIASES[ourPlatform];
  if(!alias) return null; // inconnu : ni confirmé, ni exclu
  const name = String(tgdbPlatformName || '').toLowerCase();
  if(alias.exclude && alias.exclude.some(x => name.includes(x))) return false;
  return alias.include.some(x => name.includes(x));
}

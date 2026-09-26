/**
 * Registro de escudos oficiales e historial federativo FFCV verificado para jugadores
 */

export const CLUB_SHIELDS_REGISTRY: Record<string, string> = {
  'sporting saladar': 'https://appwebffcv.novanet.es/pnfg/var/docs/anterior/1314/DOCS/20141/8/f8a9a733242bf31f0d35be5bb3768486_4M3qpkhJ.jpg?nova=1',
  'c.d. almoradi': 'https://appwebffcv.novanet.es/pnfg/var/docs/1415/DOCS/20149/4/651d60cd481ce36e99b4068f79b4e891_OAx38ELD.jpg?nova=1',
  'almoradi': 'https://appwebffcv.novanet.es/pnfg/var/docs/1415/DOCS/20149/4/651d60cd481ce36e99b4068f79b4e891_OAx38ELD.jpg?nova=1',
  'callosa deportiva c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074502466_Callosa_Deportiva.png?nova=1',
  'callosa deportiva': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074502466_Callosa_Deportiva.png?nova=1',
  'f.b. redovan c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074502755_ESCUDO_REDOVA_N.JPG?nova=1',
  'redovan': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074502755_ESCUDO_REDOVA_N.JPG?nova=1',
  's.c. torrevieja c.f.': 'https://appwebffcv.novanet.es/pnfg/var/docs/2122/DOCS/20219/13/161fec612e38b45885b979780aa0f511.jpg?nova=1',
  'sporting costablanca torrevieja c.f.': 'https://appwebffcv.novanet.es/pnfg/var/docs/2122/DOCS/20219/13/161fec612e38b45885b979780aa0f511.jpg?nova=1',
  'torrevieja': 'https://appwebffcv.novanet.es/pnfg/var/docs/2122/DOCS/20219/13/161fec612e38b45885b979780aa0f511.jpg?nova=1',
  'benferri c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074602123_Logo_Benferri_C.F.png?nova=1',
  'benferri': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074602123_Logo_Benferri_C.F.png?nova=1',
  'atletico de catral c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074601293_ESCUDO_NUEVO_CATRAL_CASTRUM_CF.jpeg?nova=1',
  'catral': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074601293_ESCUDO_NUEVO_CATRAL_CASTRUM_CF.jpeg?nova=1',
  'catral castrum c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074601293_ESCUDO_NUEVO_CATRAL_CASTRUM_CF.jpeg?nova=1',
  'c.d. cox': 'https://appwebffcv.novanet.es/pnfg/var/docs/2122/DOCS/20217/26/cd98659a1bae38943d1846979f29aa05.jpg?nova=1',
  'cox': 'https://appwebffcv.novanet.es/pnfg/var/docs/2122/DOCS/20217/26/cd98659a1bae38943d1846979f29aa05.jpg?nova=1',
  'c.d. dolores': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074497324_Escudo_BMP.bmp?nova=1',
  'dolores': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074497324_Escudo_BMP.bmp?nova=1',
  'elche c.f. s.a.d.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074640399_Escudo_Elche_CF.png',
  'elche c.f.': 'https://appwebffcv.novanet.es/pnfg/pimg/Clubes/00100_0074640399_Escudo_Elche_CF.png'
};

export function getRegistryShield(clubName?: string | null): string | null {
  if (!clubName) return null;
  const clean = clubName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (CLUB_SHIELDS_REGISTRY[clean]) return CLUB_SHIELDS_REGISTRY[clean];
  for (const [key, url] of Object.entries(CLUB_SHIELDS_REGISTRY)) {
    if (clean.includes(key) || key.includes(clean)) {
      return url;
    }
  }
  return null;
}

export interface PlayerHistoricalEntry {
  temporada: string;
  codigo_temporada?: string;
  club: string;
  equipo: string;
  categoria: string;
  competicion?: string;
  grupo?: string;
  escudo?: string | null;
  partidos_jugados?: number;
  titular?: number;
  suplente?: number;
  goles?: number;
  minutos?: number;
}

/**
 * Trayectorias completas oficiales registradas en FFCV para jugadores cuyas fichas abarcan
 * varias décadas o temporadas anteriores a las publicadas en el endpoint estándar.
 */
export const VERIFIED_PLAYER_HISTORIES: Record<string, PlayerHistoricalEntry[]> = {
  // Cristian Montero Giménez
  'cristian montero gimenez': [
    { temporada: '2026-2027', codigo_temporada: '22', club: 'Sporting Saladar', equipo: 'Sporting Saladar', categoria: 'Segona FFCV', competicion: 'Segona FFCV (Grup - 8)' },
    { temporada: '2025-2026', codigo_temporada: '21', club: 'C.D. Almoradí', equipo: 'C.D. Almoradí', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2025-2026', codigo_temporada: '21', club: 'Sporting Saladar', equipo: 'Sporting Saladar', categoria: 'Segona FFCV', competicion: 'Segona FFCV (Grup - 8)' },
    { temporada: '2024-2025', codigo_temporada: '20', club: 'Callosa Deportiva C.F.', equipo: 'Callosa Deportiva C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2023-2024', codigo_temporada: '19', club: 'F.B. Redován C.F.', equipo: "F.B. Redován C.F. 'A'", categoria: 'Lliga Comunitat FFCV', competicion: 'Lliga À Punt Comunitat (Grup Sud)' },
    { temporada: '2023-2024', codigo_temporada: '19', club: 'S.C. Torrevieja C.F.', equipo: "S.C. Torrevieja C.F. 'A'", categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2022-2023', codigo_temporada: '18', club: 'F.B. Redován C.F.', equipo: "F.B. Redován C.F. 'A'", categoria: 'Primera FFCV', competicion: 'Lliga À Punt Preferent (Liga - 4)' },
    { temporada: '2021-2022', codigo_temporada: '17', club: 'Benferri C.F.', equipo: 'Benferri C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2020-2021', codigo_temporada: '16', club: 'Benferri C.F.', equipo: 'Benferri C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2019-2020', codigo_temporada: '15', club: 'C.D. Almoradí', equipo: 'C.D. Almoradí', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2019-2020', codigo_temporada: '15', club: 'Atlético de Catral C.F.', equipo: 'Atlético de Catral C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2018-2019', codigo_temporada: '14', club: 'Benferri C.F.', equipo: 'Benferri C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2017-2018', codigo_temporada: '13', club: 'Benferri C.F.', equipo: 'Benferri C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2016-2017', codigo_temporada: '12', club: 'Atlético de Catral C.F.', equipo: 'Atlético de Catral C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2015-2016', codigo_temporada: '11', club: 'Atlético de Catral C.F.', equipo: 'Atlético de Catral C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2014-2015', codigo_temporada: '10', club: 'Atlético de Catral C.F.', equipo: 'Atlético de Catral C.F.', categoria: 'Primera FFCV', competicion: 'Primera FFCV' },
    { temporada: '2013-2014', codigo_temporada: '9', club: 'C.D. Cox', equipo: 'C.D. Cox', categoria: 'Segona FFCV', competicion: 'Segona FFCV' },
    { temporada: '2013-2014', codigo_temporada: '9', club: 'C.D. Dolores', equipo: 'C.D. Dolores', categoria: 'Tercera FFCV', competicion: 'Tercera FFCV' },
    { temporada: '2012-2013', codigo_temporada: '8', club: 'C.D. Cox', equipo: 'C.D. Cox', categoria: 'Segona FFCV', competicion: 'Segona FFCV' },
    { temporada: '2011-2012', codigo_temporada: '7', club: 'C.D. Dolores', equipo: 'C.D. Dolores', categoria: 'Tercera FFCV', competicion: 'Tercera FFCV' },
    { temporada: '2010-2011', codigo_temporada: '6', club: 'C.D. Dolores', equipo: 'C.D. Dolores', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2009-2010', codigo_temporada: '5', club: 'C.D. Almoradí', equipo: 'C.D. Almoradí', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2008-2009', codigo_temporada: '4', club: 'C.D. Dolores', equipo: 'C.D. Dolores', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2007-2008', codigo_temporada: '3', club: 'C.D. Dolores', equipo: 'C.D. Dolores', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2006-2007', codigo_temporada: '2', club: 'C.D. Almoradí', equipo: 'C.D. Almoradí', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2005-2006', codigo_temporada: '1', club: 'Elche C.F. S.A.D.', equipo: 'Elche C.F. S.A.D.', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2004-2005', club: 'C.D. Almoradí', equipo: 'C.D. Almoradí', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' },
    { temporada: '2003-2004', club: 'Sporting Saladar', equipo: 'Sporting Saladar', categoria: 'Categoria Territorial', competicion: 'Categoria Territorial' }
  ]
};

export function getVerifiedHistoryForPlayer(name: string): PlayerHistoricalEntry[] | null {
  const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  for (const [key, history] of Object.entries(VERIFIED_PLAYER_HISTORIES)) {
    if (norm.includes(key) || key.includes(norm)) {
      return history.map(item => ({
        ...item,
        escudo: item.escudo || getRegistryShield(item.club)
      }));
    }
  }
  return null;
}

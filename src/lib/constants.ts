// src/lib/constants.ts
export const SPORTS = [
  "Futbol",
  "Balonmano",
  "Futbol Sala",
  "Voleivol",
  "Padel",
  "Tenis",
  "Tenis de mesa",
  "Badmington Rugby",
  "Béisbol",
  "Fútbol americano",
  "Vóley playa",
  "Softbol",
  "Críquet",
  "Hockey sobre césped",
  "Hockey sobre hielo",
  "Hockey sobre patines",
  "Waterpolo",
  "Jugger"
];

export const GENDERS = ["Masculino", "Femenino", "Mixto"];

export const AGE_GROUPS = [
  ...Array.from({ length: 19 }, (_, i) => `Sub-${i + 3}`),
  "Senior",
  "Veteranos",
];

export const FORMATS = [
  "2x2",
  "3x3",
  "4x4",
  "5x5",
  "6x6",
  "7x7",
  "8x8",
  "9x9",
  "10x10",
  "11x11",
  "15x15",
  "Individual",
];

export const COLORS = [
  { name: "Azul oscuro", value: "#1E3A8A" },
  { name: "Azul medio", value: "#3B82F6" },
  { name: "Azul claro", value: "#60A5FA" },
  { name: "Rojo oscuro", value: "#B91C1C" },
  { name: "Rojo medio", value: "#EF4444" },
  { name: "Rojo claro", value: "#F87171" },
  { name: "Verde oscuro", value: "#166534" },
  { name: "Verde medio", value: "#16A34A" },
  { name: "Verde claro", value: "#86EFAC" },
  { name: "Amarillo oscuro", value: "#CA8A04" },
  { name: "Amarillo medio", value: "#F59E0B" },
  { name: "Amarillo claro", value: "#FDE68A" },
  { name: "Naranja oscuro", value: "#C2410C" },
  { name: "Naranja medio", value: "#F97316" },
  { name: "Naranja claro", value: "#FDBA74" },
  { name: "Morado oscuro", value: "#7C3AED" },
  { name: "Morado medio", value: "#A78BFA" },
  { name: "Morado claro", value: "#D8B4FE" },
  { name: "Gris oscuro", value: "#374151" },
  { name: "Gris medio", value: "#9CA3AF" },
  { name: "Gris claro", value: "#D1D5DB" },
  { name: "Negro", value: "#000000" },
  { name: "Blanco", value: "#FFFFFF" },
  { name: "Cian", value: "#06B6D4" },
];

export function getContrastColor(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

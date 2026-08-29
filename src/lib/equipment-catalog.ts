/**
 * Curated brand/model catalog for the "Add Equipment" form. Drives the
 * brand -> model dropdown cascade so users pick from a known list instead
 * of free-typing brand/model (which invited typos and inconsistent naming).
 *
 * This aims to be broadly exhaustive of popular home roasting/brewing gear
 * while staying easy to scan: each brand is flagged `popular` and the form
 * renders popular brands in their own "Most Popular" optgroup ahead of
 * everything else, so the common choices surface first without hiding the
 * long tail. Every type also includes an "Other" brand with a free-text
 * model so uncommon gear is never blocked.
 *
 * Only roasters and brewers with matching hand-tuned prompts (see
 * ROASTER_PROMPTS in roast-planning/route.ts and BREWING_PROMPTS in
 * brew-recipe/route.ts) get deterministic/hand-tuned AI treatment —
 * everything else still works via the AI-researched equipment profile
 * cache (see equipment-ai-profile.ts).
 */

export type EquipmentType = 'roaster' | 'grinder' | 'brewer'

export const OTHER_BRAND = 'Other'

export interface CatalogBrand {
  brand: string
  models: string[]
  popular?: boolean
}

export const EQUIPMENT_CATALOG: Record<EquipmentType, CatalogBrand[]> = {
  roaster: [
    { brand: 'Fresh Roast', models: ['SR800', 'SR540', 'SR300'], popular: true },
    { brand: 'Behmor', models: ['1600 Plus', '1600 Plus X'], popular: true },
    { brand: 'Hottop', models: ['KN-8828B-2K+', 'KN-8828P-2K+'], popular: true },
    { brand: 'Gene Cafe', models: ['CBR-101', 'CBR-101A'], popular: true },
    { brand: 'Aillio', models: ['Bullet R1 V2', 'Bullet R1', 'Bullet Junior'] },
    { brand: 'Huky', models: ['500', '650'] },
    { brand: 'Kaldi', models: ['Motorized Home Roaster', 'Wide Motorized'] },
    { brand: 'IKAWA', models: ['Home', 'Pro'] },
    { brand: 'Nesco', models: ['Coffee Bean Roaster'] },
    { brand: 'San Franciscan', models: ['SF-1', 'SF-25'] },
    { brand: 'Sonofresco', models: ['Butterfly Roaster'] },
    { brand: 'Aroma', models: ['Roast Master'] }
  ],
  grinder: [
    { brand: 'Baratza', models: ['Encore', 'Encore ESP', 'Virtuoso+', 'Sette 270', 'Vario+'], popular: true },
    { brand: 'Commandante', models: ['C40 MK4', 'C40 MK3'], popular: true },
    { brand: '1Zpresso', models: ['JX-Pro', 'J-Max', 'Q2', 'X-Pro'], popular: true },
    { brand: 'Fellow', models: ['Ode Gen 2', 'Opus'], popular: true },
    { brand: 'Timemore', models: ['Chestnut C3', 'Chestnut C2', 'Sculptor 064'], popular: true },
    { brand: 'OXO', models: ['Brew Conical Burr Grinder'] },
    { brand: 'Hario', models: ['Skerton Pro', 'Mini Mill'] },
    { brand: 'Breville', models: ['Smart Grinder Pro', 'Dose Control Pro'] },
    { brand: 'Eureka', models: ['Mignon Specialita', 'Mignon Silenzio'] },
    { brand: 'DF64', models: ['Gen 2', 'Gen 3'] },
    { brand: 'Rhinowares', models: ['Compact Hand Grinder'] },
    { brand: 'Generic', models: ['Hand Grinder', 'Blade Grinder'] }
  ],
  brewer: [
    { brand: 'Hario', models: ['V60 Dripper (Size 01)', 'V60 Dripper (Size 02)', 'Switch (Size 3)'], popular: true },
    { brand: 'Kalita', models: ['Wave 155', 'Wave 185'], popular: true },
    { brand: 'Chemex', models: ['Classic 6-Cup', 'Classic 8-Cup', 'Classic 10-Cup'], popular: true },
    { brand: 'AeroPress', models: ['Original', 'Go', 'Clear'], popular: true },
    { brand: 'Bodum', models: ['Chambord French Press', 'Brazil French Press'], popular: true },
    { brand: 'Breville', models: ['Barista Express (Espresso)', 'Bambino Plus (Espresso)'], popular: true },
    { brand: 'Fellow', models: ['Stagg X Dripper', 'Clara French Press'] },
    { brand: 'Bialetti', models: ['Moka Express', 'Brikka'] },
    { brand: 'Technivorm', models: ['Moccamaster KBG', 'Moccamaster CDT'] },
    { brand: 'Origami', models: ['Dripper (with Hario/Kalita filters)'] },
    { brand: 'Clever', models: ['Coffee Dripper'] },
    { brand: 'Espro', models: ['P3 French Press', 'P5 French Press'] },
    { brand: 'Flair', models: ['58 (Manual Espresso)', 'Pro 2 (Manual Espresso)'] },
    { brand: 'Gaggia', models: ['Classic Pro (Espresso)'] },
    { brand: 'Rancilio', models: ['Silvia (Espresso)'] }
  ]
}

export function getBrandsForType(type: EquipmentType): string[] {
  return [...EQUIPMENT_CATALOG[type].map(b => b.brand), OTHER_BRAND]
}

/** Popular brands first, everything else after — used to render optgroups. */
export function getGroupedBrandsForType(type: EquipmentType): { popular: string[]; more: string[] } {
  const brands = EQUIPMENT_CATALOG[type]
  return {
    popular: brands.filter(b => b.popular).map(b => b.brand),
    more: brands.filter(b => !b.popular).map(b => b.brand)
  }
}

export function getModelsForBrand(type: EquipmentType, brand: string): string[] {
  return EQUIPMENT_CATALOG[type].find(b => b.brand === brand)?.models || []
}

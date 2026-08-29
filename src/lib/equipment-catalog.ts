/**
 * Curated brand/model catalog for the "Add Equipment" form. Drives the
 * brand -> model dropdown cascade so users pick from a known list instead
 * of free-typing brand/model (which invited typos and inconsistent naming).
 *
 * This is a starting catalog, not an exhaustive one — every type includes
 * an "Other" brand with a free-text model so uncommon gear is never
 * blocked. Models under a listed brand are informational; only roasters
 * and brewers with matching hand-tuned prompts (see ROASTER_PROMPTS in
 * roast-planning/route.ts and BREWING_PROMPTS in brew-recipe/route.ts) get
 * deterministic/hand-tuned AI treatment — everything else still works via
 * the AI-researched equipment profile cache (see equipment-ai-profile.ts).
 */

export type EquipmentType = 'roaster' | 'grinder' | 'brewer'

export const OTHER_BRAND = 'Other'

export interface CatalogBrand {
  brand: string
  models: string[]
}

export const EQUIPMENT_CATALOG: Record<EquipmentType, CatalogBrand[]> = {
  roaster: [
    { brand: 'Fresh Roast', models: ['SR800', 'SR540'] },
    { brand: 'Behmor', models: ['1600 Plus'] },
    { brand: 'Hottop', models: ['KN-8828B-2K+'] },
    { brand: 'Gene Cafe', models: ['CBR-101'] },
    { brand: 'Aillio', models: ['Bullet R1 V2'] }
  ],
  grinder: [
    { brand: 'Baratza', models: ['Encore', 'Virtuoso+'] },
    { brand: 'Commandante', models: ['C40'] },
    { brand: 'OXO', models: ['Brew Conical Burr Grinder'] },
    { brand: '1Zpresso', models: ['JX-Pro', 'Q2'] },
    { brand: 'Generic', models: ['Hand Grinder'] }
  ],
  brewer: [
    { brand: 'Hario', models: ['V60 Dripper (Size 01)', 'V60 Dripper (Size 02)', 'Switch (Size 3)'] },
    { brand: 'Kalita', models: ['Wave 155', 'Wave 185'] },
    { brand: 'Chemex', models: ['Classic 6-Cup', 'Classic 8-Cup', 'Classic 10-Cup'] },
    { brand: 'AeroPress', models: ['Original', 'Go', 'Clear'] },
    { brand: 'Bodum', models: ['Chambord French Press', 'Brazil French Press'] },
    { brand: 'Bialetti', models: ['Moka Express', 'Brikka'] },
    { brand: 'Breville', models: ['Barista Express (Espresso)', 'Bambino Plus (Espresso)'] }
  ]
}

export function getBrandsForType(type: EquipmentType): string[] {
  return [...EQUIPMENT_CATALOG[type].map(b => b.brand), OTHER_BRAND]
}

export function getModelsForBrand(type: EquipmentType, brand: string): string[] {
  return EQUIPMENT_CATALOG[type].find(b => b.brand === brand)?.models || []
}

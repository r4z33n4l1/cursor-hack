/**
 * Open Food Facts client — the ONE genuinely real network call in V1
 * (spec §2 "what we never fake" / §9.1C). Unknown food barcodes fall through
 * here so scanning any grocery item on earth actually works, live.
 *
 * Every failure mode returns null — this must never crash the scan flow.
 */

import type { Product } from '@/engine/types';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_FIELDS = 'product_name,brands,ingredients_text,ingredients,image_front_url';
const OFF_TIMEOUT_MS = 4000;
const OFF_USER_AGENT = 'Expecta - iOS - hackathon build';

interface OFFIngredient {
  text?: string;
  id?: string;
}

interface OFFProductPayload {
  product_name?: string;
  brands?: string;
  ingredients_text?: string;
  ingredients?: OFFIngredient[];
  image_front_url?: string;
}

interface OFFResponse {
  status?: number;
  product?: OFFProductPayload;
}

/**
 * Fetch a product from Open Food Facts by barcode. 4s hard timeout.
 * Returns a mapped Product (category 'food') or null on any error/miss.
 */
export async function fetchOFFProduct(barcode: string): Promise<Product | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);
  try {
    const url = `${OFF_BASE_URL}/${encodeURIComponent(barcode)}.json?fields=${OFF_FIELDS}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': OFF_USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const json = (await response.json()) as OFFResponse;
    if (json.status !== 1 || !json.product) return null;

    return mapOFFProduct(barcode, json.product);
  } catch {
    // Timeout, offline, bad JSON, anything — the scan flow falls back to
    // the designed "unknown product" state instead of crashing.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function mapOFFProduct(barcode: string, payload: OFFProductPayload): Product | null {
  const name = cleanString(payload.product_name);
  const brand = firstListItem(payload.brands) ?? 'Unknown brand';
  const ingredients = extractIngredients(payload);

  // A product with neither a name nor ingredients gives the engine and the
  // UI nothing to work with — treat as a miss.
  if (!name && ingredients.length === 0) return null;

  return {
    barcode,
    name: name ?? `Product ${barcode}`,
    brand,
    category: 'food',
    ingredients,
    imageHint: '🛒',
  };
}

function extractIngredients(payload: OFFProductPayload): string[] {
  const fromText = cleanString(payload.ingredients_text);
  if (fromText) {
    return fromText
      .split(/[,;]/)
      .map((part) => part.replace(/[.]+$/, '').trim())
      .filter((part) => part.length > 0);
  }
  if (Array.isArray(payload.ingredients)) {
    return payload.ingredients
      .map((ing) => cleanString(ing.text) ?? cleanString(ing.id?.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')))
      .filter((text): text is string => !!text);
  }
  return [];
}

function firstListItem(value: string | undefined): string | null {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const first = cleaned.split(',')[0]?.trim();
  return first && first.length > 0 ? first : null;
}

function cleanString(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

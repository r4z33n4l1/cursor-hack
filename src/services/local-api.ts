/**
 * LocalExpectaAPI — the V1 "backend". Seed database + local verdict engine
 * + fake network physics, wearing a production API's clothes.
 *
 * The one real network call: unknown retail barcodes fall through to a live
 * Open Food Facts lookup (behind the LIVE_OFF flag + settings toggle).
 */

import type { AnalysisResult, Product, ProductCategory, Stage, StageResult } from '@/engine/types';
import { STAGE_LABELS } from '@/engine/types';
import { useSettings } from '@/stores/settings';
import type { AnalysisEvent, ExpectaAPI, WeeklyTip } from './api';
import { findSeedProduct, findWeeklyTip, getSeedProducts, runEngineAnalyze } from './engine-bridge';
import {
  NETWORK_TIMINGS,
  createJitter,
  hashSeed,
  simulateLatency,
  sleep,
} from './fake-network';
import { LIVE_OFF_ENABLED } from './flags';
import { fetchOFFProduct } from './openfoodfacts';

/**
 * Believable database names flashed during the crossref stage, per category.
 * These are the real sources our hand-curated rules were written from (§9) —
 * the fakery is infrastructure, never evidence.
 */
const CROSSREF_SOURCES: Record<ProductCategory, string[]> = {
  medicine: ['openFDA PLLR', 'DailyMed SPL', 'LactMed'],
  supplement: ['openFDA PLLR', 'NIH ODS', 'LactMed'],
  skincare: ['DailyMed SPL', 'INCI registry', 'LactMed'],
  food: ['Open Food Facts', 'openFDA', 'LactMed'],
  household: ['DailyMed SPL', 'openFDA', 'LactMed'],
};

const MAX_SEARCH_RESULTS = 25;

export class LocalExpectaAPI implements ExpectaAPI {
  async *analyze(barcode: string, stage: Stage): AsyncGenerator<AnalysisEvent, AnalysisResult | null> {
    const scale = delayScale();
    const jitter = createJitter(hashSeed(barcode));
    const timings = NETWORK_TIMINGS.pipeline;

    // --- Resolve the barcode ------------------------------------------------
    let product = findSeedProduct(barcode);
    let resolvedLive = false;

    if (!product && liveLookupsAllowed() && couldBeRetailBarcode(barcode)) {
      // The one genuinely real network call. Its latency is real too.
      product = await fetchOFFProduct(barcode);
      resolvedLive = product !== null;
    }

    if (!product) {
      // Even a miss should feel like the server looked.
      await sleep(Math.max(200, jitter(600, 180)) * scale);
      return null;
    }

    // --- 1. identified (fast — snappier still if a real fetch already ran) --
    const identifiedMs = jitter(timings.identified.base, timings.identified.spread) * (resolvedLive ? 0.3 : 1);
    await sleep(Math.max(80, identifiedMs) * scale);
    yield { type: 'identified', product };

    // --- 2. parsing ---------------------------------------------------------
    await sleep(Math.max(120, jitter(timings.parsing.base, timings.parsing.spread)) * scale);
    yield { type: 'parsing', ingredientCount: product.ingredients.length };

    // --- 3. crossref (visibly the longest — "querying three databases") -----
    const result = withReasoning(runEngineAnalyze(product, stage));
    let crossrefMs = jitter(
      (timings.crossref.min + timings.crossref.max) / 2,
      (timings.crossref.max - timings.crossref.min) / 2,
    );
    if (!isDemoMode() && Math.random() < NETWORK_TIMINGS.slowAnalysisChance) {
      // The occasional "slow analysis" — real backends have bad days too.
      crossrefMs += NETWORK_TIMINGS.slowAnalysisExtraMs;
    }
    await sleep(Math.max(300, crossrefMs) * scale);
    yield {
      type: 'crossref',
      matchedCount: result.perStage[stage].findings.length,
      sources: CROSSREF_SOURCES[product.category],
    };

    // --- 4. verdict ---------------------------------------------------------
    await sleep(Math.max(100, jitter(timings.verdict.base, timings.verdict.spread)) * scale);
    yield { type: 'verdict', result };

    return result;
  }

  async searchProducts(query: string): Promise<Product[]> {
    await simulatedLatency();
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return [];
    return getSeedProducts()
      .filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }

  async getProduct(barcode: string): Promise<Product | null> {
    await simulatedLatency();
    return findSeedProduct(barcode);
  }

  async getWeeklyTip(week: number): Promise<WeeklyTip | null> {
    await simulatedLatency();
    return findWeeklyTip(week);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDemoMode(): boolean {
  return useSettings.getState().demoMode;
}

function delayScale(): number {
  return isDemoMode() ? NETWORK_TIMINGS.demoModeScale : 1;
}

function liveLookupsAllowed(): boolean {
  // Demo mode never gambles on live network in front of judges.
  return LIVE_OFF_ENABLED && useSettings.getState().liveLookupsEnabled && !isDemoMode();
}

function simulatedLatency(): Promise<void> {
  const scale = delayScale();
  return simulateLatency(NETWORK_TIMINGS.latency.min * scale, NETWORK_TIMINGS.latency.max * scale);
}

/** EAN-8/UPC-A/EAN-13 style all-digit codes could be food — worth a live try. */
function couldBeRetailBarcode(barcode: string): boolean {
  return /^\d{8,14}$/.test(barcode.trim());
}

/**
 * The reasoning paragraphs are the services layer's job (see AnalysisResult
 * in engine/types). If the engine already produced prose, keep it; otherwise
 * assemble calm, plain-English paragraphs from the curated rule copy.
 */
function withReasoning(result: AnalysisResult): AnalysisResult {
  if (result.reasoning.length > 0) return result;
  return { ...result, reasoning: buildReasoning(result) };
}

const STAGE_PHRASE: Record<Stage, string> = {
  ttc: 'while you are trying to conceive',
  t1: 'in your first trimester',
  t2: 'in your second trimester',
  t3: 'in your third trimester',
  nursing: 'while nursing',
};

function buildReasoning(result: AnalysisResult): string[] {
  const { product, scannedStage } = result;
  const stageResult = result.perStage[scannedStage];
  const paragraphs: string[] = [];

  if (product.reasoningTemplate) {
    paragraphs.push(product.reasoningTemplate);
  }

  paragraphs.push(...verdictParagraphs(product, stageResult));
  return paragraphs;
}

function verdictParagraphs(product: Product, stageResult: StageResult): string[] {
  const phrase = STAGE_PHRASE[stageResult.stage];
  const flagged = stageResult.findings.filter(
    (f) => f.verdict === 'avoid' || f.verdict === 'caution',
  );
  const worst = flagged[0];

  switch (stageResult.verdict) {
    case 'safe': {
      return [
        `${product.name} looks good for you right now. We checked every listed ingredient against clinical safety data and found nothing of concern ${phrase}.`,
      ];
    }
    case 'caution': {
      const names = flagged.slice(0, 2).map((f) => f.rule.names[0]).join(' and ');
      const out = [
        `${product.name} is mostly fine, but ${names || 'one ingredient'} deserves a closer look ${phrase}.`,
      ];
      if (worst) {
        out.push(appendDose(worst.rule.summary, worst.rule.maxSafeDose));
      }
      return out;
    }
    case 'avoid': {
      const name = worst?.rule.names[0] ?? 'a flagged ingredient';
      const out = [`We'd set ${product.name} aside for now — it contains ${name}, which is best avoided ${phrase}.`];
      if (worst) {
        out.push(worst.rule.summary);
      }
      return out;
    }
    case 'unknown':
    default: {
      return [
        `We couldn't confidently match enough of ${product.name}'s ingredients to our safety database, so we won't guess. It's been added to our research queue — in the meantime, your provider is the best call.`,
      ];
    }
  }
}

function appendDose(summary: string, maxSafeDose?: string): string {
  if (!maxSafeDose) return summary;
  const sep = summary.endsWith('.') ? ' ' : '. ';
  return `${summary}${sep}A good rule of thumb: ${maxSafeDose.toLowerCase()}.`;
}

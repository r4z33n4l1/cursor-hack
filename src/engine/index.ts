/**
 * The local verdict engine. Matches label ingredients against the curated
 * rule database and computes worst-ingredient-wins verdicts for every stage,
 * so the verdict screen's stage slider scrubs with zero recompute.
 */

import rulesJson from '@/data/ingredients.rules.json';
import type {
  AnalysisResult,
  IngredientFinding,
  IngredientRule,
  Product,
  Stage,
  StageResult,
  Verdict,
} from './types';
import { STAGES, VERDICT_RANK } from './types';

const RULES = rulesJson as IngredientRule[];

/**
 * Fatty/topical alcohols are chemically unrelated to drinking alcohol; rewrite
 * them to distinct tokens so the "alcohol" rule can never false-positive.
 */
const ALCOHOL_REWRITES: [RegExp, string][] = [
  [/isopropyl alcohol/g, 'isopropanol'],
  [/cetyl alcohol/g, 'cetylalcohol'],
  [/stearyl alcohol/g, 'stearylalcohol'],
  [/cetearyl alcohol/g, 'cetearylalcohol'],
  [/benzyl alcohol/g, 'benzylalcohol'],
  [/ethanol denatured|denatured ethanol|denatured alcohol|sd alcohol/g, 'denaturedalcohol'],
];

/**
 * Common excipients/fillers with no pregnancy relevance. They count as
 * "recognized" (so the honesty rule doesn't punish an ordinary label) but
 * produce no finding.
 */
const BENIGN_FILLERS = [
  'water', 'aqua', 'purified water', 'glycerin', 'glycerol', 'dimethicone',
  'phenoxyethanol', 'tocopherol', 'corn starch', 'starch', 'hypromellose',
  'magnesium stearate', 'polyethylene glycol', 'stearic acid',
  'croscarmellose sodium', 'microcrystalline cellulose', 'cellulose',
  'glucose syrup', 'pectin', 'citric acid', 'natural flavor',
  'natural flavors', 'natural berry flavor', 'salt', 'sea salt', 'cream',
  'milk', 'pasteurized cultured milk', 'enzymes', 'vegetable broth',
  'sulfites', 'butyl acetate', 'nitrocellulose', 'adipic acid',
  'stearalkonium hectorite', 'coconut alkanes', 'jojoba esters',
  'shea butter', 'panthenol', 'zinc pca', 'caprylic triglyceride',
  'capric triglyceride', 'fragrance', 'parfum', 'silica', 'talc',
  'sodium chloride', 'xanthan gum', 'gellan gum', 'carbomer',
  'isopropanol', 'cetylalcohol', 'stearylalcohol', 'cetearylalcohol',
  'benzylalcohol', 'denaturedalcohol', 'benzophenone-1',
];

/** "Retinol 0.5% (encapsulated)" → "retinol" — lowercase, no parentheticals/doses. */
function normalize(label: string): string {
  let out = label
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(mg|mcg|g|iu|ml|%)\b/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const [pattern, replacement] of ALCOHOL_REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Whole-token alias containment: "salicylic acid" hits, "chloride"≠"sodium chloride" rule. */
function tokenMatch(normalized: string, alias: string): boolean {
  if (normalized === alias) return true;
  const padded = ` ${normalized} `;
  return padded.includes(` ${alias} `);
}

export function matchIngredients(
  labelIngredients: string[],
  rules: IngredientRule[] = RULES,
): { findings: { rule: IngredientRule; matchedText: string }[]; unmatched: string[] } {
  const findings: { rule: IngredientRule; matchedText: string }[] = [];
  const matchedRuleIds = new Set<string>();
  const unmatched: string[] = [];

  for (const raw of labelIngredients) {
    const normalized = normalize(raw);
    let hit = false;
    for (const rule of rules) {
      if (matchedRuleIds.has(rule.id)) continue;
      if (rule.names.some((alias) => tokenMatch(normalized, alias))) {
        matchedRuleIds.add(rule.id);
        findings.push({ rule, matchedText: raw });
        hit = true;
        break;
      }
    }
    // Recognized excipients are neither findings nor honesty-rule strikes.
    if (!hit && BENIGN_FILLERS.some((f) => tokenMatch(normalized, f))) hit = true;
    if (!hit) unmatched.push(raw);
  }

  return { findings, unmatched };
}

function worstVerdict(findings: IngredientFinding[], unmatchedRatio: number): Verdict {
  // Every ingredient recognized as a benign excipient, nothing flagged → safe.
  if (findings.length === 0 && unmatchedRatio === 0) return 'safe';
  if (findings.length === 0) return 'unknown';
  const worst = findings.reduce<Verdict>(
    (acc, f) => (VERDICT_RANK[f.verdict] < VERDICT_RANK[acc] ? f.verdict : acc),
    'safe',
  );
  // Honesty rule: mostly-unrecognized label + nothing flagged → don't fake confidence.
  if (worst === 'safe' && unmatchedRatio >= 0.4) return 'unknown';
  return worst;
}

export function analyze(product: Product, scannedStage: Stage): AnalysisResult {
  const { findings, unmatched } = matchIngredients(product.ingredients);
  const unmatchedRatio =
    product.ingredients.length === 0 ? 1 : unmatched.length / product.ingredients.length;

  const perStage = {} as Record<Stage, StageResult>;
  for (const stage of STAGES) {
    const stageFindings: IngredientFinding[] = findings
      .map(({ rule, matchedText }) => ({ rule, matchedText, verdict: rule.verdicts[stage] }))
      .sort(
        (a, b) =>
          VERDICT_RANK[a.verdict] - VERDICT_RANK[b.verdict] || b.rule.severity - a.rule.severity,
      );
    perStage[stage] = {
      stage,
      verdict: worstVerdict(stageFindings, unmatchedRatio),
      findings: stageFindings,
      unmatched,
    };
  }

  return {
    product,
    scannedStage,
    perStage,
    // Prose is assembled by the services layer (it owns tone + streaming).
    reasoning: [],
    analyzedAt: Date.now(),
  };
}

export * from './types';

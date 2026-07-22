/**
 * Shared domain model for Expecta.
 * This file is the contract between the verdict engine (src/engine),
 * the fake-backend services (src/services), the stores (src/stores),
 * and every screen. Keep it dependency-free.
 */

/** Pregnancy journey stage. `ttc` = trying to conceive. */
export type Stage = 'ttc' | 't1' | 't2' | 't3' | 'nursing';

export const STAGES: Stage[] = ['ttc', 't1', 't2', 't3', 'nursing'];

export const STAGE_LABELS: Record<Stage, string> = {
  ttc: 'Trying',
  t1: 'Trimester 1',
  t2: 'Trimester 2',
  t3: 'Trimester 3',
  nursing: 'Nursing',
};

export type Verdict = 'safe' | 'caution' | 'avoid' | 'unknown';

export type ProductCategory =
  | 'medicine'
  | 'skincare'
  | 'food'
  | 'supplement'
  | 'household';

/** One ingredient's safety rule across all stages. Lives in ingredients.rules.json. */
export interface IngredientRule {
  id: string;
  /** Canonical name first, then aliases/synonyms as they appear on labels (lowercase). */
  names: string[];
  verdicts: Record<Stage, Verdict>;
  /** 1 = mild concern, 2 = moderate, 3 = serious. Breaks ties between same-verdict ingredients. */
  severity: 1 | 2 | 3;
  evidence: 'strong' | 'limited' | 'consensus';
  /** One calm sentence for list rows. */
  summary: string;
  /** 2–4 sentences of plain-language reasoning for the detail sheet. */
  detail: string;
  /** e.g. "Up to 200 mg caffeine per day". Optional. */
  maxSafeDose?: string;
}

/** A scannable product. Lives in products.seed.json. */
export interface Product {
  barcode: string;
  name: string;
  brand: string;
  category: ProductCategory;
  /** Label-order ingredient list, as printed (raw strings; matching is the engine's job). */
  ingredients: string[];
  /** SF Symbol name or emoji used as the product visual. */
  imageHint?: string;
  /** Optional hand-written opening line for the streamed verdict prose. */
  reasoningTemplate?: string;
  /** Names of safer alternative products, if any. */
  alternatives?: string[];
}

/** The engine's finding for a single matched ingredient at a single stage. */
export interface IngredientFinding {
  rule: IngredientRule;
  /** The raw label string that matched. */
  matchedText: string;
  verdict: Verdict;
}

/** Full analysis result for a product at one stage. */
export interface StageResult {
  stage: Stage;
  verdict: Verdict;
  /** Findings sorted worst-first (avoid > caution > unknown > safe, then severity desc). */
  findings: IngredientFinding[];
  /** Raw label strings the engine could not match to any rule. */
  unmatched: string[];
}

/** Product analysis across every stage (precomputed so the stage slider scrubs live). */
export interface AnalysisResult {
  product: Product;
  /** The stage the user was in when they scanned. */
  scannedStage: Stage;
  perStage: Record<Stage, StageResult>;
  /** Streamed prose paragraphs for the scanned stage (services layer generates these). */
  reasoning: string[];
  analyzedAt: number;
}

/** A history entry persisted after each scan. */
export interface ScanRecord {
  id: string;
  barcode: string;
  productName: string;
  brand: string;
  category: ProductCategory;
  verdict: Verdict;
  stage: Stage;
  scannedAt: number;
  imageHint?: string;
}

/** User profile. Stage is derived from dueDate / nursing flag, never stored raw. */
export interface UserProfile {
  name?: string;
  /** ISO date string. Mutually exclusive with `nursing` in practice. */
  dueDate?: string;
  nursing: boolean;
  /** Set when the user picked "trying to conceive". */
  ttc: boolean;
  onboarded: boolean;
}

/** Verdict severity order, worst first. Shared by engine sort + UI. */
export const VERDICT_RANK: Record<Verdict, number> = {
  avoid: 0,
  caution: 1,
  unknown: 2,
  safe: 3,
};

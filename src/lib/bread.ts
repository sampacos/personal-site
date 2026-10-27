/**
 * Bread dough calculator — a faithful port of the "Dough Builder" sheet
 * (sheet 1) of `APC - Bread 👍🏻.xlsx`.
 *
 * Conventions carried over from the spreadsheet:
 * - All percentage inputs and derived percentages are expressed in percentage
 *   points (80 means 80%), never as fractions.
 * - All gram amounts are absolute weights in grams.
 * - Su ("universal sugar") is total sucrose divided by total dough weight.
 * - Hu ("universal water") is total water (including water implicit in
 *   ingredients like flour, eggs, butter) divided by total dough weight.
 * - Cu ("universal concentration") is Su / Hu, an indirect approximation of
 *   osmotic stress in the dough.
 * - The "multiplicative factor" is the ratio of unfermented flour (100) to
 *   previously fermented flour used as the inoculant in a fermentative step.
 * - Fermentation time estimates assume a constant 28° to 30°C.
 *
 * Each exported formula below references the spreadsheet cell it ports so the
 * port stays auditable against the source file.
 */

export interface BatchInputs {
  /** B15 — weight of a single unit (loaf), in grams. */
  unitWeight: number;
  /** B16 — number of units to bake. */
  quantityOfUnits: number;
  /** B17 — percentage of extra total dough expected to be lost during processing. */
  wasteFactor: number;
}

export interface MaintenanceStarterInputs {
  /** B20 — hydration of the maintenance starter, in % of its flour. */
  starterHydration: number;
  /** B21 — ratio of unfermented flour (100) to previously fermented flour. */
  multiplicativeFactor: number;
}

export interface DoughStarterInputs {
  /** B27 — optional sugar, as % of total flour in the dough starter stage. */
  sugar: number;
  /** B28 — hydration of the dough starter, in % of its flour. */
  starterHydration: number;
  /** B29 — ratio of unfermented flour (100) to previously fermented flour. */
  multiplicativeFactor: number;
  /** B30 — total flour fermented during the starter stages, in % of total flour. */
  preFermentedFlour: number;
}

export interface DoughIngredients {
  /** B36 — water, % of total flour. */
  water: number;
  /** B37 — milk, % of total flour. */
  milk: number;
  /** B38 — heavy cream, % of total flour. */
  heavyCream: number;
  /** B39 — egg, % of total flour. */
  egg: number;
  /** B40 — egg yolk, % of total flour. */
  eggYolk: number;
  /** B41 — butter, % of total flour. */
  butter: number;
  /** B42 — sugar, % of total flour. */
  sugar: number;
  /** B43 — honey, % of total flour. */
  honey: number;
  /** B44 — salt, % of total flour. */
  salt: number;
}

export interface CalculatorState {
  batch: BatchInputs;
  maintenanceStarter: MaintenanceStarterInputs;
  doughStarter: DoughStarterInputs;
  dough: DoughIngredients;
}

export interface BuildRow {
  ingredient: string;
  /** Percentage relative to the flour in the same build (percentage points). */
  percent: number;
  /** Absolute weight in grams. */
  grams: number;
}

export interface BuildTable {
  title: string;
  rows: BuildRow[];
  totalPercent: number;
  totalGrams: number;
}

export interface UniversalMetrics {
  /** Su — universal sugar, % of total dough weight. */
  su: number;
  /** Hu — universal water, % of total dough weight. */
  hu: number;
  /** Cu — universal concentration, Su / Hu × 100. */
  cu: number;
  /** Ideal Hu range displayed in the spreadsheet (percentage points). */
  idealHuRange: readonly [number, number];
  /** Ideal Cu range displayed in the spreadsheet (percentage points). */
  idealCuRange: readonly [number, number];
}

export interface FermentationWindow {
  label: string;
  fromHours: number;
  toHours: number;
}

export interface FermentationEstimates {
  maintenanceStarter: FermentationWindow;
  doughStarter: FermentationWindow;
  bulk: FermentationWindow;
  proof: FermentationWindow;
}

export interface CalculatorResult {
  /** F15 — total dough weight for the batch, in grams. */
  batchSizeGrams: number;
  maintenanceStarter: BuildTable;
  doughStarter: BuildTable;
  finalDough: BuildTable;
  doughStarterMetrics: UniversalMetrics;
  finalDoughMetrics: UniversalMetrics;
  fermentation: FermentationEstimates;
}

/** F35/F27 — flour is always the 100% reference. */
const FLOUR_PERCENT = 100;

/** Implicit water contents used by I36 (Hu of the final dough). */
const WATER_CONTENT = {
  flour: 0.13,
  milk: 0.87,
  heavyCream: 0.54,
  egg: 0.74,
  eggYolk: 0.48,
  butter: 0.14,
  honey: 0.2,
} as const;

/** Ideal ranges displayed in the spreadsheet (J28, J29, J36, J37). */
const IDEAL_HU_RANGE = [28, 35] as const;
const IDEAL_CU_RANGE_DOUGH_STARTER = [30, 40] as const;
const IDEAL_CU_RANGE_FINAL_DOUGH = [25, 50] as const;

/**
 * Division guarded against zero denominators. The spreadsheet shows #DIV/0!
 * for these cases; we return 0 so the UI never renders NaN/Infinity.
 */
function div(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Default state — the exact values pre-filled in the "Dough Builder" sheet.
 */
export const DEFAULT_CALCULATOR_STATE: CalculatorState = {
  batch: { unitWeight: 355, quantityOfUnits: 4, wasteFactor: 2 },
  maintenanceStarter: { starterHydration: 80, multiplicativeFactor: 1 },
  doughStarter: {
    sugar: 0,
    starterHydration: 75,
    multiplicativeFactor: 2,
    preFermentedFlour: 13.5,
  },
  dough: {
    water: 80,
    milk: 0,
    heavyCream: 0,
    egg: 0,
    eggYolk: 0,
    butter: 0,
    sugar: 0,
    honey: 0,
    salt: 2,
  },
};

/**
 * Ports the entire "Dough Builder" calculation chain. Cell references from the
 * spreadsheet are noted inline.
 */
export function calculateBread(state: CalculatorState): CalculatorResult {
  const m = state.maintenanceStarter;
  const d = state.doughStarter;
  const dg = state.dough;

  // ---- Maintenance starter percentages (F20:F23) ----
  const mFlourPct = FLOUR_PERCENT; // F20
  const mWaterPct = m.starterHydration; // F21 = B20
  // F22 = (F20/B21)+((F20/B21)*(F21/F20))
  const mInoculantPct = div(mFlourPct, m.multiplicativeFactor);
  const mStarterPct = mInoculantPct + mInoculantPct * (mWaterPct / mFlourPct);
  const mTotalPct = mFlourPct + mWaterPct + mStarterPct; // F23 = SUM(F20:F22)

  // ---- Dough starter percentages (F27:F31) ----
  const dsFlourPct = FLOUR_PERCENT; // F27
  // F28 = ((F27+(F27/B29))*(B28/F27))-((F21/(F20+F21))*F29)
  // F29 = (F27/B29)+((F27/B29)*(F21/F27))
  const dsInoculantPct = div(dsFlourPct, d.multiplicativeFactor);
  const dsStarterPct = dsInoculantPct + dsInoculantPct * (mWaterPct / dsFlourPct);
  const dsWaterPct =
    (dsFlourPct + div(dsFlourPct, d.multiplicativeFactor)) * (d.starterHydration / dsFlourPct) -
    (mWaterPct / (mFlourPct + mWaterPct)) * dsStarterPct;
  // F30 = (B27/F27)*((F27/B29)+F27)
  const dsSugarPct = (d.sugar / dsFlourPct) * (dsInoculantPct + dsFlourPct);
  const dsTotalPct = dsFlourPct + dsWaterPct + dsStarterPct + dsSugarPct; // F31 = SUM(F27:F30)

  // ---- Final dough percentages (F35:F46) ----
  const flourPct = dsFlourPct; // F35 = F27
  const preFermented = d.preFermentedFlour; // B30
  // Ratio of unfermented flour to pre-fermented flour; 0 when nothing is
  // pre-fermented (the spreadsheet shows #DIV/0! here).
  const unfermentedRatio = preFermented > 0 ? (FLOUR_PERCENT - preFermented) / preFermented : 0;
  // F36 = ((B30/(F35-B30))*F35)*(F31/(F27+(F29*(F20/(F20+F21)))))
  const starterPct =
    div(preFermented, flourPct - preFermented) *
    flourPct *
    (dsTotalPct / (dsFlourPct + dsStarterPct * (mFlourPct / (mFlourPct + mWaterPct))));
  // F37 = ((B36/F35)*(F35+(B30/(F35-B30)*F35)))-(((F28+((F21/(F21+F20))*F29))/F31)*F36)
  const enrichedBasis = div(preFermented, flourPct - preFermented) * flourPct + flourPct;
  const waterPct =
    (dg.water / flourPct) * enrichedBasis -
    ((dsWaterPct + (mWaterPct / (mWaterPct + mFlourPct)) * dsStarterPct) / dsTotalPct) * starterPct;
  // F38, F39, F40, F41, F44 = (Bn/F35)*((B30/(F35-B30)*F35)+F35)
  const milkPct = (dg.milk / flourPct) * enrichedBasis;
  const heavyCreamPct = (dg.heavyCream / flourPct) * enrichedBasis;
  const eggPct = (dg.egg / flourPct) * enrichedBasis;
  const eggYolkPct = (dg.eggYolk / flourPct) * enrichedBasis;
  const butterPct = (dg.butter / flourPct) * enrichedBasis;
  const honeyPct = (dg.honey / flourPct) * enrichedBasis;
  // F43 = ((B42/F35)*(F35+(B30/(F35-B30)*100)))-((F30/F31)*F36)
  const sugarPct = (dg.sugar / flourPct) * enrichedBasis - (dsSugarPct / dsTotalPct) * starterPct;
  // F45 = (B44/F35)*((B30/(F35-B30)*F35)+F35)
  const saltPct = (dg.salt / flourPct) * enrichedBasis;
  const finalTotalPct =
    flourPct +
    starterPct +
    waterPct +
    milkPct +
    heavyCreamPct +
    eggPct +
    eggYolkPct +
    butterPct +
    sugarPct +
    honeyPct +
    saltPct; // F46 = SUM(F34:F45)

  // B45 = SUM(B35:B44) — total dough ingredient values as entered.
  const totalDoughInputPct =
    flourPct +
    dg.water +
    dg.milk +
    dg.heavyCream +
    dg.egg +
    dg.eggYolk +
    dg.butter +
    dg.sugar +
    dg.honey +
    dg.salt;

  // ---- Batch size (F15 = B15*B16*((B17+B35)/B35)) ----
  const batchSizeGrams =
    state.batch.unitWeight *
    state.batch.quantityOfUnits *
    ((state.batch.wasteFactor + flourPct) / flourPct);

  // ---- Gram tables ----
  // Final dough grams scale: L35 = (F15/F46)*F35
  const finalScale = div(batchSizeGrams, finalTotalPct);
  // Dough starter grams scale: L27 = (L36/F31)*F27, where L36 is the final
  // dough's starter grams.
  const dsScale = div(finalScale * starterPct, dsTotalPct);
  // Maintenance grams scale: L20 = (L29/F23)*F20, where L29 is the dough
  // starter's starter grams (the maintenance starter feeds the dough starter).
  const mScale = div(dsScale * dsStarterPct, mTotalPct);

  const maintenanceStarter: BuildTable = {
    title: 'Maintenance Starter Build',
    rows: [
      { ingredient: 'Flour', percent: mFlourPct, grams: mScale * mFlourPct },
      { ingredient: 'Water', percent: mWaterPct, grams: mScale * mWaterPct },
      { ingredient: 'Starter', percent: mStarterPct, grams: mScale * mStarterPct },
    ],
    totalPercent: mTotalPct,
    totalGrams: mScale * mTotalPct,
  };

  const doughStarter: BuildTable = {
    title: 'Dough Starter Build',
    rows: [
      { ingredient: 'Flour', percent: dsFlourPct, grams: dsScale * dsFlourPct },
      { ingredient: 'Water', percent: dsWaterPct, grams: dsScale * dsWaterPct },
      { ingredient: 'Starter', percent: dsStarterPct, grams: dsScale * dsStarterPct },
      { ingredient: 'Sugar', percent: dsSugarPct, grams: dsScale * dsSugarPct },
    ],
    totalPercent: dsTotalPct,
    totalGrams: dsScale * dsTotalPct,
  };

  const finalDough: BuildTable = {
    title: 'Final Dough',
    rows: [
      { ingredient: 'Flour', percent: flourPct, grams: finalScale * flourPct },
      { ingredient: 'Starter', percent: starterPct, grams: finalScale * starterPct },
      { ingredient: 'Water', percent: waterPct, grams: finalScale * waterPct },
      { ingredient: 'Milk', percent: milkPct, grams: finalScale * milkPct },
      { ingredient: 'Heavy Cream', percent: heavyCreamPct, grams: finalScale * heavyCreamPct },
      { ingredient: 'Egg', percent: eggPct, grams: finalScale * eggPct },
      { ingredient: 'Egg Yolk', percent: eggYolkPct, grams: finalScale * eggYolkPct },
      { ingredient: 'Butter', percent: butterPct, grams: finalScale * butterPct },
      { ingredient: 'Sugar', percent: sugarPct, grams: finalScale * sugarPct },
      { ingredient: 'Honey', percent: honeyPct, grams: finalScale * honeyPct },
      { ingredient: 'Salt', percent: saltPct, grams: finalScale * saltPct },
    ],
    totalPercent: finalTotalPct,
    totalGrams: finalScale * finalTotalPct,
  };

  // ---- Universal metrics ----
  // I27 = (F30/F31)*100
  const dsSu = (dsSugarPct / dsTotalPct) * 100;
  // I28 = (((F27*0.13)+F28+((F27/B29)*0.13)+((F27/B29)*(F28/F27)))/F31)*100
  const dsHu =
    ((dsFlourPct * WATER_CONTENT.flour +
      dsWaterPct +
      dsInoculantPct * WATER_CONTENT.flour +
      dsInoculantPct * (dsWaterPct / dsFlourPct)) /
      dsTotalPct) *
    100;
  const dsCu = (dsSu / dsHu) * 100;

  // I35 = (B42/B45)*100
  const su = (dg.sugar / totalDoughInputPct) * 100;
  // I36 = (((B35*0.13)+B36+(B37*0.87)+(B38*0.54)+(B39*0.74)+(B40*0.48)+(B41*0.14)+(B43*0.2))/B45)*100
  const hu =
    ((flourPct * WATER_CONTENT.flour +
      dg.water +
      dg.milk * WATER_CONTENT.milk +
      dg.heavyCream * WATER_CONTENT.heavyCream +
      dg.egg * WATER_CONTENT.egg +
      dg.eggYolk * WATER_CONTENT.eggYolk +
      dg.butter * WATER_CONTENT.butter +
      dg.honey * WATER_CONTENT.honey) /
      totalDoughInputPct) *
    100;
  const cu = (su / hu) * 100;

  // ---- Fermentation time estimates (at 28° to 30°C) ----
  // Maintenance starter: P20 = B21*2.33, P22 = B21*2.666
  // Dough starter: P27 = B29*2.33, P29 = B29*2.66
  // Bulk: P35 = (((100-B30)/B30)*3)*0.353, P37 = same *4
  // Proof: P39 = (((100-B30)/B30)*3)-P35, P41 = same *4 minus P37
  const fermentation: FermentationEstimates = {
    maintenanceStarter: {
      label: 'Maintenance starter',
      fromHours: m.multiplicativeFactor * 2.33,
      toHours: m.multiplicativeFactor * 2.666,
    },
    doughStarter: {
      label: 'Dough starter',
      fromHours: d.multiplicativeFactor * 2.33,
      toHours: d.multiplicativeFactor * 2.66,
    },
    bulk: {
      label: 'Bulk',
      fromHours: unfermentedRatio * 3 * 0.353,
      toHours: unfermentedRatio * 4 * 0.353,
    },
    proof: {
      label: 'Proof',
      fromHours: unfermentedRatio * 3 - unfermentedRatio * 3 * 0.353,
      toHours: unfermentedRatio * 4 - unfermentedRatio * 4 * 0.353,
    },
  };

  return {
    batchSizeGrams,
    maintenanceStarter,
    doughStarter,
    finalDough,
    doughStarterMetrics: {
      su: dsSu,
      hu: dsHu,
      cu: dsCu,
      idealHuRange: IDEAL_HU_RANGE,
      idealCuRange: IDEAL_CU_RANGE_DOUGH_STARTER,
    },
    finalDoughMetrics: {
      su,
      hu,
      cu,
      idealHuRange: IDEAL_HU_RANGE,
      idealCuRange: IDEAL_CU_RANGE_FINAL_DOUGH,
    },
    fermentation,
  };
}

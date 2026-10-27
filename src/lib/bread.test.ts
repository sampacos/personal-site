import { describe, expect, it } from 'vitest';
import { type CalculatorState, calculateBread, DEFAULT_CALCULATOR_STATE } from './bread';

/**
 * Expected values below are the ones computed by the "Dough Builder" sheet
 * (sheet 1) of `APC - Bread 👍🏻.xlsx` with its pre-filled defaults.
 */ const SPREADSHEET_DEFAULTS = {
  batchSizeGrams: 1448.4,
  maintenanceStarter: {
    percents: [100, 80, 180],
    totalPercent: 360,
    grams: [17.90604396, 14.32483516, 32.23087912],
    totalGrams: 64.46175824,
  },
  doughStarter: {
    percents: [100, 72.5, 90, 0],
    totalPercent: 262.5,
    grams: [71.62417582, 51.92752747, 64.46175824, 0],
    totalGrams: 188.0134615,
  },
  finalDough: {
    percents: [100, 27.31213873, 80.78034682, 0, 0, 0, 0, 0, 0, 0, 2.312138728],
    totalPercent: 210.4046243,
    grams: [688.3879121, 188.0134615, 556.0821429, 0, 0, 0, 0, 0, 0, 0, 15.91648352],
    totalGrams: 1448.4,
  },
  doughStarterMetrics: { su: 0, hu: 48.85714286, cu: 0 },
  finalDoughMetrics: { su: 0, hu: 51.0989011, cu: 0 },
  fermentation: {
    maintenance: [2.33, 2.666],
    doughStarter: [4.66, 5.32],
    bulk: [6.785444444, 9.047259259],
    proof: [12.43677778, 16.58237037],
  },
} as const;

/** Default comparison precision: 6 decimal digits (half-unit 5e-7). */
const PRECISION_DIGITS = 6;

function expectClose(actual: number, expected: number, digits = PRECISION_DIGITS): void {
  expect(actual).toBeCloseTo(expected, digits);
}

describe('calculateBread — spreadsheet defaults', () => {
  const result = calculateBread(DEFAULT_CALCULATOR_STATE);

  it('computes the batch size (F15)', () => {
    expectClose(result.batchSizeGrams, SPREADSHEET_DEFAULTS.batchSizeGrams);
  });

  it('computes the maintenance starter build percentages (F20:F23)', () => {
    const { rows, totalPercent } = result.maintenanceStarter;
    rows.forEach((row, i) => {
      expectClose(row.percent, SPREADSHEET_DEFAULTS.maintenanceStarter.percents[i]);
    });
    expectClose(totalPercent, SPREADSHEET_DEFAULTS.maintenanceStarter.totalPercent);
  });

  it('computes the maintenance starter build grams (L20:L23)', () => {
    const { rows, totalGrams } = result.maintenanceStarter;
    rows.forEach((row, i) => {
      expectClose(row.grams, SPREADSHEET_DEFAULTS.maintenanceStarter.grams[i]);
    });
    expectClose(totalGrams, SPREADSHEET_DEFAULTS.maintenanceStarter.totalGrams);
  });

  it('computes the dough starter build percentages (F27:F31)', () => {
    const { rows, totalPercent } = result.doughStarter;
    rows.forEach((row, i) => {
      expectClose(row.percent, SPREADSHEET_DEFAULTS.doughStarter.percents[i]);
    });
    expectClose(totalPercent, SPREADSHEET_DEFAULTS.doughStarter.totalPercent);
  });

  it('computes the dough starter build grams (L27:L31)', () => {
    const { rows, totalGrams } = result.doughStarter;
    rows.forEach((row, i) => {
      expectClose(row.grams, SPREADSHEET_DEFAULTS.doughStarter.grams[i]);
    });
    expectClose(totalGrams, SPREADSHEET_DEFAULTS.doughStarter.totalGrams);
  });

  it('computes the final dough percentages (F35:F46)', () => {
    const { rows, totalPercent } = result.finalDough;
    rows.forEach((row, i) => {
      expectClose(row.percent, SPREADSHEET_DEFAULTS.finalDough.percents[i]);
    });
    expectClose(totalPercent, SPREADSHEET_DEFAULTS.finalDough.totalPercent);
  });

  it('computes the final dough grams (L35:L46)', () => {
    const { rows, totalGrams } = result.finalDough;
    rows.forEach((row, i) => {
      expectClose(row.grams, SPREADSHEET_DEFAULTS.finalDough.grams[i]);
    });
    expectClose(totalGrams, SPREADSHEET_DEFAULTS.finalDough.totalGrams);
  });

  it('computes universal metrics for the dough starter (I27:I29)', () => {
    const { su, hu, cu } = result.doughStarterMetrics;
    expectClose(su, SPREADSHEET_DEFAULTS.doughStarterMetrics.su);
    expectClose(hu, SPREADSHEET_DEFAULTS.doughStarterMetrics.hu);
    expectClose(cu, SPREADSHEET_DEFAULTS.doughStarterMetrics.cu);
  });

  it('computes universal metrics for the final dough (I35:I37)', () => {
    const { su, hu, cu } = result.finalDoughMetrics;
    expectClose(su, SPREADSHEET_DEFAULTS.finalDoughMetrics.su);
    expectClose(hu, SPREADSHEET_DEFAULTS.finalDoughMetrics.hu);
    expectClose(cu, SPREADSHEET_DEFAULTS.finalDoughMetrics.cu);
  });

  it('computes fermentation time estimates (P20:P41)', () => {
    const f = SPREADSHEET_DEFAULTS.fermentation;
    expectClose(result.fermentation.maintenanceStarter.fromHours, f.maintenance[0]);
    expectClose(result.fermentation.maintenanceStarter.toHours, f.maintenance[1]);
    expectClose(result.fermentation.doughStarter.fromHours, f.doughStarter[0]);
    expectClose(result.fermentation.doughStarter.toHours, f.doughStarter[1]);
    expectClose(result.fermentation.bulk.fromHours, f.bulk[0]);
    expectClose(result.fermentation.bulk.toHours, f.bulk[1]);
    expectClose(result.fermentation.proof.fromHours, f.proof[0]);
    expectClose(result.fermentation.proof.toHours, f.proof[1]);
  });

  it('exposes the ideal ranges displayed in the sheet', () => {
    expect(result.doughStarterMetrics.idealHuRange).toEqual([28, 35]);
    expect(result.doughStarterMetrics.idealCuRange).toEqual([30, 40]);
    expect(result.finalDoughMetrics.idealHuRange).toEqual([28, 35]);
    expect(result.finalDoughMetrics.idealCuRange).toEqual([25, 50]);
  });
});

describe('calculateBread — structural invariants', () => {
  it('produces final dough grams that always sum to the batch size', () => {
    const variants: CalculatorState[] = [
      DEFAULT_CALCULATOR_STATE,
      {
        ...DEFAULT_CALCULATOR_STATE,
        batch: { unitWeight: 900, quantityOfUnits: 2, wasteFactor: 5 },
      },
    ];
    for (const state of variants) {
      const result = calculateBread(state);
      expectClose(result.finalDough.totalGrams, result.batchSizeGrams);
    }
  });

  it('sums of build rows match the reported totals', () => {
    const result = calculateBread(DEFAULT_CALCULATOR_STATE);
    for (const table of [result.maintenanceStarter, result.doughStarter, result.finalDough]) {
      const pctSum = table.rows.reduce((acc, row) => acc + row.percent, 0);
      const gramSum = table.rows.reduce((acc, row) => acc + row.grams, 0);
      expectClose(pctSum, table.totalPercent);
      expectClose(gramSum, table.totalGrams);
    }
  });
});

describe('calculateBread — enriched dough (nonzero sugar and dairy)', () => {
  // Hand-computed from the ported formulas: dough sugar B42 = 10 adds
  // 10 percentage points to B45 (182 → 192) and contributes
  // (10/100)*115.6069… to the final dough sugar percentage.
  const state: CalculatorState = {
    ...DEFAULT_CALCULATOR_STATE,
    dough: { ...DEFAULT_CALCULATOR_STATE.dough, sugar: 10 },
  };
  const result = calculateBread(state);

  it('computes the enriched basis correctly (F43)', () => {
    const sugarRow = result.finalDough.rows.find((row) => row.ingredient === 'Sugar');
    expectClose(sugarRow?.percent ?? NaN, 11.560693575);
  });

  it('computes Su from the updated total (I35)', () => {
    expectClose(result.finalDoughMetrics.su, (10 / 192) * 100);
  });

  it('dilutes Hu because sugar adds to total dough weight (I36)', () => {
    expectClose(result.finalDoughMetrics.hu, (93 / 192) * 100);
    expectClose(result.finalDoughMetrics.cu, 10.75, 2);
  });
});

describe('calculateBread — maintenance multiplicative factor', () => {
  // With B21 = 2 the maintenance starter percentages become 100 / 80 / 90
  // (total 270); the dough starter and final dough are unaffected because
  // their formulas depend on the maintenance starter's composition, not its
  // multiplicative factor.
  const state: CalculatorState = {
    ...DEFAULT_CALCULATOR_STATE,
    maintenanceStarter: { ...DEFAULT_CALCULATOR_STATE.maintenanceStarter, multiplicativeFactor: 2 },
  };
  const result = calculateBread(state);

  it('halves the inoculant percentage (F22)', () => {
    const percents = result.maintenanceStarter.rows.map((row) => row.percent);
    expectClose(percents[0], 100);
    expectClose(percents[1], 80);
    expectClose(percents[2], 90);
    expectClose(result.maintenanceStarter.totalPercent, 270);
  });

  it('scales maintenance grams so the starter output still feeds the dough starter', () => {
    expectClose(result.maintenanceStarter.totalGrams, 64.46175824);
    expectClose(result.maintenanceStarter.rows[0]?.grams ?? NaN, (64.46175824 / 270) * 100);
  });

  it('leaves the dough starter and final dough unchanged', () => {
    expectClose(result.doughStarter.totalGrams, 188.0134615);
    expectClose(result.finalDough.totalPercent, 210.4046243);
  });
});

describe('calculateBread — degenerate inputs stay finite', () => {
  it('handles a zero multiplicative factor without NaN or Infinity', () => {
    const state: CalculatorState = {
      ...DEFAULT_CALCULATOR_STATE,
      maintenanceStarter: {
        ...DEFAULT_CALCULATOR_STATE.maintenanceStarter,
        multiplicativeFactor: 0,
      },
      doughStarter: { ...DEFAULT_CALCULATOR_STATE.doughStarter, multiplicativeFactor: 0 },
    };
    const result = calculateBread(state);
    const allNumbers = [
      result.batchSizeGrams,
      ...result.maintenanceStarter.rows.flatMap((r) => [r.percent, r.grams]),
      ...result.doughStarter.rows.flatMap((r) => [r.percent, r.grams]),
      ...result.finalDough.rows.flatMap((r) => [r.percent, r.grams]),
      result.doughStarterMetrics.cu,
      result.finalDoughMetrics.cu,
    ];
    for (const value of allNumbers) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('handles 100% pre-fermented flour (spreadsheet division-by-zero case)', () => {
    const state: CalculatorState = {
      ...DEFAULT_CALCULATOR_STATE,
      doughStarter: { ...DEFAULT_CALCULATOR_STATE.doughStarter, preFermentedFlour: 100 },
    };
    const result = calculateBread(state);
    expect(Number.isFinite(result.finalDough.totalPercent)).toBe(true);
    expect(Number.isFinite(result.fermentation.bulk.fromHours)).toBe(true);
  });

  it('handles 0% pre-fermented flour without dividing by zero', () => {
    const state: CalculatorState = {
      ...DEFAULT_CALCULATOR_STATE,
      doughStarter: { ...DEFAULT_CALCULATOR_STATE.doughStarter, preFermentedFlour: 0 },
    };
    const result = calculateBread(state);
    expect(Number.isFinite(result.finalDough.totalPercent)).toBe(true);
    expect(Number.isFinite(result.fermentation.proof.toHours)).toBe(true);
  });
});

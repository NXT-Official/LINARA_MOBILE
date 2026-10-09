/**
 * Batas Kasambahay's monthly statutory split (SSS / PhilHealth / Pag-IBIG).
 *
 * A deterministic legal formula, not demo data. It exists in BOTH repos --
 * here and in ../LINARA/src/features/people/people.utils.ts -- because neither
 * can import the other, and nothing structural stops the two copies drifting.
 * That is the same shape of problem as the net-pay rule (../LINARA/KNOWN_GAPS.md
 * C41), where "they happen to match" turned out not to survive contact with a
 * change to one side.
 *
 * So the copies are pinned two ways: `statutory.test.ts` here and its opposite
 * number in ../LINARA both assert the same value table, and ../LINARA's suite
 * additionally compares the two function bodies directly, so an edit to either
 * side fails a build even if whoever made it also updated their own test.
 *
 * Moved out of components/features/pay/legal-contribution-split.tsx (which
 * imports React Native, and therefore could not be unit-tested) purely so it
 * can be asserted. That component re-exports it, so nothing else changed.
 *
 * WHEN THE RATES CHANGE -- and they do, by SSS circular -- both repos must move
 * together, in one pass. The figures below are a snapshot of a real legal
 * schedule, and `home-management-concept.md` is explicit that they should be
 * confirmed against current DOLE/SSS guidance rather than trusted because they
 * are already written down.
 */

export interface StatutorySplit {
  isUnder5k: boolean;
  sssEmployer: number;
  sssEmployee: number;
  philhealthEmployer: number;
  philhealthEmployee: number;
  pagibigEmployer: number;
  pagibigEmployee: number;
  totalEmployer: number;
  totalEmployee: number;
}

export function computeStatutorySplit(wagePHP: number): StatutorySplit {
  const wage = Math.max(0, wagePHP);
  const isUnder5k = wage < 5000;
  const centavos = (n: number) => Math.round(n * 100) / 100;

  // SSS: 15% of the monthly salary credit (the wage in PHP 500 brackets,
  // 5,000 to 35,000): 5% hers, 10% the employer's, who also pays EC
  // (PHP 10, or 30 from an MSC of 15,000).
  const msc = Math.min(35000, Math.max(5000, 500 * Math.floor((wage + 250) / 500)));
  const sssShare = (msc * 5) / 100;
  const ec = msc < 15000 ? 10 : 30;

  // PhilHealth: 5% of the wage, floored at 10,000 and capped at 100,000,
  // split equally.
  const philhealthShare = centavos(Math.min(100000, Math.max(10000, wage)) / 40);

  // Pag-IBIG: 2% each of the wage up to 10,000 (1% hers at 1,500 or less).
  const pagibigBase = Math.min(10000, wage);
  const pagibigOwn = centavos((pagibigBase * (wage <= 1500 ? 1 : 2)) / 100);
  const pagibigMatch = centavos((pagibigBase * 2) / 100);

  // RA 10361: below PHP 5,000 a month the employer pays her shares as well.
  const sssEmployee = isUnder5k ? 0 : sssShare;
  const sssEmployer = sssShare * 2 + ec + (isUnder5k ? sssShare : 0);
  const philhealthEmployee = isUnder5k ? 0 : philhealthShare;
  const philhealthEmployer = philhealthShare + (isUnder5k ? philhealthShare : 0);
  const pagibigEmployee = isUnder5k ? 0 : pagibigOwn;
  const pagibigEmployer = pagibigMatch + (isUnder5k ? pagibigOwn : 0);

  return {
    isUnder5k,
    sssEmployer,
    sssEmployee,
    philhealthEmployer,
    philhealthEmployee,
    pagibigEmployer,
    pagibigEmployee,
    totalEmployer: centavos(sssEmployer + philhealthEmployer + pagibigEmployer),
    totalEmployee: centavos(sssEmployee + philhealthEmployee + pagibigEmployee),
  };
}

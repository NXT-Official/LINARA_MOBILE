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
  const isUnder5k = wagePHP < 5000;

  const sssEmployer = isUnder5k ? 400 : 350;
  const sssEmployee = isUnder5k ? 0 : 150;

  const philhealthEmployer = isUnder5k ? 150 : 125;
  const philhealthEmployee = isUnder5k ? 0 : 125;

  const pagibigEmployer = 100;
  const pagibigEmployee = isUnder5k ? 0 : 100;

  return {
    isUnder5k,
    sssEmployer,
    sssEmployee,
    philhealthEmployer,
    philhealthEmployee,
    pagibigEmployer,
    pagibigEmployee,
    totalEmployer: sssEmployer + philhealthEmployer + pagibigEmployer,
    totalEmployee: sssEmployee + philhealthEmployee + pagibigEmployee,
  };
}

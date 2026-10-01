import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/lib/theme";
import { PANTRY_CATEGORIES, type PantryCategory } from "@/services/api/pantry";

export interface ItemFormValues {
  name: string;
  qty: number;
  unit: string;
  /** Pantry only. */
  par?: number;
  category?: PantryCategory;
}

const toNumber = (s: string): number | null => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Add or edit one item, inline in its list. "grocery" asks for name and
 * amount; "pantry" also asks how much to keep on hand (par) and which shelf.
 */
export function ItemForm({
  kind,
  initial,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: {
  kind: "grocery" | "pantry";
  initial?: ItemFormValues;
  submitLabel: string;
  saving: boolean;
  onSubmit: (values: ItemFormValues) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [qty, setQty] = useState(initial ? String(initial.qty) : "1");
  const [unit, setUnit] = useState(initial?.unit ?? "pcs");
  const [par, setPar] = useState(initial?.par != null ? String(initial.par) : "1");
  const [category, setCategory] = useState<PantryCategory>(initial?.category ?? "Pantry");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const qtyN = toNumber(qty);
    const parN = toNumber(par);
    if (!name.trim()) return setError("Lagyan ng pangalan.");
    if (qtyN === null) return setError("Dami: numero lang, 0 pataas.");
    if (!unit.trim()) return setError("Lagyan ng unit (hal. kg, pcs, pack).");
    if (kind === "pantry" && parN === null) return setError("Par: numero lang, 0 pataas.");
    setError(null);
    onSubmit({
      name: name.trim(),
      qty: qtyN,
      unit: unit.trim(),
      ...(kind === "pantry" ? { par: parN ?? 0, category } : {}),
    });
  };

  return (
    <View style={styles.card}>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={kind === "pantry" ? "Pangalan (hal. Bigas)" : "Bibilhin (hal. Kamatis)"}
        placeholderTextColor={colors.mutedInk}
        style={styles.input}
        autoFocus={!initial}
        accessibilityLabel="Pangalan"
      />
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.label}>{kind === "pantry" ? "Meron ngayon" : "Dami"}</Text>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Dami"
          />
        </View>
        <View style={styles.cell}>
          <Text style={styles.label}>Unit</Text>
          <TextInput
            value={unit}
            onChangeText={setUnit}
            autoCapitalize="none"
            style={styles.input}
            accessibilityLabel="Unit"
          />
        </View>
        {kind === "pantry" && (
          <View style={styles.cell}>
            <Text style={styles.label}>Par</Text>
            <TextInput
              value={par}
              onChangeText={setPar}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Par, ang dapat laging meron"
            />
          </View>
        )}
      </View>
      {kind === "pantry" && (
        <>
          <Text style={styles.hint}>
            Par: kapag ganito na lang o kulang pa, lalabas na &ldquo;Low&rdquo;.
          </Text>
          <View style={styles.categories}>
            {PANTRY_CATEGORIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                accessibilityState={{ selected: c === category }}
                style={[styles.chip, c === category && styles.chipOn]}
              >
                <Text style={[styles.chipText, c === category && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Pressable onPress={onCancel} disabled={saving} style={styles.secondary}>
          <Text style={styles.secondaryText}>Kanselahin</Text>
        </Pressable>
        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && styles.disabled]}
        >
          <Text style={styles.primaryText}>{saving ? "Sandali…" : submitLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.pineTeal,
    backgroundColor: colors.cardCream,
    padding: 12,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  cell: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedInk,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.ink,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedInk,
  },
  categories: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipOn: {
    borderColor: colors.pineTeal,
    backgroundColor: colors.pineTeal,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.ink,
  },
  chipTextOn: {
    color: colors.cardCream,
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  secondary: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.mutedInk,
  },
  primary: {
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: colors.pineTeal,
    paddingHorizontal: 16,
  },
  primaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.cardCream,
  },
  disabled: {
    opacity: 0.6,
  },
});

import { useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { colors, fonts } from "@/lib/theme";
import { formatTimeSpan } from "@/lib/format";
import type { FocusTask } from "@/services/api/tickets";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { SopCarousel } from "@/components/features/today/sop-carousel";
import { EditTaskForm, type TaskEdit } from "@/components/features/today/edit-task-form";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import type { MessageKey } from "@/lib/i18n/instance";

const STATUS_LABEL: Record<FocusTask["status"], MessageKey> = {
  todo: "focusStatus.todo",
  in_progress: "focusStatus.doing",
  blocked: "focusStatus.onHold",
  done: "focusStatus.done",
  cancelled: "focusStatus.cancelled",
};

/** One tap for the usual reasons; anything else she can type. */
const CANT_NOW_REASONS = [
  "cantNow.missingSupplies",
  "cantNow.needExplanation",
  "cantNow.otherWork",
] as const;

/**
 * The Today tab's single task (roadmap Story 7, step 2 / plan.md 3.2 "Active
 * Focus Card"): Start, then Done, with the house standard attached. "Hindi ko
 * magagawa ngayon" puts it on hold with her reason (concept doc §8: saying
 * "not now" is what separates a colleague from a subordinate); the manager
 * sees it in Needs You and can put it back on her board.
 *
 * A photo of the finished work is optional -- the Done "plated dish" that
 * the household's Pass (and an OFW parent's glance) shows. Never required.
 * "Ayusin ang oras o note" lets her move it or fix its note (O31).
 */
export function ActiveFocusCard({
  task,
  myUserId,
  onStart,
  onComplete,
  onCantNow,
  onEdit,
  isStarting,
  isCompleting,
  isHolding,
  isEditing,
  editError,
}: {
  task: FocusTask;
  /** Her auth user id, to tell her own promoted notes from a manager's asks. */
  myUserId: string;
  onStart: () => void;
  /** `photoUri` is a local capture to attach, or null to finish without one. */
  onComplete: (photoUri: string | null) => void;
  onCantNow: (reason: string) => void;
  /** Resolves once saved, so the form can close; rejects on failure. */
  onEdit: (edit: TaskEdit) => Promise<unknown>;
  isStarting: boolean;
  isCompleting: boolean;
  isHolding: boolean;
  isEditing: boolean;
  editError: string | null;
}) {
  const t = useT();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [askingWhy, setAskingWhy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [editing, setEditing] = useState(false);
  const reason = typed.trim() || (picked ? t(picked as MessageKey) : null);
  const open = task.status === "todo" || task.status === "in_progress" || task.status === "blocked";

  const takePhoto = async () => {
    setPhotoError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(t("today.kailanganNgCameraAccessPara"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.9 });
    if (!result.canceled && result.assets?.[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const closeAsk = () => {
    setAskingWhy(false);
    setPicked(null);
    setTyped("");
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>{t("today.focusNgayon")}</Text>
      <Text style={styles.title}>{task.title}</Text>
      {task.createdById === myUserId ? (
        <Text style={styles.from}>{t("today.ikawAngNagdagdagNito")}</Text>
      ) : task.createdByName ? (
        <Text style={styles.from}>{t("today.fromName", { name: task.createdByName })}</Text>
      ) : null}
      <Text style={styles.status}>
        {t(STATUS_LABEL[task.status])} · {formatTimeSpan(task.scheduledStart, task.durationMinutes)}
      </Text>

      {task.status === "blocked" && (
        <View style={styles.holdNote}>
          {task.blockReason ? <Text style={styles.holdReason}>“{task.blockReason}”</Text> : null}
          <Text style={styles.holdHint}>{t("today.nakikitaNaItoNgManager")}</Text>
        </View>
      )}

      {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}

      {task.sop ? <SopCarousel sop={task.sop} /> : null}

      {task.status === "todo" && (
        <PrimaryButton label={t("today.simulan")} loading={isStarting} onPress={onStart} />
      )}
      {task.status === "in_progress" && (
        <>
          {photoUri ? (
            <View style={styles.photoRow}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photo}
                accessibilityLabel={t("today.litratoNgNatapos")}
              />
              <Pressable
                onPress={() => setPhotoUri(null)}
                accessibilityRole="button"
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>{t("today.alisinAngLitrato")}</Text>
              </Pressable>
            </View>
          ) : (
            <PrimaryButton
              label={t("today.ipakitaAngNataposMoKung")}
              variant="secondary"
              onPress={takePhoto}
            />
          )}
          {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          <PrimaryButton
            label={photoUri ? t("today.taposNaKasamaAngLitrato") : t("today.taposNa")}
            loading={isCompleting}
            onPress={() => onComplete(photoUri)}
          />
        </>
      )}

      {(task.status === "todo" || task.status === "in_progress") &&
        (askingWhy ? (
          <View style={styles.ask}>
            <Text style={styles.askTitle}>{t("today.bakitHindiNgayon")}</Text>
            <View style={styles.reasons}>
              {CANT_NOW_REASONS.map((r) => {
                const selected = picked === r && !typed.trim();
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setPicked(r);
                      setTyped("");
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.reason, selected && styles.reasonSelected]}
                  >
                    <Text style={[styles.reasonText, selected && styles.reasonTextSelected]}>
                      {t(r)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label={t("today.oIsulatDito")}
              value={typed}
              onChangeText={setTyped}
              placeholder={t("today.halWalaPangSabonPanlaba")}
              maxLength={200}
            />
            <PrimaryButton
              label={t("today.ipaalamSaManager")}
              loading={isHolding}
              disabled={!reason}
              onPress={() => {
                if (reason) onCantNow(reason);
                closeAsk();
              }}
            />
            <PrimaryButton label={t("today.huwagNa")} variant="secondary" onPress={closeAsk} />
          </View>
        ) : (
          !editing && (
            <Pressable
              onPress={() => setAskingWhy(true)}
              accessibilityRole="button"
              style={styles.cantNow}
            >
              <Text style={styles.cantNowText}>{t("today.hindiKoMagagawaNgayon")}</Text>
            </Pressable>
          )
        ))}

      {open &&
        !askingWhy &&
        (editing ? (
          <EditTaskForm
            scheduledStart={task.scheduledStart}
            notes={task.notes}
            saving={isEditing}
            error={editError}
            onSave={(edit) => {
              onEdit(edit)
                .then(() => setEditing(false))
                .catch(() => {
                  // The error shows in the form; she can try again.
                });
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            style={styles.cantNow}
          >
            <Text style={styles.cantNowText}>{t("today.ayusinAngOrasONote")}</Text>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.cardCream,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.terracottaInk,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: colors.ink,
  },
  from: {
    fontSize: 13,
    color: colors.mutedInk,
  },
  status: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedInk,
  },
  holdNote: {
    gap: 4,
  },
  holdReason: {
    fontSize: 15,
    fontStyle: "italic",
    color: colors.ink,
  },
  holdHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedInk,
  },
  notes: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.sand,
  },
  linkButton: {
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  error: {
    fontSize: 13,
    color: colors.terracottaInk,
  },
  cantNow: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cantNowText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.pineTeal,
    textDecorationLine: "underline",
  },
  ask: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  askTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  reasons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reason: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
  },
  reasonSelected: {
    backgroundColor: colors.pineTeal,
    borderColor: colors.pineTeal,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.ink,
  },
  reasonTextSelected: {
    color: colors.cardCream,
  },
});

import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { colors } from "@/lib/theme";
import { formatClockTime } from "@/lib/format";
import type { FocusTask } from "@/services/api/tickets";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { SopCarousel } from "@/components/features/today/sop-carousel";
import { EditTaskForm, type TaskEdit } from "@/components/features/today/edit-task-form";

const STATUS_LABEL: Record<FocusTask["status"], string> = {
  todo: "Hindi pa sinisimulan",
  in_progress: "Ginagawa ngayon",
  blocked: "Naka-hold",
  done: "Tapos na",
  cancelled: "Kinansela",
};

/** One tap for the usual reasons; anything else she can type. */
const CANT_NOW_REASONS = [
  "Kulang ang gamit",
  "Kailangan ko ng paliwanag",
  "May iba pang pinapagawa sa akin",
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
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [askingWhy, setAskingWhy] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [editing, setEditing] = useState(false);
  const reason = typed.trim() || picked;
  const open = task.status === "todo" || task.status === "in_progress" || task.status === "blocked";

  const takePhoto = async () => {
    setPhotoError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPhotoError("Kailangan ng camera access para makakuha ng litrato.");
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
      <Text style={styles.eyebrow}>Focus ngayon</Text>
      <Text style={styles.title}>{task.title}</Text>
      {task.createdById === myUserId ? (
        <Text style={styles.from}>Ikaw ang nagdagdag nito</Text>
      ) : task.createdByName ? (
        <Text style={styles.from}>Mula kay {task.createdByName}</Text>
      ) : null}
      <Text style={styles.status}>
        {STATUS_LABEL[task.status]} · {formatClockTime(task.scheduledStart)}
      </Text>

      {task.status === "blocked" && (
        <View style={styles.holdNote}>
          {task.blockReason ? <Text style={styles.holdReason}>“{task.blockReason}”</Text> : null}
          <Text style={styles.holdHint}>
            Nakikita na ito ng manager sa Pass nila. Babalik ito sa listahan mo kapag naayos na.
          </Text>
        </View>
      )}

      {task.notes ? <Text style={styles.notes}>{task.notes}</Text> : null}

      {task.sop ? <SopCarousel sop={task.sop} /> : null}

      {task.status === "todo" && (
        <PrimaryButton label="Start Task" loading={isStarting} onPress={onStart} />
      )}
      {task.status === "in_progress" && (
        <>
          {photoUri ? (
            <View style={styles.photoRow}>
              <Image
                source={{ uri: photoUri }}
                style={styles.photo}
                accessibilityLabel="Litrato ng natapos"
              />
              <Pressable
                onPress={() => setPhotoUri(null)}
                accessibilityRole="button"
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Alisin ang litrato</Text>
              </Pressable>
            </View>
          ) : (
            <PrimaryButton
              label="Ipakita ang natapos mo (optional)"
              variant="secondary"
              onPress={takePhoto}
            />
          )}
          {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          <PrimaryButton
            label={photoUri ? "Done, kasama ang litrato" : "Done"}
            loading={isCompleting}
            onPress={() => onComplete(photoUri)}
          />
        </>
      )}

      {(task.status === "todo" || task.status === "in_progress") &&
        (askingWhy ? (
          <View style={styles.ask}>
            <Text style={styles.askTitle}>Bakit hindi ngayon?</Text>
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
                      {r}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <TextField
              label="O isulat dito"
              value={typed}
              onChangeText={setTyped}
              placeholder="Hal. Wala pang sabon panlaba"
              maxLength={200}
            />
            <PrimaryButton
              label="Ipaalam sa manager"
              loading={isHolding}
              disabled={!reason}
              onPress={() => {
                if (reason) onCantNow(reason);
                closeAsk();
              }}
            />
            <PrimaryButton label="Huwag na" variant="secondary" onPress={closeAsk} />
          </View>
        ) : (
          !editing && (
            <Pressable
              onPress={() => setAskingWhy(true)}
              accessibilityRole="button"
              style={styles.cantNow}
            >
              <Text style={styles.cantNowText}>Hindi ko magagawa ngayon</Text>
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
            <Text style={styles.cantNowText}>Ayusin ang oras o note</Text>
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
    fontWeight: "700",
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

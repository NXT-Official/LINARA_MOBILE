import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { colors } from "@/lib/theme";
import { addTaskComment, deleteTaskComment, getTaskComments } from "@/services/api/ticket-comments";
import { TextField } from "@/components/ui/text-field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text } from "@/components/ui/text";
import { useT } from "@/lib/i18n/locale-context";
import { intlLocale } from "@/lib/i18n/instance";

const stamp = (iso: string) =>
  new Date(iso).toLocaleString(intlLocale(), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * A task's updates, shared with the household's managers
 * (../LINARA/supabase/add-ticket-comments.sql). Unlike her private notes,
 * these are meant to be seen: "Naubos na ang sabon", "Use the blue one".
 * Checks for the manager's replies every 15 seconds while it's on screen.
 */
export function TaskUpdates({ ticketId, myUserId }: { ticketId: string; myUserId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const key = ["task-comments", ticketId];
  const commentsQuery = useQuery({
    queryKey: key,
    queryFn: () => getTaskComments(ticketId),
    refetchInterval: 15_000,
  });
  const [draft, setDraft] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const post = useMutation({
    mutationFn: () => addTaskComment(ticketId, draft),
    onSuccess: async () => {
      setDraft("");
      await refresh();
    },
  });
  const remove = useMutation({ mutationFn: deleteTaskComment, onSuccess: refresh });

  const comments = commentsQuery.data ?? [];

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("today.mgaUpdate")}</Text>
      <Text style={styles.sub}>{t("today.makikitaItoNgEmployerMo")}</Text>

      {commentsQuery.isLoading ? (
        <ActivityIndicator color={colors.pineTeal} />
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <View style={styles.commentHead}>
              <Text style={styles.author}>
                {c.authorId === myUserId ? t("today.ikaw") : c.authorName || t("today.someone")}
              </Text>
              <Text style={styles.time}>
                {stamp(c.createdAt)}
                {c.editedAt ? t("today.binago") : ""}
              </Text>
              {c.authorId === myUserId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("today.burahinAngUpdate")}
                  hitSlop={8}
                  onPress={() =>
                    Alert.alert(
                      t("today.burahinAngUpdate2"),
                      t("today.mawawalaItoSaTaskPara"),
                      [
                        { text: "Huwag", style: "cancel" },
                        {
                          text: "Burahin",
                          style: "destructive",
                          onPress: () => remove.mutate(c.id),
                        },
                      ],
                      { cancelable: true },
                    )
                  }
                >
                  <Ionicons name="trash-outline" size={16} color={colors.mutedInk} />
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.body}>{c.body}</Text>
          </View>
        ))
      )}

      <TextField
        label={t("today.magdagdagNgUpdate")}
        value={draft}
        onChangeText={setDraft}
        placeholder={t("today.halNaubosNaAngSabon")}
        maxLength={1000}
        multiline
      />
      {post.isError ? (
        <Text style={styles.error}>
          {post.error instanceof Error ? post.error.message : t("today.hindiNaipadalaSubukanUlit")}
        </Text>
      ) : null}
      <PrimaryButton
        label={t("today.ipadalaAngUpdate")}
        variant="secondary"
        loading={post.isPending}
        disabled={!draft.trim()}
        onPress={() => post.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { fontSize: 15, fontWeight: "700", color: colors.ink },
  sub: { fontSize: 13, lineHeight: 18, color: colors.mutedInk },
  comment: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.sand,
    gap: 2,
  },
  commentHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  author: { fontSize: 13, fontWeight: "700", color: colors.ink },
  time: { flex: 1, fontSize: 13, color: colors.mutedInk },
  body: { fontSize: 14, lineHeight: 20, color: colors.ink },
  error: { fontSize: 13, color: colors.terracottaInk },
});

import { Text, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, getStatusMeta, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { Job, assigneeLabel } from "../api/jobs";
import { StatusBadge } from "./StatusBadge";
import { PressableScale } from "./Motion";

export function TicketCard({ job, onPress }: { job: Job; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const stripColor = getStatusMeta(colors)[job.status].color;
  return (
    <PressableScale onPress={onPress} style={[styles.card, { borderLeftColor: stripColor }]}>
      <View style={styles.headRow}>
        <Text style={styles.code}>#{job.code}</Text>
        <StatusBadge status={job.status} />
      </View>
      <Text style={styles.desc} numberOfLines={2}>
        {job.description}
      </Text>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          Req: <Text style={styles.metaBold}>{job.requestedBy}</Text>
        </Text>
        {job.room ? (
          <Text style={styles.metaText}>
            Room: <Text style={styles.metaBold}>{job.room}</Text>
          </Text>
        ) : null}
      </View>
      {/* ผู้รับผิดชอบ — เห็นได้ตั้งแต่ในรายการ ไม่ต้องเปิดเข้าไปดูทีละใบว่างานนี้ใครดูแลอยู่ */}
      <View style={styles.assigneeRow}>
        <Ionicons
          name={job.assignees?.length ? "person-circle" : "person-circle-outline"}
          size={15}
          color={job.assignees?.length ? colors.signalBlue : colors.textTertiary}
        />
        <Text
          style={[styles.assigneeText, !job.assignees?.length && styles.assigneeTextEmpty]}
          numberOfLines={1}
        >
          {assigneeLabel(job.assignees)}
        </Text>
      </View>
    </PressableScale>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderLeftWidth: 6,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#0F1626",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  code: { fontFamily: "Courier", fontWeight: "700", fontSize: 15, color: colors.textPrimary },
  desc: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaText: { fontSize: 11.5, color: colors.textSecondary },
  metaBold: { color: colors.textPrimary, fontWeight: "600" },
  assigneeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  assigneeText: { fontSize: 11.5, fontWeight: "600", color: colors.textPrimary, flexShrink: 1 },
  assigneeTextEmpty: { fontWeight: "500", color: colors.textTertiary },
});

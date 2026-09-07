import { useState } from "react";
import { Image, Modal, Platform, Pressable, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { ThemeColors, radius, spacing } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { uploadPhoto, resolvePhotoUrl } from "../api/uploads";
import { MAX_PHOTOS_PER_JOB } from "../api/jobs";
import { ApiError } from "../api/client";
import { showDialog } from "../utils/dialog";

/** รูปหนึ่งใบ — id ใช้ตอนลบ (ใบงานที่ยังไม่ได้สร้างจะยังไม่มี id จริง จึงให้เป็น null ได้) */
export type GalleryPhoto = { id: string | null; url: string };

type Props = {
  photos: GalleryPhoto[];
  /** อัปโหลดเสร็จแล้วได้ path กลับมา — ผู้เรียกตัดสินใจเองว่าจะผูกเข้าใบงานทันทีหรือรอตอนกดบันทึก */
  onAdd: (url: string) => void | Promise<void>;
  onRemove: (photo: GalleryPhoto) => void | Promise<void>;
  /** ปิดการแก้ไข (เช่นตอนกำลังบันทึกอย่างอื่นอยู่) */
  disabled?: boolean;
};

// แกลเลอรีรูปหน้างานแบบหลายรูป — แทน PhotoPicker เดิมที่รองรับรูปเดียว
// แสดงเป็นตารางสี่เหลี่ยม แตะเพื่อดูเต็มจอ (เลื่อนดูรูปถัดไปได้) และมีปุ่มลบมุมขวาบนของแต่ละรูป
export function PhotoGallery({ photos, onAdd, onRemove, disabled }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const isFull = photos.length >= MAX_PHOTOS_PER_JOB;

  async function pickAndUpload(source: "camera" | "library") {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      showDialog(
        "ไม่ได้รับอนุญาต",
        source === "camera"
          ? "กรุณาอนุญาตให้แอปใช้กล้องในตั้งค่าเครื่อง"
          : "กรุณาอนุญาตให้แอปเข้าถึงคลังภาพในตั้งค่าเครื่อง"
      );
      return;
    }

    // เลือกได้ทีละหลายรูปจากคลังภาพ (จำกัดไม่ให้เกินโควตาที่เหลือ) — ถ่ายจากกล้องได้ทีละรูปตามปกติ
    const remaining = MAX_PHOTOS_PER_JOB - photos.length;
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, allowsEditing: true })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.6,
            allowsMultipleSelection: true,
            selectionLimit: remaining,
          });

    if (result.canceled || result.assets.length === 0) return;

    setUploading(true);
    try {
      // อัปโหลดทีละรูปตามลำดับ เพื่อให้ลำดับรูปที่ผู้ใช้เลือกยังคงเดิม
      for (const asset of result.assets.slice(0, remaining)) {
        const { url } = await uploadPhoto(asset.uri);
        await onAdd(url);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้ง";
      showDialog("อัปโหลดไม่สำเร็จ", message);
    } finally {
      setUploading(false);
    }
  }

  function openPicker() {
    if (isFull) {
      showDialog("แนบรูปครบแล้ว", `แนบได้สูงสุด ${MAX_PHOTOS_PER_JOB} รูปต่อใบงาน`);
      return;
    }
    // บนเว็บข้ามเมนูไปเปิดหน้าต่างเลือกไฟล์ตรงๆ (window.confirm เลือกได้แค่ 2 ทาง และคอมส่วนใหญ่ไม่มีกล้อง)
    if (Platform.OS === "web") {
      pickAndUpload("library");
      return;
    }
    showDialog("แนบรูปภาพ", undefined, [
      { text: "ถ่ายภาพ", onPress: () => pickAndUpload("camera") },
      { text: "เลือกจากคลังภาพ", onPress: () => pickAndUpload("library") },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  }

  function confirmRemove(photo: GalleryPhoto) {
    showDialog("ลบรูปนี้?", "รูปจะถูกเอาออกจากใบงาน", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบรูป", style: "destructive", onPress: () => onRemove(photo) },
    ]);
  }

  const current = viewerIndex !== null ? photos[viewerIndex] : null;

  return (
    <View>
      <View style={styles.grid}>
        {photos.map((photo, index) => (
          <View key={photo.id ?? photo.url} style={styles.tile}>
            <Pressable onPress={() => setViewerIndex(index)} style={StyleSheet.absoluteFill}>
              <Image source={{ uri: resolvePhotoUrl(photo.url) }} style={styles.tileImage} />
            </Pressable>
            {!disabled && (
              <Pressable onPress={() => confirmRemove(photo)} style={styles.removeBtn} hitSlop={4}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        ))}

        {!isFull && (
          <Pressable onPress={openPicker} style={styles.addTile} disabled={uploading || disabled}>
            {uploading ? (
              <ActivityIndicator color={colors.textTertiary} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={22} color={colors.textTertiary} />
                <Text style={styles.addText}>เพิ่มรูป</Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      <Text style={styles.hint}>
        {photos.length === 0
          ? `ยังไม่มีรูป — แนบได้สูงสุด ${MAX_PHOTOS_PER_JOB} รูป (ไฟล์ละไม่เกิน 5MB)`
          : `${photos.length}/${MAX_PHOTOS_PER_JOB} รูป`}
      </Text>

      {/* ดูเต็มจอ พร้อมปุ่มเลื่อนดูรูปก่อนหน้า/ถัดไป */}
      <Modal visible={current !== null} transparent animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <View style={styles.viewerBackdrop}>
          {current && (
            <Image source={{ uri: resolvePhotoUrl(current.url) }} style={styles.viewerImage} resizeMode="contain" />
          )}

          <Pressable onPress={() => setViewerIndex(null)} style={styles.viewerClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>

          {photos.length > 1 && viewerIndex !== null && (
            <>
              <Pressable
                onPress={() => setViewerIndex((viewerIndex - 1 + photos.length) % photos.length)}
                style={[styles.viewerNav, { left: 16 }]}
              >
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => setViewerIndex((viewerIndex + 1) % photos.length)}
                style={[styles.viewerNav, { right: 16 }]}
              >
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </Pressable>
              <Text style={styles.viewerCount}>
                {viewerIndex + 1} / {photos.length}
              </Text>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const TILE = 96;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.sm,
    overflow: "hidden",
    backgroundColor: colors.slateBg,
  },
  tileImage: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(11,15,29,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: TILE,
    height: TILE,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addText: { fontSize: 11.5, fontWeight: "600", color: colors.textTertiary },
  hint: { fontSize: 11, color: colors.textTertiary, marginTop: 8 },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,15,29,0.94)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: { width: "100%", height: "80%" },
  viewerClose: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerNav: {
    position: "absolute",
    top: "50%",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerCount: { position: "absolute", bottom: 50, color: "#fff", fontSize: 13, fontWeight: "700" },
});

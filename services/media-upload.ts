import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";

import { supabase } from "@/services/supabase";

/** Private Supabase Storage bucket shared with the LINARA web dashboard (see ../LINARA/ARCHITECTURE.md Section 5.1). */
export const HOUSEHOLD_EVIDENCE_BUCKET = "household-evidence";

/** Matches the client-side compression target defined in plan.md and architecture.md. */
const MAX_IMAGE_WIDTH_PX = 1200;
const JPEG_COMPRESS_QUALITY = 0.8;

/**
 * The small copy lists show instead of the full photo (about 25 to 45 KB).
 * 480px stays sharp on a phone-width card at 2x; the full photo is only
 * fetched when someone opens it. ../LINARA reads it by the same path rule.
 */
const THUMB_WIDTH_PX = 480;
const THUMB_COMPRESS_QUALITY = 0.7;

/** "<dir>/<name>.jpg" -> "<dir>/<name>.thumb.jpg"; the web derives it the same way. */
export function evidenceThumbPath(storagePath: string): string {
  return storagePath.replace(/\.jpe?g$/i, "") + ".thumb.jpg";
}

/** Signed URL lifetime for evidence/receipt reads, matching the 15-minute window used on web (architecture.md 5.1). */
const SIGNED_URL_EXPIRY_SECONDS = 900;

export interface UploadEvidenceResult {
  /** Storage-relative path the file was written to (pass this to future reads instead of re-deriving it). */
  path: string;
  /** Pre-signed, time-limited URL suitable for immediate display or hand-off to a server record. */
  signedUrl: string;
}

/**
 * Resizes and compresses a locally-captured photo (receipt or task evidence)
 * to `width` at `quality` JPEG -- 1200px at 80% for the photo itself,
 * matching the mobile bandwidth budget described in plan.md Section 2 /
 * architecture.md 5.1. Re-encoding also drops the camera's EXIF, GPS
 * included, so no photo carries where the household lives.
 */
async function compressImage(
  localUri: string,
  width = MAX_IMAGE_WIDTH_PX,
  quality = JPEG_COMPRESS_QUALITY,
): Promise<string> {
  const context = ImageManipulator.manipulate(localUri).resize({
    width,
    height: null,
  });
  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.JPEG,
    compress: quality,
    base64: true,
  });

  if (!result.base64) {
    throw new Error("Image compression did not return base64 data to upload.");
  }
  return result.base64;
}

/**
 * Compresses a locally-captured image and uploads it to the shared
 * `household-evidence` storage bucket, returning a short-lived signed URL.
 * `storagePath` should be caller-scoped (e.g. `${householdId}/tickets/${ticketId}.jpg`)
 * so the bucket's RLS policies (see ../supabase/storage-policies.sql) can isolate it
 * to the uploading helper's household.
 *
 * Also uploads a thumbnail at evidenceThumbPath(storagePath). That one is
 * best effort: readers fall back to the full photo when it's missing, so a
 * failed thumbnail never fails the upload. Both are deleted after 30 days
 * (tickets/) or 60 (receipts/) by ../LINARA's purge-expired-evidence job.
 */
export async function uploadEvidenceImage(
  localUri: string,
  storagePath: string,
): Promise<UploadEvidenceResult> {
  const base64 = await compressImage(localUri);
  const fileBody = decode(base64);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(HOUSEHOLD_EVIDENCE_BUCKET)
    .upload(storagePath, fileBody, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError || !uploadData) {
    throw new Error(`Failed to upload evidence image: ${uploadError?.message ?? "unknown error"}`);
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(HOUSEHOLD_EVIDENCE_BUCKET)
    .createSignedUrl(uploadData.path, SIGNED_URL_EXPIRY_SECONDS);

  if (signedUrlError || !signedUrlData) {
    throw new Error(
      `Uploaded evidence image but failed to sign its URL: ${signedUrlError?.message ?? "unknown error"}`,
    );
  }

  await uploadThumbnail(localUri, uploadData.path);

  return { path: uploadData.path, signedUrl: signedUrlData.signedUrl };
}

async function uploadThumbnail(localUri: string, storagePath: string): Promise<void> {
  try {
    const base64 = await compressImage(localUri, THUMB_WIDTH_PX, THUMB_COMPRESS_QUALITY);
    const { error } = await supabase.storage
      .from(HOUSEHOLD_EVIDENCE_BUCKET)
      .upload(evidenceThumbPath(storagePath), decode(base64), {
        contentType: "image/jpeg",
        upsert: true,
      });
    if (error) console.warn("[media-upload] Thumbnail upload failed:", error.message);
  } catch (err) {
    console.warn("[media-upload] Thumbnail failed:", (err as Error).message);
  }
}

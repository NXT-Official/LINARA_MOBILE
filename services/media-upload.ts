import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { decode } from "base64-arraybuffer";

import { supabase } from "@/services/supabase";

/** Private Supabase Storage bucket shared with the LINARA web dashboard (see ../LINARA/ARCHITECTURE.md Section 5.1). */
export const HOUSEHOLD_EVIDENCE_BUCKET = "household-evidence";

/** Matches the client-side compression target defined in plan.md and architecture.md. */
const MAX_IMAGE_WIDTH_PX = 1200;
const JPEG_COMPRESS_QUALITY = 0.8;

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
 * to a maximum width of 1200px at 80% JPEG quality, matching the mobile
 * bandwidth budget described in plan.md Section 2 / architecture.md 5.1.
 */
async function compressImage(localUri: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri).resize({
    width: MAX_IMAGE_WIDTH_PX,
    height: null,
  });
  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    format: SaveFormat.JPEG,
    compress: JPEG_COMPRESS_QUALITY,
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

  return { path: uploadData.path, signedUrl: signedUrlData.signedUrl };
}

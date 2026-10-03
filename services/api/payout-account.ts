import { HOUSEHOLD_EVIDENCE_BUCKET, uploadEvidenceImage } from "@/services/media-upload";
import { normalizeMobileNumber } from "@/lib/mobile-number";
import { supabase } from "@/services/supabase";

/** Her GCash or Maya, as the manager will send to it. */
export type PayoutMethod = "PH_GCASH" | "PH_PAYMAYA";

export interface PayoutAccount {
  method: PayoutMethod;
  accountName: string;
  accountNumber: string;
  /** Storage path of her QR code, if she added one. */
  qrPath: string | null;
  /** Signed for 15 minutes, for showing it back to her. */
  qrUrl: string | null;
}

interface PayoutAccountRow {
  method: PayoutMethod;
  account_name: string;
  account_number: string;
  qr_path: string | null;
}

/**
 * Where she wants her pay sent (../LINARA/supabase/add-direct-gcash-pay.sql,
 * KNOWN_GAPS O35). Hers: only her own session writes it. Managers of a
 * household she works in read it on their Pay screen and send from their own
 * GCash / Maya; Linara moves no money. Null until she saves one, and while
 * the SQL isn't applied.
 */
export async function getMyPayoutAccount(): Promise<PayoutAccount | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("helper_payout_accounts")
    .select("method, account_name, account_number, qr_path")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  // 42P01 / PGRST205: the table isn't there yet.
  if (error && error.code !== "42P01" && error.code !== "PGRST205") throw new Error(error.message);
  const row = data as PayoutAccountRow | null;
  if (!row) return null;
  let qrUrl: string | null = null;
  if (row.qr_path) {
    const { data: signed } = await supabase.storage
      .from(HOUSEHOLD_EVIDENCE_BUCKET)
      .createSignedUrl(row.qr_path, 900);
    qrUrl = signed?.signedUrl ?? null;
  }
  return {
    method: row.method,
    accountName: row.account_name,
    accountNumber: row.account_number,
    qrPath: row.qr_path,
    qrUrl,
  };
}

/**
 * Saves (or replaces) where her pay goes. `qrLocalUri`: a new QR image to
 * upload; `removeQr`: drop the one on file. The image lives in her own
 * folder, payout/<her user id>/, which only she can write.
 */
export async function saveMyPayoutAccount(input: {
  method: PayoutMethod;
  accountName: string;
  accountNumber: string;
  qrLocalUri?: string;
  removeQr?: boolean;
  currentQrPath: string | null;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not signed in");
  const number = normalizeMobileNumber(input.accountNumber);
  if (!number) throw new Error("Ilagay ang 11-digit na number, nagsisimula sa 09.");

  let qrPath = input.removeQr ? null : input.currentQrPath;
  if (input.qrLocalUri) {
    qrPath = (await uploadEvidenceImage(input.qrLocalUri, `payout/${auth.user.id}/qr.jpg`)).path;
  } else if (input.removeQr && input.currentQrPath) {
    await supabase.storage.from(HOUSEHOLD_EVIDENCE_BUCKET).remove([input.currentQrPath]);
  }

  const { error } = await supabase.from("helper_payout_accounts").upsert(
    {
      user_id: auth.user.id,
      method: input.method,
      account_name: input.accountName.trim(),
      account_number: number,
      qr_path: qrPath,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

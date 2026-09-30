import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

import { recordFileName, recordPdfHtml, type RecordPdfInput } from "@/lib/record-pdf";

/**
 * Makes her work record into a PDF on the phone and opens the share sheet,
 * where she can save it to Files/Drive or send it on. Nothing is uploaded:
 * the file exists only on her phone and wherever she sends it.
 */
export async function shareRecordPdf(input: RecordPdfInput): Promise<void> {
  const html = recordPdfHtml(input);
  const { uri } = await Print.printToFileAsync({
    html,
    // iOS ignores the CSS @page margins; Android ignores this.
    margins: Platform.OS === "ios" ? { top: 48, bottom: 48, left: 44, right: 44 } : undefined,
  });

  // printToFileAsync picks a random name; give it one a bank officer can file.
  const printed = new File(uri);
  const named = new File(Paths.cache, recordFileName(input.name, input.generatedAt));
  if (named.exists) named.delete();
  await printed.move(named);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Hindi available ang pag-share sa phone na ito.");
  }
  await Sharing.shareAsync(named.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: "I-save o ipadala ang record mo",
  });
}

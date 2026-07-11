import JSZip from "jszip";
import { getDriveClient } from "@/lib/drive-sync/client";

// File ID of Rahul_Agarwal_Master_Resume_Bank.docx in Drive
const MASTER_BANK_FILE_ID = "13zvIuSCEHxv7qHuZ17Ng9R9BfecCUnxQ";

export async function readMasterBank(): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId: MASTER_BANK_FILE_ID, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const zip = await JSZip.loadAsync(res.data as ArrayBuffer);
  const xml = await zip.files["word/document.xml"].async("string");

  // Extract text from <w:t> elements, preserving paragraph breaks
  const paragraphs = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)];
  const lines = paragraphs.map((p) => {
    const runs = [...p[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    return runs.join("").trim();
  });

  return lines.filter(Boolean).join("\n");
}

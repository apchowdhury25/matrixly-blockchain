import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DiplomaFields = {
  university: string;
  holder: string;
  degree: string;
  issued: string;
  credentialId: string;
};

const ink = rgb(20 / 255, 23 / 255, 28 / 255);
const pine = rgb(36 / 255, 61 / 255, 54 / 255);
const paper = rgb(247 / 255, 243 / 255, 232 / 255);
const rule = rgb(196 / 255, 186 / 255, 164 / 255);

export async function renderDiplomaPdf(fields: DiplomaFields): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  page.drawRectangle({ x: 0, y: 0, width: 612, height: 792, color: paper });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: 540,
    height: 720,
    borderColor: pine,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 46,
    y: 46,
    width: 520,
    height: 700,
    borderColor: rule,
    borderWidth: 0.75,
  });

  const center = (text: string, y: number, size: number, font = serif, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (612 - w) / 2, y, size, font, color });
  };

  center(fields.university.toUpperCase(), 680, 22, serifBold, pine);
  center("Office of the Registrar", 656, 12, serifItalic, pine);
  page.drawLine({ start: { x: 180, y: 640 }, end: { x: 432, y: 640 }, thickness: 0.6, color: rule });
  center("This is to certify that", 600, 13, serifItalic);
  center(fields.holder, 560, 28, serifBold, ink);
  center("has been awarded the degree of", 522, 13, serifItalic);
  center(fields.degree, 486, 20, serifBold, pine);
  center(`Issued ${fields.issued}`, 430, 12, serif);

  page.drawCircle({ x: 306, y: 280, size: 52, borderColor: pine, borderWidth: 1.25 });
  page.drawCircle({ x: 306, y: 280, size: 44, borderColor: rule, borderWidth: 0.6 });
  center("SEAL", 274, 11, serifBold, pine);

  center("Integrity hash is bound off-document in the verifiable credential.", 140, 9, serifItalic);
  const idLine = fields.credentialId.length > 64 ? `${fields.credentialId.slice(0, 64)}…` : fields.credentialId;
  const idWidth = mono.widthOfTextAtSize(idLine, 8);
  page.drawText(idLine, { x: (612 - idWidth) / 2, y: 118, size: 8, font: mono, color: pine });

  return pdf.save();
}

/** Mutate a single byte so SHA-256 changes. Used by the tamper demonstration. */
export function tamperOneByte(bytes: Uint8Array, index = 80): Uint8Array {
  const next = new Uint8Array(bytes);
  const i = Math.min(index, next.byteLength - 1);
  next[i] = next[i] === 0 ? 1 : (next[i]! ^ 0xff);
  return next;
}

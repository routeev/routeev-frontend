/**
 * Achica y comprime una foto ANTES de subirla, portado de
 * resizePhotoForUpload en js/profile.js. El backend no puede redimensionar
 * (sin Pillow) y una foto de celular sin tocar pesa varios MB; con 800px de
 * lado mayor en JPEG 0.82 queda en unos cientos de KB. El límite duro del
 * servidor (MAX_VEHICLE_PHOTO_BYTES) queda como red de contención, no como
 * el camino normal.
 */
const MAX_DIM = 800;
const JPEG_QUALITY = 0.82;

export async function resizePhotoForUpload(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen"))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

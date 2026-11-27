/**
 * Compresses an uploaded image File into a compact JPEG Data URL (< 90 KB)
 * suitable for storing on Firestore complaint documents (rule limit: 120,000 chars).
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxWidth = 640,
  maxBytes = 90_000,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a valid image file (PNG, JPG, WebP).");
  }

  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not decode image."));
      el.src = bitmapUrl;
    });

    const scale = Math.min(1, maxWidth / Math.max(1, img.width));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas image compression unavailable.");
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.72;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    while (dataUrl.length > maxBytes && quality > 0.25) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    if (dataUrl.length > 115_000) {
      throw new Error("Image is still too large after compression. Please pick a smaller photo.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

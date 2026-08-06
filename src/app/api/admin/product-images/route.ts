import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import {
  isStorageConfigured,
  uploadProductImage,
} from "@/lib/storage";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const IMAGE_FORMATS = {
  "image/jpeg": {
    extension: "jpg",
    matches: (bytes: Uint8Array) =>
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  "image/png": {
    extension: "png",
    matches: (bytes: Uint8Array) =>
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (byte, index) => bytes[index] === byte,
      ),
  },
  "image/webp": {
    extension: "webp",
    matches: (bytes: Uint8Array) =>
      ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP",
  },
} as const;

export async function POST(req: NextRequest) {
  const auth = await requireRole("FLORIST", "ADMIN");
  if (!auth.ok) {
    return NextResponse.json({ error: "Forbidden." }, { status: auth.status });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { error: "Image storage is not configured." },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must contain a valid image upload." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 },
    );
  }

  const format = IMAGE_FORMATS[file.type as keyof typeof IMAGE_FORMATS];
  if (!format) {
    return NextResponse.json(
      { error: "Use a JPG, PNG, or WebP image." },
      { status: 415 },
    );
  }

  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "The image must be smaller than 4 MB." },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.matches(bytes)) {
    return NextResponse.json(
      { error: "The selected file is not a valid image." },
      { status: 415 },
    );
  }

  const month = new Date().toISOString().slice(0, 7);
  const path = `${month}/${randomUUID()}.${format.extension}`;

  try {
    const url = await uploadProductImage(
      Buffer.from(bytes),
      path,
      file.type,
    );
    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    console.error("[admin/product-images] upload failed:", error);
    return NextResponse.json(
      { error: "The image could not be uploaded. Please try again." },
      { status: 502 },
    );
  }
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

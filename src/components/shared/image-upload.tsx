"use client";

import React, { useState, useCallback, useEffect } from "react";
import { X, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createBillImageUpload } from "@/lib/actions/images";

// Must match MAX_IMAGE_BYTES in src/lib/r2.ts
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

interface ImageUploadProps {
  // Either an existing image's URL (e.g. /api/bills/image/<id>) for preview,
  // or the R2 key of a new upload made by this component
  value?: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  // Local preview of a freshly uploaded image (its R2 key isn't viewable directly)
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const previewSrc = value?.startsWith("/") || value?.startsWith("http") ? value : localPreview;

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/") && !file.name.match(/\.(heic|heif)$/i)) {
        setError("Please select an image file");
        return;
      }

      setIsUploading(true);
      setError(null);
      setCompressionInfo(null);

      try {
        const originalSize = file.size;
        let blob: Blob;

        try {
          // Try canvas compression first
          blob = await compressImage(file);
        } catch (compressionError) {
          // If canvas fails (some HEIC/edited photos), upload the original if it's a supported type
          console.warn("Canvas compression failed, uploading original:", compressionError);
          if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            throw new Error("Could not read this image format. Try taking a screenshot of the bill instead.");
          }
          blob = file;
        }

        if (blob.size > MAX_UPLOAD_BYTES) {
          throw new Error(
            "Image is too large even after compression. Please take a new photo or use a screenshot of the bill."
          );
        }

        // Upload straight to Cloudflare R2 with a short-lived signed URL
        const { key, uploadUrl } = await createBillImageUpload(blob.type, blob.size);
        const response = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": blob.type },
          body: blob,
        });
        if (!response.ok) {
          throw new Error("Upload failed. Please check your connection and try again.");
        }

        const reduction = Math.round(((originalSize - blob.size) / originalSize) * 100);
        setCompressionInfo(
          reduction > 0
            ? `${formatBytes(originalSize)} → ${formatBytes(blob.size)} (${reduction}% smaller)`
            : formatBytes(blob.size)
        );
        setLocalPreview(URL.createObjectURL(blob));
        onChange(key);
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Failed to process image. Try taking a new photo instead.");
        setCompressionInfo(null);
      } finally {
        setIsUploading(false);
      }
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
      e.target.value = "";
    },
    [handleFileSelect]
  );

  // Show uploaded image preview
  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc || undefined}
            alt="Bill image"
            className="max-h-48 rounded-lg border object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => {
              onChange(null);
              setError(null);
              setCompressionInfo(null);
              setLocalPreview(null);
            }}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        {compressionInfo && (
          <p className="text-[10px] text-emerald-600">Compressed: {compressionInfo}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 transition-colors",
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={disabled || isUploading}
        />
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">
              Compressing & uploading...
            </p>
            <p className="text-[10px] text-muted-foreground">
              Large photos may take a few seconds
            </p>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Upload bill image</p>
              <p className="text-xs text-muted-foreground">
                Take photo or choose from gallery
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// COMPRESS IMAGE TO A JPEG BLOB
// Handles: JPEG, PNG, WebP, HEIC (iPhone)
// Keeps bills readable: starts at high quality and only
// shrinks further if the photo is still too large
// =====================================================
async function compressImage(file: File): Promise<Blob> {
  const img = await loadImage(file);

  const passes = [
    { maxDim: 2000, quality: 0.8 },
    { maxDim: 1600, quality: 0.75 },
    { maxDim: 1400, quality: 0.7 },
    { maxDim: 1200, quality: 0.6 },
  ];

  const TARGET = 700 * 1024; // ~700KB keeps small print legible

  let blob: Blob | null = null;
  for (const pass of passes) {
    blob = await drawToCanvas(img, pass.maxDim, pass.quality);
    if (blob.size <= TARGET) return blob;
  }
  return blob!;
}

// Load any image file (including HEIC) into an HTMLImageElement
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => {
      // Clean up the object URL
      URL.revokeObjectURL(img.src);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      // Fallback: try using FileReader (helps with some HEIC on Safari)
      const reader = new FileReader();
      reader.onload = () => {
        const img2 = new window.Image();
        img2.onload = () => resolve(img2);
        img2.onerror = () => reject(new Error("Could not read this image format. Try taking a screenshot of the bill instead."));
        img2.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.readAsDataURL(file);
    };

    // Try object URL first (faster, works for JPEG/PNG/WebP)
    img.src = URL.createObjectURL(file);
  });
}

// Draw image to canvas and return a JPEG blob
function drawToCanvas(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  let { width, height } = img;

  // Scale down — maintain aspect ratio
  if (width > height) {
    if (width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  canvas.width = width;
  canvas.height = height;

  // White background
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // JPEG for best compatibility with Safari/iOS
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not compress image"))),
      "image/jpeg",
      quality
    );
  });
}

// Format bytes for display
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

"use client";

import React, { useState, useCallback } from "react";
import { X, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}

export function ImageUpload({ value, onChange, disabled }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

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
        let dataUrl: string;

        try {
          // Try canvas compression first
          dataUrl = await compressToBase64(file);
        } catch (compressionError) {
          // If canvas fails (some HEIC/edited photos), use FileReader as fallback
          console.warn("Canvas compression failed, using FileReader fallback:", compressionError);
          dataUrl = await fileToBase64(file);
        }

        // Check final size
        const base64Size = Math.round((dataUrl.length * 3) / 4);

        if (base64Size > 800 * 1024) {
          throw new Error(
            "Image is too large even after compression. Please take a new photo or use a screenshot of the bill."
          );
        }

        const reduction = Math.round(
          ((originalSize - base64Size) / originalSize) * 100
        );
        setCompressionInfo(
          `${formatBytes(originalSize)} → ${formatBytes(base64Size)} (${reduction}% smaller)`
        );

        onChange(dataUrl);
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
            src={value}
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
              Compressing image...
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
// COMPRESS IMAGE TO BASE64 DATA URL
// Handles: JPEG, PNG, WebP, HEIC (iPhone)
// Multi-pass: tries progressively smaller sizes
// =====================================================
async function compressToBase64(file: File): Promise<string> {
  // Load the image into an HTMLImageElement
  const img = await loadImage(file);

  // Try multiple passes — progressively more aggressive
  const passes = [
    { maxDim: 1000, quality: 0.6 },
    { maxDim: 800, quality: 0.5 },
    { maxDim: 600, quality: 0.4 },
    { maxDim: 400, quality: 0.3 },
    { maxDim: 300, quality: 0.2 },
  ];

  const TARGET = 300 * 1024; // Target: 300KB binary (will be ~400KB as base64)

  for (const pass of passes) {
    const dataUrl = drawToCanvas(img, pass.maxDim, pass.quality);
    // Rough estimate of binary size from base64
    const estimatedBinary = Math.round(((dataUrl.length - 23) * 3) / 4);

    if (estimatedBinary <= TARGET) {
      return dataUrl;
    }
  }

  // If nothing worked, return the most compressed version
  return drawToCanvas(img, 300, 0.2);
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

// Draw image to canvas and return base64 JPEG data URL
function drawToCanvas(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): string {
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

  // Return as JPEG data URL (best compatibility with Safari/iOS)
  return canvas.toDataURL("image/jpeg", quality);
}

// Format bytes for display
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Fallback: convert file directly to base64 without canvas (no compression)
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
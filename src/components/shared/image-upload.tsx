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
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      setIsUploading(true);
      setError(null);
      setCompressionInfo(null);

      try {
        const originalSize = file.size;

        // Multi-pass compression to guarantee small output
        const compressed = await compressImageSmart(file);
        const compressedSize = compressed.size;

        const reduction = Math.round(
          ((originalSize - compressedSize) / originalSize) * 100
        );
        setCompressionInfo(
          `Compressed: ${formatBytes(originalSize)} → ${formatBytes(compressedSize)} (${reduction}% smaller)`
        );

        // Create FormData for upload
        const formData = new FormData();
        formData.append("file", compressed);

        const response = await fetch("/api/bills/upload", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        onChange(data.url);
      } catch (err: any) {
        console.error("Upload error:", err);
        setError(err.message || "Failed to upload image. Please try again.");
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
          <p className="text-[10px] text-emerald-600">{compressionInfo}</p>
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
        {/*
          NO capture attribute — this lets iOS show the full picker:
          "Take Photo", "Photo Library", "Browse Files"
        */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
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

// ===== SMART COMPRESSION =====
// Handles iPhone 16 (48MP, 10-15MB HEIC) down to <300KB
// Uses multiple passes with decreasing quality if needed
async function compressImageSmart(file: File): Promise<File> {
  const TARGET_SIZE = 300 * 1024; // 300KB target (server allows up to 500KB)

  // First pass: resize to max 1000px and quality 0.6
  let result = await compressImage(file, 1000, 0.6);

  // If still too large, try smaller dimensions
  if (result.size > TARGET_SIZE) {
    result = await compressImage(file, 700, 0.5);
  }

  // If STILL too large (huge 48MP source), go even smaller
  if (result.size > TARGET_SIZE) {
    result = await compressImage(file, 500, 0.4);
  }

  // Final resort for extremely large images
  if (result.size > TARGET_SIZE) {
    result = await compressImage(file, 400, 0.3);
  }

  return result;
}

// ===== CORE COMPRESSION =====
async function compressImage(
  file: File,
  maxDimension: number,
  quality: number
): Promise<File> {
  return new Promise((resolve) => {
    const img = new window.Image();

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(file);
          return;
        }

        let { width, height } = img;

        // Scale down — limit both width and height
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

        // White background (in case of transparent PNGs)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try JPEG (universally supported, good compression)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, ".jpg"),
                { type: "image/jpeg", lastModified: Date.now() }
              );
              resolve(compressed);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        resolve(file);
      }
    };

    img.onerror = () => {
      resolve(file);
    };

    img.src = URL.createObjectURL(file);
  });
}

// ===== FORMAT BYTES =====
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
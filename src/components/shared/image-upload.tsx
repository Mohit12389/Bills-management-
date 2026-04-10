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

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        // Client-side compression — aggressive to keep DB small
        const compressed = await compressImage(file, 800, 0.5);

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
      // Reset input so same file can be selected again
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
            }}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-[10px] text-emerald-600">Image uploaded successfully</p>
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
          capture="environment"
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
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <ImageIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Upload bill image</p>
              <p className="text-xs text-muted-foreground">
                Tap to take photo or choose from gallery
              </p>
            </div>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// Client-side image compression — aggressive settings
async function compressImage(
  file: File,
  maxWidth: number,
  quality: number
): Promise<File> {
  return new Promise((resolve, reject) => {
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

        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Also limit height
        if (height > maxWidth) {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first (best compression), fallback to JPEG
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressed = new File(
                [blob],
                file.name.replace(/\.[^.]+$/, ".webp"),
                { type: "image/webp", lastModified: Date.now() }
              );
              resolve(compressed);
            } else {
              // WebP not supported, try JPEG
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) {
                    const compressed = new File(
                      [jpegBlob],
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
            }
          },
          "image/webp",
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
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageViewerProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export function ImageViewer({ open, onClose, imageUrl, title }: ImageViewerProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || "Bill Image"}</DialogTitle>
        </DialogHeader>
        <div className="relative max-h-[70vh] overflow-auto rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title || "Bill"}
            className="w-full rounded-lg object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
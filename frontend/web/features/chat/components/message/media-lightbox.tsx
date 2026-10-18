"use client";

import React, { useState, useEffect, useRef } from "react";
import { DialogSurface } from "@/components/ui/dialog";
import { saveAs } from "file-saver";
import {
  X,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaItem {
  id: string;
  fileUrl: string;
  name: string;
  type?: string;
}

interface MediaLightboxProps {
  medias: MediaItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function MediaLightbox({
  medias,
  initialIndex,
  onClose,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imgRef = useRef<HTMLImageElement>(null);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {

      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, onClose]);

  const resetView = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleNext = () => {
    if (currentIndex < medias.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      resetView();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      resetView();
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setScale((prev) => {
      const newScale = Math.max(prev - 0.5, 0.5);
      if (newScale === 0.5) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  const handleRotate = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRotation((prev) => prev + 90);
  };

  const handleReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    resetView();
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  if (!medias || medias.length === 0 || !mounted) return null;

  const currentMedia = medias[currentIndex];

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(currentMedia.fileUrl);
      const blob = await response.blob();
      saveAs(blob, currentMedia.name);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  const content = (
    <div data-ui-interaction-exception="Backdrop dismissal; close button and Escape are available."
      className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay/95 text-media-foreground [&_button:focus-visible]:outline-media-foreground backdrop-blur-sm select-none"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-media-surface">
        <span className="text-media-foreground text-sm">{currentMedia.name}</span>
        <div className="flex items-center gap-2">
          <Button variant="unstyled"
            onClick={handleDownload}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground bg-media-surface hover:bg-overlay rounded-full transition"
            title="Download"
          >
            <Download size={24} />
          </Button>
          <Button variant="unstyled"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground bg-media-surface hover:bg-overlay rounded-full transition"
            title="Close"
          >
            <X size={24} />
          </Button>
        </div>
      </div>

      {/* Navigation Prev */}
      {currentIndex > 0 && (
        <Button variant="unstyled" aria-label="Previous media"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="cursor-pointer absolute left-4 p-3 text-media-foreground hover:text-media-foreground bg-media-surface hover:bg-overlay rounded-full z-10 transition"
        >
          <ChevronLeft size={32} />
        </Button>
      )}

      {/* Image / Video Container */}
      <div
        className="relative w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={currentMedia.type !== "VIDEO" ? handleWheel : undefined}
        onMouseDown={
          currentMedia.type !== "VIDEO" ? handleMouseDown : undefined
        }
        onMouseMove={
          currentMedia.type !== "VIDEO" ? handleMouseMove : undefined
        }
        onMouseUp={currentMedia.type !== "VIDEO" ? handleMouseUp : undefined}
        onMouseLeave={currentMedia.type !== "VIDEO" ? handleMouseUp : undefined}
      >
        {currentMedia.type === "VIDEO" ? (
          <video
            src={currentMedia.fileUrl}
            controls
            autoPlay
            className="max-w-full max-h-full object-contain outline-none"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "80vh", maxWidth: "80vw" }}
          />
        ) : (
          <img data-ui-interaction-exception="Media drag surface; click only prevents backdrop dismissal."
            ref={imgRef}
            src={currentMedia.fileUrl}
            alt={currentMedia.name}
            className="cursor-pointer max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              cursor:
                scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            }}
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>

      {/* Navigation Next */}
      {currentIndex < medias.length - 1 && (
        <Button variant="unstyled" aria-label="Next media"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="cursor-pointer absolute right-4 p-3 text-media-foreground hover:text-media-foreground bg-media-surface hover:bg-overlay rounded-full z-10 transition"
        >
          <ChevronRight size={32} />
        </Button>
      )}

      {/* Zoom Controls */}
      {currentMedia.type !== "VIDEO" && (
        <div data-ui-interaction-exception="Propagation boundary; no action."
          className="absolute bottom-3 left-1/2 -translate-x-1/2 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 overflow-x-auto bg-media-surface px-3 py-2 rounded-full backdrop-blur-md z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="unstyled"
            onClick={handleZoomOut}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground transition"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </Button>
          <span className="cursor-pointer text-media-foreground text-sm font-medium w-12 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="unstyled"
            onClick={handleZoomIn}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground transition"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </Button>
          <div className="w-[1px] h-6 bg-media-foreground/30 mx-2"></div>
          <Button variant="unstyled"
            onClick={handleRotate}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground transition"
            title="Rotate"
          >
            <RotateCcw size={18} style={{ transform: "scaleX(-1)" }} />
          </Button>
          <Button variant="unstyled"
            onClick={handleReset}
            className="cursor-pointer p-2 text-media-foreground hover:text-media-foreground transition"
            title="Reset View"
          >
            <RotateCcw size={18} />
          </Button>
        </div>
      )}
    </div>
  );

  return <DialogSurface onClose={onClose} aria-label="Media preview">{content}</DialogSurface>;
}

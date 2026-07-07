import React, { useState, useEffect } from "react";

interface DynamicLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const DynamicLogo: React.FC<DynamicLogoProps> = ({ src, alt, className }) => {
  const [processedSrc, setProcessedSrc] = useState(src);
  const [isTransparent, setIsTransparent] = useState(false);

  useEffect(() => {
    if (!src) return;

    // Reset states on source change
    setIsTransparent(false);
    setProcessedSrc(src);

    const img = new Image();
    // Allow cross-origin images to prevent canvas tainted security errors
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample the top-left corner pixel to detect background color
        const rBg = data[0];
        const gBg = data[1];
        const bBg = data[2];
        const aBg = data[3];

        // Background is solid if it is fully opaque and either close to black or close to white
        const isBlack = rBg < 45 && gBg < 45 && bBg < 45;
        const isWhite = rBg > 210 && gBg > 210 && bBg > 210;

        if (aBg > 0 && (isBlack || isWhite)) {
          // Key out the background color with a color difference threshold
          const threshold = 48;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const diff = Math.sqrt(
              Math.pow(r - rBg, 2) +
              Math.pow(g - gBg, 2) +
              Math.pow(b - bBg, 2)
            );

            if (diff < threshold) {
              data[i + 3] = 0; // Set alpha channel to 0 (fully transparent)
            }
          }
          ctx.putImageData(imgData, 0, 0);
          setProcessedSrc(canvas.toDataURL());
          setIsTransparent(true);
        }
      } catch (err) {
        console.warn("Failed canvas logo processing (CORS or other issue):", err);
      }
    };

    img.onerror = () => {
      setProcessedSrc(src);
    };

    img.src = src;
  }, [src]);

  // Use dynamic blend mode styles if canvas conversion is bypassed or fails
  const blendClass = isTransparent
    ? ""
    : "mix-blend-multiply dark:mix-blend-screen";

  return (
    <img
      src={processedSrc}
      alt={alt}
      className={`${className || ""} ${blendClass} transition-all duration-300`}
    />
  );
};

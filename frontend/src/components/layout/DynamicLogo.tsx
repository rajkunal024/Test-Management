import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";

interface DynamicLogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const DynamicLogo: React.FC<DynamicLogoProps> = ({ src, alt, className }) => {
  const [lightSrc, setLightSrc] = useState(src);
  const [darkSrc, setDarkSrc] = useState(src);
  const [isTransparent, setIsTransparent] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!src) return;

    setIsTransparent(false);
    setLightSrc(src);
    setDarkSrc(src);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        // Sample corner to detect background color
        const rBg = data[0];
        const gBg = data[1];
        const bBg = data[2];
        const aBg = data[3];

        const isBlack = rBg < 45 && gBg < 45 && bBg < 45;
        const isWhite = rBg > 210 && gBg > 210 && bBg > 210;

        if (aBg > 0 && (isBlack || isWhite)) {
          const threshold = 48;
          // Duplicate image data for dark mode rendering
          const darkData = new Uint8ClampedArray(data);

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
              data[i + 3] = 0; // Alpha 0 for light mode
              darkData[i + 3] = 0; // Alpha 0 for dark mode
            } else {
              // For dark mode: transform dark text/ink to crisp white, preserving colored emblems
              const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
              const saturation = Math.max(r, g, b) - Math.min(r, g, b);
              if (brightness < 125 && saturation < 70) {
                darkData[i] = 255;
                darkData[i + 1] = 255;
                darkData[i + 2] = 255;
              }
            }
          }

          // Light mode version
          ctx.putImageData(imgData, 0, 0);
          setLightSrc(canvas.toDataURL());

          // Dark mode version
          const darkImgData = new ImageData(darkData, canvas.width, canvas.height);
          ctx.putImageData(darkImgData, 0, 0);
          setDarkSrc(canvas.toDataURL());

          setIsTransparent(true);
        }
      } catch (err) {
        console.warn("Canvas logo processing bypassed:", err);
      }
    };

    img.onerror = () => {
      setLightSrc(src);
      setDarkSrc(src);
    };

    img.src = src;
  }, [src]);

  const currentSrc = isDark ? darkSrc : lightSrc;
  const blendClass = isTransparent
    ? ""
    : "mix-blend-multiply dark:mix-blend-screen";

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={`${className || ""} ${blendClass} transition-all duration-300 ${!isTransparent && isDark ? "dark:brightness-125" : ""}`}
    />
  );
};

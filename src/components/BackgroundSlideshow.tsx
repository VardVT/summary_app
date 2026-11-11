import React, { useState, useEffect } from 'react';

export const BACKGROUND_IMAGES = [
  './assets/aistudio/image_57edc277.png', // Dark Blue VARD Offshore Support Vessel
  './assets/aistudio/image_41d4ed92.png', // Orange VARD Subsea Vessel
  './assets/aistudio/image_c77f0d03.png', // Teal Ocean Infinity VARD 901
  './assets/aistudio/image_4e0f6329.png', // Chemical Tanker
];

interface BackgroundSlideshowProps {
  intervalMs?: number;
  opacityClass?: string;
}

export const BackgroundSlideshow: React.FC<BackgroundSlideshowProps> = ({
  intervalMs = 10000,
  opacityClass = 'opacity-90',
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % BACKGROUND_IMAGES.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#0B1F33]">
      {BACKGROUND_IMAGES.map((imgSrc, idx) => {
        const isActive = idx === currentIndex;
        return (
          <img
            key={imgSrc}
            src={imgSrc}
            alt={`Ship Background ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover filter contrast-[1.05] transition-opacity duration-1000 ease-in-out ${opacityClass} ${
              isActive ? 'z-10 opacity-100' : 'z-0 opacity-0'
            }`}
          />
        );
      })}
      {/* Subtle Dark Gradient Overlay for UI legibility */}
      <div className="absolute inset-0 z-20 bg-gradient-to-b from-[#0B1F33]/60 via-transparent to-[#0B1F33]/75 pointer-events-none" />
    </div>
  );
};

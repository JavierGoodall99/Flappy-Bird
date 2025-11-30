
import React from 'react';

// Shared Parallax Component using Image Strip technique
// This renders 'count' copies of the image and slides them by 1/'count' of the total width
// This ensures that when the animation resets (at 100%), the first image is exactly where the second one was.
interface ParallaxLayerProps {
  image: string;
  speed: number; // seconds per loop
  count: number; // how many copies to stitch
  className?: string;
  style?: React.CSSProperties;
}

const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ image, speed, count, className, style }) => {
  const translateAmount = 100 / count;
  
  return (
    <div className={`absolute inset-0 overflow-hidden whitespace-nowrap ${className}`} style={style}>
        {/* Inject Keyframes for this specific translation requirement */}
        <style>
            {`
            @keyframes scroll-${count} {
                0% { transform: translateX(0); }
                100% { transform: translateX(-${translateAmount}%); }
            }
            `}
        </style>
        
        <div 
            className="flex h-full w-max"
            style={{
                willChange: 'transform',
                animation: `scroll-${count} ${speed}s linear infinite`
            }}
        >
            {Array.from({ length: count }).map((_, i) => (
                <img 
                    key={i} 
                    src={image} 
                    alt="" 
                    className="h-full w-auto max-w-none block select-none"
                    draggable={false}
                />
            ))}
        </div>
    </div>
  );
};

export const CityBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full bg-[#4ec0ca] overflow-hidden -z-10 pointer-events-none">
      {/* City Layer - Slow Parallax (40s) */}
      <ParallaxLayer 
        image="https://i.postimg.cc/VLvCNxmH/Gemini_Generated_Image_enihz0enihz0enih.png"
        speed={40}
        count={6}
        className="opacity-80 z-0"
      />
    </div>
  );
};

export const Ground: React.FC = () => {
  return (
      // Ground Layer - Fast Parallax (8s)
      <ParallaxLayer 
        image="https://i.postimg.cc/qBjK4JV6/Gemini_Generated_Image_ef4yjaef4yjaef4y.png"
        speed={8}
        count={100}
        className="bottom-0 left-0 w-full h-[80px] z-10 pointer-events-none"
        style={{ top: 'auto', bottom: 0 }}
      />
  );
};

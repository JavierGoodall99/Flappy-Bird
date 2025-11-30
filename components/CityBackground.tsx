
import React from 'react';
import { World } from '../types';

// Shared Parallax Component using Image Strip technique
interface ParallaxLayerProps {
  image: string;
  speed: number; // seconds per loop
  count: number; // how many copies to stitch
  className?: string;
  style?: React.CSSProperties;
  filter?: string;
}

const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ image, speed, count, className, style, filter }) => {
  const translateAmount = 100 / count;
  
  return (
    <div className={`absolute inset-0 overflow-hidden whitespace-nowrap ${className}`} style={style}>
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
                animation: `scroll-${count} ${speed}s linear infinite`,
                filter: filter
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

interface CityBackgroundProps {
  world: World;
}

export const CityBackground: React.FC<CityBackgroundProps> = ({ world }) => {
  return (
    <div 
        className="absolute inset-0 w-full h-full overflow-hidden -z-10 pointer-events-none transition-colors duration-1000"
        style={{ backgroundColor: world.skyColor }}
    >
      {/* City Layer - Slow Parallax (40s) */}
      <ParallaxLayer 
        image={world.cityImage}
        speed={40}
        count={6}
        className="opacity-80 z-0"
        filter={world.filter}
      />
    </div>
  );
};

interface GroundProps {
  world: World;
}

export const Ground: React.FC<GroundProps> = ({ world }) => {
  return (
      // Ground Layer - Fast Parallax (8s)
      <ParallaxLayer 
        image={world.groundImage}
        speed={8}
        count={100}
        className="bottom-0 left-0 w-full h-[80px] z-10 pointer-events-none"
        style={{ top: 'auto', bottom: 0 }}
        filter={world.filter}
      />
  );
};

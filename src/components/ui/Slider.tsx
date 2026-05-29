import React, { useState, useRef, useEffect } from 'react';

interface SliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  color?: string;
}

export const Slider: React.FC<SliderProps> = ({ min, max, value, onChange, color = '#3B82F6' }) => {
  const [dragging, setDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Calculate percentage position
  const getPercent = (value: number) => {
    return ((value - min) / (max - min)) * 100;
  };

  const minPos = getPercent(value[0]);
  const maxPos = getPercent(value[1]);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const percent = Math.min(Math.max(0, (e.clientX - rect.left) / rect.width), 1);
      const newValue = Math.round(min + percent * (max - min));
      
      if (dragging === 'min') {
        onChange([Math.min(newValue, value[1] - 1), value[1]]);
      } else {
        onChange([value[0], Math.max(newValue, value[0] + 1)]);
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, min, max, value, onChange]);

  return (
    <div className="relative w-full h-6 flex items-center py-1" ref={sliderRef}>
      {/* Track background */}
      <div className="absolute w-full h-1.5 bg-gray-700 rounded-full"></div>
      
      {/* Active track */}
      <div 
        className="absolute h-1.5 rounded-full"
        style={{ 
          left: `${minPos}%`, 
          width: `${maxPos - minPos}%`,
          background: color
        }}
      ></div>
      
      {/* Min thumb */}
      <div 
        className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg border -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
        style={{ 
          left: `${minPos}%`,
          borderColor: color
        }}
        onMouseDown={() => setDragging('min')}
      ></div>
      
      {/* Max thumb */}
      <div 
        className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-lg border -translate-x-1/2 cursor-pointer hover:scale-110 transition-transform z-10"
        style={{ 
          left: `${maxPos}%`,
          borderColor: color
        }}
        onMouseDown={() => setDragging('max')}
      ></div>
    </div>
  );
};

export default Slider;
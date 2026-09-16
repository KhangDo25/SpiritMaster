import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (dx: number, dy: number) => void;
  accentColor?: string;
  className?: string;
  label?: string;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  accentColor = '#F59E0B',
  className = '',
  label = 'Di Chuyển'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const maxRadius = 46;
  const deadZone = 8;

  const handlePointer = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance <= deadZone) {
      setKnobPos({ x: dx, y: dy });
      onMove(0, 0);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(distance, maxRadius);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    setKnobPos({ x: kx, y: ky });

    // Normalized input scaled by power
    const power = Math.min(1, (distance - deadZone) / (maxRadius - deadZone));
    const inputX = Math.cos(angle) * power;
    const inputY = Math.sin(angle) * power;

    onMove(inputX, inputY);
  }, [onMove, deadZone, maxRadius]);

  const resetJoystick = useCallback(() => {
    touchIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  // Touch Handlers with multi-touch isolation
  const handleTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    touchIdRef.current = touch.identifier;
    setIsActive(true);
    handlePointer(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        handlePointer(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        resetJoystick();
        break;
      }
    }
  };

  // Mouse fallback for testing
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsActive(true);
    handlePointer(e.clientX, e.clientY);

    const onMouseMove = (moveEvent: MouseEvent) => {
      handlePointer(moveEvent.clientX, moveEvent.clientY);
    };

    const onMouseUp = () => {
      resetJoystick();
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Prevent context menu and accidental browser gesture triggers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const preventDefault = (e: Event) => e.preventDefault();
    el.addEventListener('contextmenu', preventDefault);
    return () => {
      el.removeEventListener('contextmenu', preventDefault);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      style={{ touchAction: 'none' }}
      className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full select-none flex items-center justify-center transition-opacity ${
        isActive ? 'opacity-95 scale-102' : 'opacity-70 hover:opacity-90'
      } ${className}`}
    >
      {/* Outer Base Ring */}
      <div 
        className="absolute inset-0 rounded-full border-2 bg-slate-950/70 backdrop-blur-md shadow-2xl flex items-center justify-center pointer-events-none"
        style={{ borderColor: isActive ? accentColor : 'rgba(255,255,255,0.15)' }}
      >
        {/* Subtle crosshair guides */}
        <div className="absolute w-full h-[1px] bg-slate-800/60" />
        <div className="absolute h-full w-[1px] bg-slate-800/60" />

        {/* Directional indicators */}
        <div className="absolute top-1.5 w-1 h-1 rounded-full bg-slate-600" />
        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-slate-600" />
        <div className="absolute left-1.5 w-1 h-1 rounded-full bg-slate-600" />
        <div className="absolute right-1.5 w-1 h-1 rounded-full bg-slate-600" />
      </div>

      {/* Thumb Knob */}
      <div
        className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-lg pointer-events-none flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
          background: isActive
            ? `radial-gradient(circle, ${accentColor} 0%, #1E293B 100%)`
            : 'radial-gradient(circle, #475569 0%, #0F172A 100%)',
          border: `2px solid ${isActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}`,
          boxShadow: isActive ? `0 0 16px ${accentColor}80` : 'none'
        }}
      >
        {/* Inner Knob Dot */}
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: isActive ? '#FFFFFF' : accentColor }}
        />
      </div>

      {/* Label under joystick */}
      <span className="absolute -bottom-5 text-[10px] font-bold uppercase tracking-wider text-slate-400 pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </div>
  );
};

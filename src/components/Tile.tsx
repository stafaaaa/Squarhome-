import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { useTheme } from "../lib/ThemeContext";

export type TileSize = "small" | "medium" | "large" | "wide" | "tall";

interface TileProps {
  children: React.ReactNode;
  className?: string;
  size?: TileSize;
  color?: string;
  onClick?: () => void;
  animationType?: "flip" | "pulse" | "slide" | "none";
  label?: string;
  icon?: React.ReactNode;
  key?: React.Key;
  notificationCount?: number;
  isNotifying?: boolean;
}

const pulseAnimation = {
  scale: [1, 1.05, 1],
  transition: {
    duration: 2,
    repeat: Infinity,
    ease: "easeInOut"
  }
};

export function Tile({
  children,
  className,
  size = "small",
  color = "bg-accent",
  onClick,
  animationType = "none",
  label,
  icon,
  notificationCount = 0,
  isNotifying = false,
}: TileProps) {
  const { animationsEnabled } = useTheme();
  const [isFlipped, setIsFlipped] = React.useState(false);

  React.useEffect(() => {
    if (animationType === "flip") {
      // We'll handle flip on click instead of interval for this request
    }
  }, [animationType]);

  const handleTileClick = (e: React.MouseEvent) => {
    if (animationsEnabled && animationType === "flip") {
      setIsFlipped(!isFlipped);
    }
    if (onClick) onClick();
  };

  // Long press to enter edit mode (handled via onContextMenu for simplicity in many browsers)
  const handleContextMenu = (e: React.MouseEvent) => {
    // We'll let the parent handle this if possible, or just prevent default
    // to avoid the browser's context menu on long press
    e.preventDefault();
  };

  return (
    <motion.div
      whileHover={animationsEnabled ? { 
        scale: 1.02, 
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        zIndex: 10
      } : {}}
      whileTap={animationsEnabled ? { scale: 0.98 } : {}}
      transition={animationsEnabled ? { 
        type: "spring", 
        stiffness: 300, 
        damping: 15 
      } : { duration: 0 }}
      animate={animationsEnabled ? {
        scale: isFlipped ? 1.02 : 1,
        boxShadow: isFlipped 
          ? "0 20px 40px rgba(0,0,0,0.4)" 
          : "0 8px 32px 0 rgba(0,0,0,0.37)",
        ...(isNotifying ? {
          scale: [1, 1.02, 1],
          boxShadow: [
            "0 8px 32px 0 rgba(0,0,0,0.37)",
            "0 8px 32px 0 rgba(78,49,170,0.5)",
            "0 8px 32px 0 rgba(0,0,0,0.37)"
          ]
        } : (animationType === "pulse" ? pulseAnimation : {}))
      } : {}}
      onClick={handleTileClick}
      onContextMenu={handleContextMenu}
      className={cn(
        "relative group cursor-pointer overflow-hidden select-none",
        "bg-white/8 backdrop-blur-xl border border-white/15 rounded-[16px]",
        "transition-colors duration-300",
        className
      )}
      style={{ perspective: 1000 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isFlipped ? "back" : "front"}
          initial={animationsEnabled ? { rotateY: isFlipped ? -90 : 90, opacity: 0 } : { opacity: 1 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={animationsEnabled ? { rotateY: isFlipped ? 90 : -90, opacity: 0 } : { opacity: 0 }}
          transition={animationsEnabled ? { duration: 0.4, ease: "easeOut" } : { duration: 0 }}
          className={cn(
            "absolute inset-0 w-full h-full flex flex-col items-center justify-center",
            color.includes('/') ? color : color
          )}
        >
          {children}
          
          {icon && !isFlipped && (
            <div className="absolute top-2 right-2 opacity-40 group-hover:opacity-100 transition-opacity">
              {icon}
            </div>
          )}

          {notificationCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 left-2"
            >
              <Badge className="bg-red-500 hover:bg-red-600 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center border-none">
                {notificationCount}
              </Badge>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

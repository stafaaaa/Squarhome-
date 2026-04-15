import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

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

const sizeClasses = {
  small: "col-span-1 row-span-1 aspect-square",
  medium: "col-span-2 row-span-2 aspect-square",
  large: "col-span-4 row-span-4 aspect-square",
  wide: "col-span-2 row-span-1 aspect-[2/1]",
  tall: "col-span-1 row-span-2 aspect-[1/2]",
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
  const [isFlipped, setIsFlipped] = React.useState(false);

  React.useEffect(() => {
    if (animationType === "flip") {
      // We'll handle flip on click instead of interval for this request
    }
  }, [animationType]);

  const handleTileClick = (e: React.MouseEvent) => {
    if (animationType === "flip") {
      setIsFlipped(!isFlipped);
    }
    if (onClick) onClick();
  };

  return (
    <motion.div
      whileHover={{ 
        scale: 1.02, 
        boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        zIndex: 10
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 15 
      }}
      animate={isNotifying ? {
        scale: [1, 1.02, 1],
        boxShadow: [
          "0 8px 32px 0 rgba(0,0,0,0.37)",
          "0 8px 32px 0 rgba(78,49,170,0.5)",
          "0 8px 32px 0 rgba(0,0,0,0.37)"
        ]
      } : (animationType === "pulse" ? pulseAnimation : {})}
      onClick={handleTileClick}
      className={cn(
        "relative group cursor-pointer overflow-hidden select-none",
        "bg-white/8 backdrop-blur-xl border border-white/15 rounded-[16px] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]",
        "transition-colors duration-300",
        sizeClasses[size],
        className
      )}
      style={{ perspective: 1000 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isFlipped ? "back" : "front"}
          initial={{ rotateY: isFlipped ? -90 : 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          exit={{ rotateY: isFlipped ? 90 : -90, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={cn(
            "absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6",
            color.includes('/') ? color : color
          )}
        >
          {children}
          
          {label && (
            <div className="absolute bottom-2 left-2 text-[10px] font-medium uppercase tracking-wider opacity-80">
              {label}
            </div>
          )}
          
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

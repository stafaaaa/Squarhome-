import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTheme } from "../../lib/ThemeContext";

interface SlideshowWidgetProps {
  images?: string[];
  title?: string;
  subtitle?: string;
  speed?: number;
  transitionType?: "fade" | "slide" | "zoom";
}

const defaultImages = [
  "https://picsum.photos/seed/nature1/1200/800",
  "https://picsum.photos/seed/nature2/1200/800",
  "https://picsum.photos/seed/nature3/1200/800",
  "https://picsum.photos/seed/nature4/1200/800",
  "https://picsum.photos/seed/nature5/1200/800",
];

export function SlideshowWidget({ 
  images = defaultImages, 
  title = "Memories", 
  subtitle = "Slideshow",
  speed = 8000,
  transitionType = "fade"
}: SlideshowWidgetProps) {
  const { animationsEnabled } = useTheme();
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (images.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, speed);
    return () => clearInterval(timer);
  }, [images.length, speed]);

  if (images.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-[16px]">
        <div className="text-white/40 text-sm italic">Keine Bilder vorhanden</div>
      </div>
    );
  }

  const getAnimationProps = () => {
    if (!animationsEnabled) return { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
    
    switch (transitionType) {
      case "slide":
        return {
          initial: { x: "100%", opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: "-100%", opacity: 0 },
          transition: { duration: 0.8, ease: "easeInOut" }
        };
      case "zoom":
        return {
          initial: { scale: 1.5, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0.8, opacity: 0 },
          transition: { duration: 1.2, ease: "easeInOut" }
        };
      default: // fade
        return {
          initial: { opacity: 0, scale: 1.05 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
          transition: { duration: 1.5, ease: "easeInOut" }
        };
    }
  };

  const animation = getAnimationProps();

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[16px]">
      <AnimatePresence mode="wait">
        <motion.img
          key={images[index]}
          src={images[index]}
          {...animation}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-6">
        <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{subtitle}</div>
        <div className="text-white text-lg font-medium">{title}</div>
      </div>
      
      <div className="absolute bottom-4 right-6 flex gap-1">
        {images.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === index ? 'bg-white w-4' : 'bg-white/30'}`} 
          />
        ))}
      </div>
    </div>
  );
}

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";

const images = [
  "https://picsum.photos/seed/nature1/1200/800",
  "https://picsum.photos/seed/nature2/1200/800",
  "https://picsum.photos/seed/nature3/1200/800",
  "https://picsum.photos/seed/nature4/1200/800",
  "https://picsum.photos/seed/nature5/1200/800",
];

export function SlideshowWidget() {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[16px]">
      <AnimatePresence mode="wait">
        <motion.img
          key={images[index]}
          src={images[index]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-4 left-6">
        <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">Slideshow</div>
        <div className="text-white text-lg font-medium">Memories</div>
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

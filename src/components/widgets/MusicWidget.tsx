import { Play, SkipBack, SkipForward, Music } from "lucide-react";
import { motion } from "motion/react";

export function MusicWidget() {
  return (
    <div className="flex flex-col h-full w-full justify-between">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-pink-500 to-accent shadow-lg flex items-center justify-center overflow-hidden relative">
          <Music className="w-8 h-8 text-white/40" />
          <div className="absolute inset-0 bg-black/10" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold truncate">Midnight City</div>
          <div className="text-xs opacity-70 truncate">M83</div>
          <div className="flex gap-4 mt-2 opacity-80">
            <SkipBack className="w-4 h-4 cursor-pointer hover:text-accent transition-colors" />
            <Play className="w-4 h-4 cursor-pointer hover:text-accent transition-colors fill-current" />
            <SkipForward className="w-4 h-4 cursor-pointer hover:text-accent transition-colors" />
          </div>
        </div>
      </div>
      
      <div className="w-full h-1 bg-white/10 mt-4 relative rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: "0%" }}
          animate={{ width: "65%" }}
          className="absolute top-0 left-0 h-full bg-accent"
        />
      </div>
    </div>
  );
}

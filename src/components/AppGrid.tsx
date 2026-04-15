import * as React from "react";
import { 
  Youtube, 
  Calendar as CalendarIcon,
  Music,
  Cloud,
  LayoutGrid,
  Settings,
  Image as ImageIcon,
  Play,
  Clock,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { Tile, TileSize } from "./Tile";
import { ClockWidget } from "./widgets/ClockWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { SlideshowWidget } from "./widgets/SlideshowWidget";
import { ScrollArea } from "./ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "./ui/dialog";
import { Button } from "./ui/button";

interface AppConfig {
  id: string;
  name: string;
  packageName: string;
  icon: React.ReactNode;
  color: string;
  size: TileSize;
  info: string;
  intent: string;
}

const apps: AppConfig[] = [
  { 
    id: "yt", 
    name: "YouTube", 
    packageName: "com.google.android.youtube", 
    icon: <Youtube className="w-12 h-12" />, 
    color: "bg-red-600/20", 
    size: "medium",
    info: "Trending: Music & Gaming",
    intent: "intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end"
  },
  { 
    id: "cal", 
    name: "Kalender", 
    packageName: "com.google.android.calendar", 
    icon: <CalendarIcon className="w-12 h-12" />, 
    color: "bg-blue-600/20", 
    size: "medium",
    info: "Nächster Termin: 15:30 Team Meeting",
    intent: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALENDAR;end"
  },
  { 
    id: "amzn", 
    name: "Amazon Music", 
    packageName: "com.amazon.mp3", 
    icon: <Music className="w-12 h-12" />, 
    color: "bg-cyan-600/20", 
    size: "medium",
    info: "Zuletzt gehört: Chill Mix",
    intent: "intent://#Intent;package=com.amazon.mp3;scheme=amznmp3;end"
  },
  { 
    id: "spot", 
    name: "Spotify", 
    packageName: "com.spotify.music", 
    icon: <Play className="w-12 h-12" />, 
    color: "bg-green-600/20", 
    size: "medium",
    info: "Playlist: Daily Mix 1",
    intent: "intent://#Intent;package=com.spotify.music;scheme=spotify;end"
  },
  { 
    id: "gal", 
    name: "Galerie", 
    packageName: "com.google.android.apps.photos", 
    icon: <ImageIcon className="w-12 h-12" />, 
    color: "bg-orange-600/20", 
    size: "medium",
    info: "12 neue Fotos heute",
    intent: "intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_GALLERY;end"
  },
];

export function AppGrid() {
  const [errorApp, setErrorApp] = React.useState<string | null>(null);

  const openApp = (app: AppConfig) => {
    // In a real Android environment, this would trigger the intent.
    // In the browser, we try to open the deep link.
    window.location.href = app.intent;
    
    // Fallback notification for simulation
    setTimeout(() => {
      setErrorApp(app.name);
    }, 500);
  };

  return (
    <ScrollArea className="h-screen w-full px-6 py-10 md:px-16 lg:px-24">
      <div className="max-w-[1600px] mx-auto">
        <header className="flex justify-between items-end mb-16">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-col gap-1"
          >
            <div className="text-accent font-bold tracking-[0.3em] text-xs uppercase">Dashboard</div>
            <h1 className="text-4xl font-light tracking-tight">Guten Tag</h1>
          </motion.div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-8"
          >
            <div className="flex flex-col items-end">
              <div className="text-3xl font-light tracking-tighter">14:28</div>
              <div className="text-[10px] uppercase tracking-widest opacity-40">Montag, 15. April</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <Settings className="w-5 h-5 opacity-40" />
            </div>
          </motion.div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-[minmax(180px,auto)]">
          {/* Slideshow - Dominant 1/3 of screen */}
          <div className="md:col-span-2 lg:col-span-2 row-span-2">
            <Tile size="large" className="w-full h-full p-0 border-none bg-transparent shadow-2xl">
              <SlideshowWidget />
            </Tile>
          </div>

          {/* Clock & Weather */}
          <Tile size="medium" color="bg-white/5" className="border-white/10">
            <ClockWidget />
          </Tile>
          
          <Tile size="medium" color="bg-accent/20" className="border-accent/10">
            <WeatherWidget />
          </Tile>

          {/* App Tiles */}
          {apps.map((app) => (
            <Tile 
              key={app.id}
              size={app.size}
              color={app.color}
              animationType="flip"
              label={app.name}
              onClick={() => openApp(app)}
            >
              {/* Front Side */}
              <div className="flex flex-col items-center justify-center gap-4 h-full">
                <div className="p-4 rounded-3xl bg-white/5 border border-white/10 shadow-inner">
                  {app.icon}
                </div>
                <div className="text-lg font-medium tracking-tight">{app.name}</div>
              </div>

              {/* Back Side (Handled by Tile component's internal state) */}
              <div className="flex flex-col items-center justify-center gap-4 h-full text-center px-4">
                <ExternalLink className="w-8 h-8 opacity-40 mb-2" />
                <div className="text-sm font-medium leading-relaxed">{app.info}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-40 mt-2">Tippen zum Öffnen</div>
              </div>
            </Tile>
          ))}

          {/* System Info */}
          <Tile size="wide" color="bg-white/5" className="border-white/10 md:col-span-2 lg:col-span-2">
            <div className="flex w-full h-full items-center justify-around px-8">
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl font-light">82%</div>
                <div className="text-[10px] uppercase tracking-widest opacity-40">Akku</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl font-light">24°C</div>
                <div className="text-[10px] uppercase tracking-widest opacity-40">Berlin</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex flex-col items-center gap-2">
                <div className="text-2xl font-light">65%</div>
                <div className="text-[10px] uppercase tracking-widest opacity-40">Speicher</div>
              </div>
            </div>
          </Tile>
        </div>
        
        <footer className="mt-24 pb-12 flex justify-center opacity-20">
          <div className="text-[10px] uppercase tracking-[0.5em]">Kiosk Mode Active</div>
        </footer>
      </div>

      <Dialog open={!!errorApp} onOpenChange={() => setErrorApp(null)}>
        <DialogContent className="bg-zinc-900/90 backdrop-blur-2xl border-white/10 text-white max-w-sm rounded-3xl">
          <DialogHeader className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <DialogTitle className="text-2xl font-light">App nicht gefunden</DialogTitle>
          </DialogHeader>
          <div className="text-center opacity-60 text-sm leading-relaxed">
            Die App <span className="text-white font-medium">{errorApp}</span> konnte auf diesem Gerät nicht gestartet werden. Bitte stellen Sie sicher, dass sie installiert ist.
          </div>
          <DialogFooter className="sm:justify-center mt-4">
            <Button onClick={() => setErrorApp(null)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-8">
              Verstanden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollArea>
  );
}

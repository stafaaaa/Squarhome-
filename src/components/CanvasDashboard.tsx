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
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  ZapOff,
  Palette,
  Maximize2,
  Menu
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "motion/react";
import { cn } from "@/lib/utils";
import { useTheme } from "../lib/ThemeContext";
import { Tile } from "./Tile";
import { ClockWidget } from "./widgets/ClockWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { SlideshowWidget } from "./widgets/SlideshowWidget";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type WidgetType = "clock" | "weather" | "slideshow" | "app" | "system";

interface TileConfig {
  id: string;
  type: WidgetType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  packageName?: string;
  iconName?: string;
  customIconUrl?: string;
  color: string;
  info: string;
  intent?: string;
  fallbackUrl?: string;
  embedUrl?: string;
  isEmbedded?: boolean;
  animationType: "flip" | "pulse" | "none";
  slideshowImages?: string[];
  slideshowSpeed?: number;
  slideshowTransition?: "fade" | "slide" | "zoom";
}

const iconMap: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-full h-full" />,
  calendar: <CalendarIcon className="w-full h-full" />,
  music: <Music className="w-full h-full" />,
  spotify: (
    <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.508 17.302c-.216.354-.675.465-1.028.249-2.818-1.722-6.365-2.111-10.542-1.157-.402.092-.803-.16-.895-.562-.092-.403.159-.804.562-.896 4.571-1.045 8.492-.595 11.655 1.338.353.215.464.674.248 1.028zm1.478-3.263c-.272.441-.846.58-1.287.308-3.225-1.983-8.142-2.557-11.958-1.399-.494.15-1.019-.129-1.169-.623-.149-.495.13-1.019.624-1.169 4.359-1.322 9.776-.682 13.482 1.595.44.273.581.846.308 1.288zm.126-3.403C15.24 8.22 8.83 8.007 5.136 9.128c-.565.171-1.163-.148-1.334-.712-.17-.565.148-1.163.713-1.334 4.239-1.287 11.317-1.037 15.864 1.662.51.303.674.96.372 1.47-.303.51-.96.674-1.47.371z"/>
    </svg>
  ),
  gallery: <ImageIcon className="w-full h-full" />,
  settings: <Settings className="w-full h-full" />,
};

const initialTiles: TileConfig[] = [
  { 
    id: "clock", 
    type: "clock",
    name: "Uhrzeit", 
    x: 50, y: 50, w: 200, h: 200, zIndex: 1,
    color: "bg-white/5", 
    info: "Aktuelle Zeit",
    animationType: "none"
  },
  { 
    id: "weather", 
    type: "weather",
    name: "Wetter", 
    x: 270, y: 50, w: 200, h: 200, zIndex: 1,
    color: "bg-accent/20", 
    info: "Berlin: 24°C",
    animationType: "none",
    fallbackUrl: "https://www.accuweather.com/",
    embedUrl: "https://www.accuweather.com/en/de/berlin/10178/weather-forecast/178087"
  },
  { 
    id: "spot", 
    type: "app",
    name: "Spotify", 
    x: 490, y: 50, w: 400, h: 500, zIndex: 1,
    packageName: "com.spotify.music", 
    iconName: "spotify", 
    color: "bg-green-600/20", 
    info: "Deine Playlists",
    intent: "intent://#Intent;package=com.spotify.music;scheme=spotify;end",
    fallbackUrl: "https://open.spotify.com",
    embedUrl: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM3M", // Example embed
    animationType: "pulse",
    isEmbedded: true
  },
  { 
    id: "yt", 
    type: "app",
    name: "YouTube", 
    x: 50, y: 700, w: 400, h: 300, zIndex: 1,
    packageName: "com.google.android.youtube", 
    iconName: "youtube", 
    color: "bg-red-600/20", 
    info: "Videos ansehen",
    intent: "intent://www.youtube.com/#Intent;package=com.google.android.youtube;scheme=https;end",
    fallbackUrl: "https://www.youtube.com",
    embedUrl: "https://www.youtube.com/embed/videoseries?list=PLu0W_9lII9agICnT8hu4Yv_Z41rxp26Y4", // Example embed
    animationType: "flip",
    isEmbedded: true
  },
  { 
    id: "cal", 
    type: "app",
    name: "Kalender", 
    x: 910, y: 50, w: 400, h: 600, zIndex: 1,
    packageName: "com.google.android.calendar", 
    iconName: "calendar", 
    color: "bg-blue-600/20", 
    info: "Termine verwalten",
    intent: "intent://calendar.google.com/#Intent;package=com.google.android.calendar;scheme=https;end",
    fallbackUrl: "https://calendar.google.com",
    embedUrl: "https://calendar.google.com/calendar/embed?src=en.german%23holiday%40group.v.calendar.google.com&ctz=Europe%2FBerlin",
    animationType: "flip",
    isEmbedded: true
  }
];

export function CanvasDashboard() {
  const { theme, setTheme, wallpaper, setWallpaper, animationsEnabled, toggleAnimations } = useTheme();
  const [tiles, setTiles] = React.useState<TileConfig[]>(() => {
    const saved = localStorage.getItem("canvas-tiles");
    return saved ? JSON.parse(saved) : initialTiles;
  });
  const [isEditing, setIsEditing] = React.useState(false);
  const [editingTile, setEditingTile] = React.useState<TileConfig | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isDesignOpen, setIsDesignOpen] = React.useState(false);
  const [isEditingSlideshow, setIsEditingSlideshow] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isUiVisible, setIsUiVisible] = React.useState(true);
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const uiTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  React.useEffect(() => {
    localStorage.setItem("canvas-tiles", JSON.stringify(tiles));
  }, [tiles]);

  // Fully Kiosk Browser Integration
  React.useEffect(() => {
    const initFully = () => {
      if (typeof (window as any).fully !== 'undefined') {
        const fully = (window as any).fully;
        fully.setFullscreen(true);
        fully.hideNavigationBar();
        fully.hideStatusBar();
        fully.setKeepScreenOn(true);
      }
    };
    initFully();
    // Re-check periodically in case fully object is injected late
    const interval = setInterval(initFully, 2000);
    return () => clearInterval(interval);
  }, []);

  // UI Auto-hide logic
  const resetUiTimeout = React.useCallback(() => {
    setIsUiVisible(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    if (!isEditing && !isMenuOpen && !editingTile && !isDesignOpen && !isEditingSlideshow) {
      uiTimeoutRef.current = setTimeout(() => {
        setIsUiVisible(false);
      }, 3000);
    }
  }, [isEditing, isMenuOpen, editingTile, isDesignOpen, isEditingSlideshow]);

  React.useEffect(() => {
    const handleInteraction = () => resetUiTimeout();
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('mousedown', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    
    resetUiTimeout();

    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousedown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [resetUiTimeout]);

  // Wake Lock API
  React.useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };
    requestWakeLock();
    return () => {
      if (wakeLock !== null) wakeLock.release();
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const updateTile = (id: string, updates: Partial<TileConfig>) => {
    setTiles(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...tiles.map(t => t.zIndex), 0);
    updateTile(id, { zIndex: maxZ + 1 });
  };

  const handleAddTile = () => {
    const newTile: TileConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type: "app",
      name: "New App",
      x: 100, y: 100, w: 150, h: 150, zIndex: 10,
      iconName: "settings",
      color: "bg-white/5",
      info: "Tap to configure",
      animationType: "flip"
    };
    setTiles([...tiles, newTile]);
  };

  const [isAddingWidget, setIsAddingWidget] = React.useState(false);
  const [isAndroid, setIsAndroid] = React.useState(false);

  const availableWidgets: Partial<TileConfig>[] = [
    { name: "YouTube", iconName: "youtube", color: "bg-red-600/20", fallbackUrl: "https://www.youtube.com", embedUrl: "https://www.youtube.com/embed", isEmbedded: true },
    { name: "Spotify", iconName: "spotify", color: "bg-green-600/20", fallbackUrl: "https://open.spotify.com", embedUrl: "https://open.spotify.com/embed", isEmbedded: true },
    { name: "Kalender", iconName: "calendar", color: "bg-blue-600/20", fallbackUrl: "https://calendar.google.com", embedUrl: "https://calendar.google.com/calendar/embed", isEmbedded: true },
    { name: "Wetter", iconName: "gallery", color: "bg-accent/20", fallbackUrl: "https://www.accuweather.com", embedUrl: "https://www.accuweather.com", isEmbedded: true },
    { name: "Uhr", type: "clock", color: "bg-white/5" },
    { name: "Slideshow", type: "slideshow", color: "bg-white/5" },
  ];

  const addWidget = (template: Partial<TileConfig>) => {
    const newTile: TileConfig = {
      id: Math.random().toString(36).substr(2, 9),
      type: template.type || "app",
      name: template.name || "New Widget",
      x: 100, y: 100, w: 300, h: 300, zIndex: 10,
      iconName: template.iconName,
      color: template.color || "bg-white/5",
      info: "Widget",
      fallbackUrl: template.fallbackUrl,
      embedUrl: template.embedUrl,
      isEmbedded: template.isEmbedded,
      animationType: "none"
    };
    setTiles([...tiles, newTile]);
    setIsAddingWidget(false);
  };

  React.useEffect(() => {
    // Detect if running in Capacitor/Android
    const checkPlatform = async () => {
      const isCapacitor = (window as any).Capacitor !== undefined;
      setIsAndroid(isCapacitor);
    };
    checkPlatform();
  }, []);

  const renderTileContent = (tile: TileConfig) => {
    // In Android mode, show embedded content if available
    if (isAndroid && tile.isEmbedded && tile.embedUrl) {
      return (
        <div className="w-full h-full overflow-hidden rounded-[16px] bg-black/40">
          <iframe 
            src={tile.embedUrl} 
            className="w-full h-full border-0" 
            title={tile.name}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        </div>
      );
    }

    switch (tile.type) {
      case "clock": return <ClockWidget />;
      case "weather": return <WeatherWidget />;
      case "slideshow": 
        return (
          <SlideshowWidget 
            images={tile.slideshowImages || []} 
            speed={tile.slideshowSpeed}
            transitionType={tile.slideshowTransition}
          />
        );
      case "app":
        return (
          <div className="flex flex-col items-center justify-center h-full w-full p-4">
            <div className="w-full h-full flex items-center justify-center opacity-80">
              {tile.customIconUrl ? (
                <img src={tile.customIconUrl} alt={tile.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                tile.iconName && iconMap[tile.iconName]
              )}
            </div>
          </div>
        );
      default: return null;
    }
  };

  const renderTileBackContent = (tile: TileConfig) => {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full text-center px-4">
        <ExternalLink className="w-8 h-8 opacity-40 mb-2" />
        <div className="text-sm font-medium leading-relaxed">{tile.info}</div>
        <div className="text-[10px] uppercase tracking-widest opacity-40 mt-2">
          {isEditing ? "Tippen zum Bearbeiten" : "Tippen zum Öffnen"}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden select-none">
      {/* Simulated Status Bar */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.div
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            exit={{ y: -40 }}
            className="fixed top-0 left-0 right-0 h-10 bg-black/20 backdrop-blur-md z-[900] flex items-center justify-between px-6 text-[10px] uppercase tracking-widest font-bold opacity-60 pointer-events-none"
          >
            <div>Kiosk Mode Active</div>
            <div className="flex gap-4">
              <span>WLAN: Connected</span>
              <span>Battery: 85%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Simulated Navigation Bar */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.div
            initial={{ y: 60 }}
            animate={{ y: 0 }}
            exit={{ y: 60 }}
            className="fixed bottom-0 left-0 right-0 h-14 bg-black/20 backdrop-blur-md z-[900] flex items-center justify-center gap-12"
          >
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full opacity-40 hover:opacity-100">
              <LayoutGrid className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full opacity-40 hover:opacity-100">
              <div className="w-3 h-3 rounded-full border-2 border-current" />
            </Button>
            <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full opacity-40 hover:opacity-100" onClick={() => setIsMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free Canvas Area */}
      <div className="absolute inset-0">
        <AnimatePresence>
          {tiles.map((tile) => (
            <DraggableTile
              key={tile.id}
              tile={tile}
              isEditing={isEditing}
              onUpdate={(updates) => updateTile(tile.id, updates)}
              onDelete={() => setTiles(tiles.filter(t => t.id !== tile.id))}
              onEdit={() => setEditingTile(tile)}
              onFocus={() => bringToFront(tile.id)}
              renderContent={() => renderTileContent(tile)}
              renderBackContent={() => renderTileBackContent(tile)}
              onClick={() => {
                if (!isEditing && !isAndroid && tile.fallbackUrl) {
                  window.open(tile.fallbackUrl, "_blank");
                }
              }}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Menu Trigger */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ 
          opacity: isUiVisible || isMenuOpen ? 1 : 0,
          x: isUiVisible || isMenuOpen ? 0 : 20,
          pointerEvents: isUiVisible || isMenuOpen ? "auto" : "none"
        }}
        className="fixed top-6 right-6 z-[1000]"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "w-12 h-12 rounded-2xl transition-all duration-300 backdrop-blur-xl border border-white/10",
            isMenuOpen ? "bg-accent text-white" : "bg-black/20 opacity-40 hover:opacity-100"
          )}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute top-full right-0 mt-4 w-56 bg-zinc-900/90 backdrop-blur-3xl border border-white/10 rounded-[24px] p-3 shadow-2xl flex flex-col gap-1"
            >
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-xl hover:bg-white/5"
                onClick={() => { setIsDesignOpen(true); setIsMenuOpen(false); }}
              >
                <Palette className="w-4 h-4" />
                <span>Design & Wallpaper</span>
              </Button>
              <Button 
                variant="ghost" 
                className={cn("w-full justify-start gap-3 rounded-xl hover:bg-white/5", isEditing && "text-accent")}
                onClick={() => { setIsEditing(!isEditing); setIsMenuOpen(false); }}
              >
                {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                <span>{isEditing ? "Fertig" : "Bearbeiten"}</span>
              </Button>
              {isEditing && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 rounded-xl hover:bg-white/5"
                  onClick={() => { setIsAddingWidget(true); setIsMenuOpen(false); }}
                >
                  <Plus className="w-4 h-4" />
                  <span>Widget hinzufügen</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-xl hover:bg-white/5"
                onClick={() => { toggleFullscreen(); setIsMenuOpen(false); }}
              >
                <Maximize2 className="w-4 h-4" />
                <span>{isFullscreen ? "Vollbild beenden" : "Vollbild Modus"}</span>
              </Button>
              {deferredPrompt && (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 rounded-xl hover:bg-white/5 text-accent"
                  onClick={() => { handleInstallPWA(); setIsMenuOpen(false); }}
                >
                  <Play className="w-4 h-4" />
                  <span>App installieren (PWA)</span>
                </Button>
              )}
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-3 rounded-xl hover:bg-white/5"
                onClick={() => { toggleAnimations(); setIsMenuOpen(false); }}
              >
                {animationsEnabled ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                <span>{animationsEnabled ? "Animationen: An" : "Animationen: Aus"}</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Dialogs */}
      <Dialog open={isAddingWidget} onOpenChange={() => setIsAddingWidget(false)}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-md rounded-[32px] p-8">
          <DialogHeader><DialogTitle className="text-2xl font-light">Widget Galerie</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-6">
            {availableWidgets.map((w, i) => (
              <Button 
                key={i} 
                variant="outline" 
                className="h-24 flex flex-col gap-2 rounded-2xl border-white/10 hover:bg-white/5"
                onClick={() => addWidget(w)}
              >
                <div className="w-8 h-8 opacity-60">
                  {w.iconName ? iconMap[w.iconName] : (w.type === "clock" ? <Clock /> : <ImageIcon />)}
                </div>
                <span className="text-xs">{w.name}</span>
              </Button>
            ))}
          </div>
          <DialogFooter><Button onClick={() => setIsAddingWidget(false)} className="bg-white/10 w-full rounded-xl">Abbrechen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isDesignOpen} onOpenChange={() => setIsDesignOpen(false)}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-md rounded-[32px] p-8">
          <DialogHeader><DialogTitle className="text-2xl font-light">Design & Wallpaper</DialogTitle></DialogHeader>
          <div className="grid gap-8 py-6">
            <div className="grid gap-4">
              <Label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Themes</Label>
              <div className="grid grid-cols-2 gap-2">
                {["dark", "light", "midnight", "forest", "sunset", "cyberpunk"].map(id => (
                  <Button key={id} variant="outline" onClick={() => setTheme(id as any)} className={cn("justify-start gap-3 rounded-xl border-white/10 hover:bg-white/5", theme === id && "border-accent bg-accent/10")}>
                    <span className="text-xs capitalize">{id}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid gap-4">
              <Label className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Live Wallpapers</Label>
              <div className="grid grid-cols-2 gap-2">
                {["none", "aurora", "particles", "mesh"].map(id => (
                  <Button key={id} variant="outline" onClick={() => setWallpaper(id as any)} className={cn("justify-start gap-3 rounded-xl border-white/10 hover:bg-white/5", wallpaper === id && "border-accent bg-accent/10")}>
                    <span className="text-xs capitalize">{id}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={() => setIsDesignOpen(false)} className="bg-accent w-full rounded-xl">Schließen</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTile} onOpenChange={() => setEditingTile(null)}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-md rounded-[32px] p-8">
          <DialogHeader><DialogTitle className="text-2xl font-light">Kachel anpassen</DialogTitle></DialogHeader>
          {editingTile && (
            <div className="grid gap-6 py-6">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={editingTile.name} onChange={(e) => updateTile(editingTile.id, { name: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label>Info</Label>
                <Input value={editingTile.info} onChange={(e) => updateTile(editingTile.id, { info: e.target.value })} className="bg-white/5 border-white/10 rounded-xl" />
              </div>

              {editingTile.type === "slideshow" && (
                <div className="grid gap-4">
                  <Button 
                    variant="outline" 
                    className="w-full bg-white/5 border-white/10 rounded-xl"
                    onClick={() => setIsEditingSlideshow(true)}
                  >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Bilder verwalten
                  </Button>
                  
                  <div className="grid gap-2">
                    <Label>Wechsel-Geschwindigkeit (ms)</Label>
                    <Input 
                      type="number"
                      value={editingTile.slideshowSpeed || 8000} 
                      onChange={(e) => updateTile(editingTile.id, { slideshowSpeed: parseInt(e.target.value) })} 
                      className="bg-white/5 border-white/10 rounded-xl" 
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Animationstyp</Label>
                    <div className="flex gap-2">
                      {["fade", "slide", "zoom"].map((type) => (
                        <Button
                          key={type}
                          variant="outline"
                          size="sm"
                          onClick={() => updateTile(editingTile.id, { slideshowTransition: type as any })}
                          className={cn(
                            "flex-1 rounded-lg border-white/10",
                            editingTile.slideshowTransition === type && "bg-accent border-accent"
                          )}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter><Button onClick={() => setEditingTile(null)} className="bg-accent w-full rounded-xl">Fertig</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditingSlideshow} onOpenChange={() => setIsEditingSlideshow(false)}>
        <DialogContent className="bg-zinc-900/95 backdrop-blur-2xl border-white/10 text-white max-w-2xl rounded-[32px] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light">Slideshow Bilder verwalten</DialogTitle>
          </DialogHeader>
          
          {editingTile?.type === "slideshow" && (
            <div className="grid gap-6 py-6">
              <div className="grid grid-cols-3 gap-4">
                {editingTile.slideshowImages?.map((img, idx) => (
                  <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group">
                    <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newImages = editingTile.slideshowImages?.filter((_, i) => i !== idx);
                        updateTile(editingTile.id, { slideshowImages: newImages });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
                <div 
                  onClick={() => {
                    const url = prompt("Bild URL eingeben:");
                    if (url) {
                      const newImages = [...(editingTile.slideshowImages || []), url];
                      updateTile(editingTile.id, { slideshowImages: newImages });
                    }
                  }}
                  className="aspect-video rounded-xl bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-6 h-6 opacity-40 mb-1" />
                  <span className="text-[10px] uppercase tracking-widest opacity-40">Hinzufügen</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsEditingSlideshow(false)} className="bg-accent w-full rounded-xl">Fertig</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DraggableTile({ 
  tile, 
  isEditing, 
  onUpdate, 
  onDelete, 
  onEdit, 
  onFocus,
  onClick,
  renderContent,
  renderBackContent
}: { 
  tile: TileConfig; 
  isEditing: boolean; 
  onUpdate: (updates: Partial<TileConfig>) => void;
  onDelete: () => void;
  onEdit: () => void;
  onFocus: () => void;
  onClick?: () => void;
  renderContent: () => React.ReactNode;
  renderBackContent: () => React.ReactNode;
  key?: React.Key;
}) {
  const { animationsEnabled } = useTheme();
  const [isDragging, setIsDragging] = React.useState(false);
  const [isResizing, setIsResizing] = React.useState(false);
  const [hasMoved, setHasMoved] = React.useState(false);

  // Manual Drag Logic using Pointer Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isEditing || isResizing) return;
    
    // Only drag if clicking the tile background, not buttons
    if ((e.target as HTMLElement).closest('button')) return;

    onFocus();
    setIsDragging(true);
    setHasMoved(false);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = tile.x;
    const initialY = tile.y;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) setHasMoved(true);
      onUpdate({ 
        x: initialX + dx, 
        y: initialY + dy 
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Manual Resize Logic using Pointer Events
  const handleResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = tile.w;
    const startH = tile.h;

    const onPointerMove = (moveEvent: PointerEvent) => {
      // Minimum size: 150x100px as requested
      const newW = Math.max(150, startW + (moveEvent.clientX - startX));
      const newH = Math.max(100, startH + (moveEvent.clientY - startY));
      onUpdate({ w: newW, h: newH });
    };

    const onPointerUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: tile.w,
        height: tile.h,
        transform: `translate(${tile.x}px, ${tile.y}px)`,
        zIndex: tile.zIndex,
        // Use transition only when NOT dragging/resizing for smoothness
        transition: (isDragging || isResizing || !animationsEnabled) 
          ? 'none' 
          : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.2s, height 0.2s',
        touchAction: 'none' // Critical for mobile drag
      }}
      className={cn(
        "select-none touch-none",
        isEditing && "cursor-move"
      )}
      onPointerDown={handlePointerDown}
    >
      <div className="relative w-full h-full group">
        <Tile 
          size="small" 
          color={tile.color} 
          animationType={tile.animationType}
          className="w-full h-full !col-span-1 !row-span-1"
          onClick={() => {
            if (!hasMoved && onClick) onClick();
          }}
        >
          {renderContent()}
          {tile.animationType === "flip" && renderBackContent()}
        </Tile>

        {isEditing && (
          <div className="absolute inset-0 pointer-events-none border-2 border-accent/30 rounded-[16px] opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Edit Controls */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.6, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ opacity: 1 }}
              className="absolute -top-3 -right-3 flex gap-1 z-50"
            >
              <Button size="icon" variant="secondary" className="w-8 h-8 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="destructive" className="w-8 h-8 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Resize Handle - Vanilla JS implementation */}
        {isEditing && (
          <div
            className={cn(
              "absolute bottom-0 right-0 w-10 h-10 cursor-nwse-resize flex items-end justify-end p-2 z-50",
              "opacity-40 hover:opacity-100 transition-opacity"
            )}
            onPointerDown={handleResizeDown}
          >
            <Maximize2 className="w-5 h-5 rotate-90 text-white/60" />
          </div>
        )}
      </div>
    </div>
  );
}

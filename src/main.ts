/* 
  myKiosk-One Core Engine
  Vanilla TypeScript/JavaScript implementation
  No external libraries, No Frameworks.
*/

interface WidgetConfig {
    id: string;
    type: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
    zIndex: number;
    content?: string;
    isEmbedded?: boolean;
    isLocked?: boolean;
    data?: any;
    lastActivity?: number;
    failureCount?: number;
    isDisabled?: boolean;
    priority?: 'HIGH' | 'MEDIUM' | 'LOW';
    usageScore?: number;
    lastStateUrl?: string;
    lastStateTime?: number;
    cubeEnabled?: boolean;
    
    // Stability & Phasing
    stateChangeTime?: number;
    pendingUnload?: boolean;
    lastReloadTime?: number;
    burstReloadCount?: number;
    cooldownUntil?: number;
}

class DashboardEngine {
    private widgets: WidgetConfig[] = [];
    private isEditMode = false;
    private isAndroid = false;
    private isSnapEnabled = false;
    private gridSize = 20;
    
    // Resource Management
    private widgetIntervals: Map<string, number[]> = new Map();
    private widgetObservers: Map<string, IntersectionObserver> = new Map();
    private activeFails: Map<string, number> = new Map();
    private storageLimitMB = 500;
    
    // Multi-select and Dragging
    private selectedIds: Set<string> = new Set();
    private activeEditId: string | null = null;
    
    private activeDragWidget: HTMLElement | null = null;
    private activeResizeWidget: HTMLElement | null = null;
    private dragStartX = 0;
    private dragStartY = 0;
    private widgetStartPositions: Map<string, {x: number, y: number}> = new Map();
    private widgetStartW = 0;
    private widgetStartH = 0;

    // Selection Box State
    private isSelecting = false;
    private selectionStartX = 0;
    private selectionStartY = 0;

    // Perf Monitoring
    private lastFrameTime = 0;
    private fpsArray: number[] = [];
    private perfMode: 'normal' | 'eco' | 'critical' | 'cooldown' = 'normal';
    private nextPerfMode: 'normal' | 'eco' | 'critical' | 'cooldown' | null = null;
    private modeStabilityTimer = 0;
    private pausedCount = 0;
    private recentReloads = 0;
    private pendingUnloadCount = 0;
    private activePreloads = 0;

    // Night Mode
    private nightOverride: 'auto' | 'on' | 'off' = 'auto';
    private isNight = false;
    private ambientLux = -1;

    constructor() {
        this.isAndroid = (window as any).Capacitor !== undefined;
        this.loadState();
        this.initUI();
        this.render();
        this.initWakeLock();
        this.initCanvasSelection();
        this.startHealthMonitor();
        this.initStorageCleanup();
        this.initNightMode();
    }

    private initNightMode() {
        const autoBtn = document.getElementById('night-auto');
        const onBtn = document.getElementById('night-on');
        const offBtn = document.getElementById('night-off');

        const setOverride = (val: 'auto' | 'on' | 'off') => {
            this.nightOverride = val;
            [autoBtn, onBtn, offBtn].forEach(btn => btn?.classList.remove('active'));
            if (val === 'auto') autoBtn?.classList.add('active');
            if (val === 'on') onBtn?.classList.add('active');
            if (val === 'off') offBtn?.classList.add('active');
            this.updateNightState();
        };

        autoBtn?.addEventListener('click', () => setOverride('auto'));
        onBtn?.addEventListener('click', () => setOverride('on'));
        offBtn?.addEventListener('click', () => setOverride('off'));

        // Ambient Light Sensor
        if ('AmbientLightSensor' in window) {
            try {
                const sensor = new (window as any).AmbientLightSensor();
                sensor.onreading = () => {
                    this.ambientLux = sensor.lux;
                    this.updateNightState();
                };
                sensor.start();
            } catch (err) { console.warn('AmbientLightSensor restricted or denied'); }
        }

        setInterval(() => this.updateNightState(), 30000); // Check every 30s
    }

    private updateNightState() {
        const now = new Date();
        const hour = now.getHours();
        
        // Logical Night: 00:00 to 06:00
        let shouldBeNight = (hour >= 0 && hour < 6);

        // Optional Light Sensor: < 10 Lux
        if (this.ambientLux >= 0 && this.ambientLux < 10) {
            shouldBeNight = true;
        }

        if (this.nightOverride === 'on') shouldBeNight = true;
        if (this.nightOverride === 'off') shouldBeNight = false;

        this.isNight = shouldBeNight;
        this.applyNightEffects();
    }

    private applyNightEffects() {
        const overlay = document.getElementById('night-overlay');
        const statusEl = document.getElementById('perf-night');
        
        if (this.isNight) {
            if (overlay) overlay.style.opacity = '0.5'; // 50% dark overlay
            document.body.classList.add('night-mode');
            if (statusEl) statusEl.innerText = 'SLEEPING';
            if (statusEl) statusEl.style.color = '#555';
        } else {
            if (overlay) overlay.style.opacity = '0';
            document.body.classList.remove('night-mode');
            if (statusEl) statusEl.innerText = 'OFF';
            if (statusEl) statusEl.style.color = '#0f0';
        }
    }

    private initUI() {
        const addBtn = document.getElementById('add-widget-btn');
        const editBtn = document.getElementById('edit-mode-btn');
        const snapBtn = document.getElementById('snap-btn');
        const lockBtn = document.getElementById('lock-btn');
        const wpBtn = document.getElementById('wp-btn');
        const modal = document.getElementById('modal-overlay');
        const typeSelect = document.getElementById('widget-type') as HTMLSelectElement;
        const confirmBtn = document.getElementById('confirm-widget');
        const cancelBtn = document.getElementById('cancel-widget');

        addBtn?.addEventListener('click', () => { modal!.style.display = 'flex'; });

        editBtn?.addEventListener('click', () => {
            this.isEditMode = !this.isEditMode;
            document.body.classList.toggle('edit-mode', this.isEditMode);
            editBtn.innerText = this.isEditMode ? 'Finish' : 'Edit Mode';
            editBtn.classList.toggle('active', this.isEditMode);
            // Toggle Performance Monitor visibility in edit mode for diagnostic access
            document.getElementById('perf-monitor')!.style.display = 'block';
            
            if (!this.isEditMode) {
                this.selectedIds.clear();
                this.activeEditId = null;
                document.getElementById('perf-monitor')!.style.display = 'none';
            }
            this.render();
        });

        snapBtn?.addEventListener('click', () => {
            this.isSnapEnabled = !this.isSnapEnabled;
            snapBtn.classList.toggle('active', this.isSnapEnabled);
        });

        lockBtn?.addEventListener('click', () => {
            if (this.selectedIds.size > 0) {
                this.selectedIds.forEach(id => {
                    const w = this.widgets.find(item => item.id === id);
                    if (w) w.isLocked = !w.isLocked;
                });
                this.saveState();
                this.render();
            }
        });

        wpBtn?.addEventListener('click', () => {
            const seed = Math.floor(Math.random() * 1000);
            const url = `https://picsum.photos/seed/${seed}/1920/1080`;
            document.getElementById('canvas')!.style.backgroundImage = `url(${url})`;
            localStorage.setItem('kiosk-wallpaper', url);
        });

        typeSelect?.addEventListener('change', () => {
            const isSlideshow = typeSelect.value === 'slideshow';
            const isUrl = typeSelect.value === 'url';
            document.getElementById('slideshow-fields')!.style.display = isSlideshow ? 'block' : 'none';
            document.getElementById('slideshow-options')!.style.display = isSlideshow ? 'block' : 'none';
            document.getElementById('url-fields')!.style.display = isUrl ? 'block' : 'none';
        });

        confirmBtn?.addEventListener('click', async () => {
            const type = typeSelect.value;
            const name = (document.getElementById('widget-name') as HTMLInputElement).value || type;
            const url = (document.getElementById('widget-url') as HTMLInputElement).value;
            
            let data = null;
            if (type === 'slideshow') {
                const input = document.getElementById('slideshow-input') as HTMLInputElement;
                const transition = (document.getElementById('slideshow-transition') as HTMLSelectElement).value;
                const speed = parseInt((document.getElementById('slideshow-speed') as HTMLInputElement).value) || 5000;
                
                if (input.files && input.files.length > 0) {
                    try {
                        const ids = await this.saveImagesToDB(input.files);
                        data = { ids, transition, speed };
                    } catch (err) {
                        alert("Storage limit reached or DB error: " + err);
                        return;
                    }
                }
            }

            this.addWidget({ type, name, content: url, data });
            modal!.style.display = 'none';
        });

        cancelBtn?.addEventListener('click', () => { modal!.style.display = 'none'; });

        const savedWP = localStorage.getItem('kiosk-wallpaper');
        if (savedWP) document.getElementById('canvas')!.style.backgroundImage = `url(${savedWP})`;
    }

    private startHealthMonitor() {
        const fpsEl = document.getElementById('perf-fps');
        const widgetEl = document.getElementById('perf-widgets');
        const statusEl = document.getElementById('perf-status');
        const ramEl = document.getElementById('perf-ram');
        const pausedEl = document.getElementById('perf-paused');
        const reloadEl = document.getElementById('perf-reloads');
        const unloadingEl = document.getElementById('perf-unloading');
        const timerEl = document.getElementById('perf-timer');

        const loop = (time: number) => {
            if (this.lastFrameTime) {
                const delta = time - this.lastFrameTime;
                const fps = Math.round(1000 / delta);
                this.fpsArray.push(fps);
                if (this.fpsArray.length > 60) this.fpsArray.shift();
                
                if (time % 1000 < 20) {
                    const avgFps = Math.round(this.fpsArray.reduce((a,b) => a+b, 0) / this.fpsArray.length);
                    if (fpsEl) fpsEl.innerText = avgFps.toString();
                    if (widgetEl) widgetEl.innerText = this.widgets.length.toString();
                    if (pausedEl) pausedEl.innerText = this.pausedCount.toString();
                    if (reloadEl) reloadEl.innerText = this.recentReloads.toString();
                    if (unloadingEl) unloadingEl.innerText = this.pendingUnloadCount.toString();
                    
                    // RAM Estimation
                    const ramRating = this.calculateRAMEstimate();
                    if (ramEl) {
                        ramEl.innerText = ramRating;
                        ramEl.style.color = ramRating === 'HIGH' ? '#f00' : (ramRating === 'MED' ? '#ff0' : '#0f0');
                    }

                    // Stability (Hysteresis) Logic for Performance Mode
                    let targetMode: 'normal' | 'eco' | 'critical' | 'cooldown' = 'normal';
                    if (avgFps < 20 && ramRating === 'HIGH') targetMode = 'cooldown';
                    else if (avgFps < 20) targetMode = 'critical';
                    else if (avgFps < 40) targetMode = 'eco';

                    if (targetMode !== this.perfMode) {
                        if (targetMode === this.nextPerfMode) {
                            this.modeStabilityTimer++;
                            // Require 5 seconds of stability to switch mode
                            if (this.modeStabilityTimer > 5) {
                                this.perfMode = targetMode;
                                this.nextPerfMode = null;
                                this.modeStabilityTimer = 0;
                            }
                        } else {
                            this.nextPerfMode = targetMode;
                            this.modeStabilityTimer = 0;
                        }
                    } else {
                        this.nextPerfMode = null;
                        this.modeStabilityTimer = 0;
                    }

                    if (timerEl) timerEl.innerText = this.modeStabilityTimer.toString();

                    if (statusEl) {
                        statusEl.innerText = this.perfMode.toUpperCase();
                        if (this.perfMode === 'cooldown' || this.perfMode === 'critical') statusEl.style.color = '#f00';
                        else if (this.perfMode === 'eco') statusEl.style.color = '#ff0';
                        else statusEl.style.color = '#0f0';
                    }
                    
                    this.updateWidgetPriorities();
                    this.decayUsageScores();
                    // Reset recent reloads counter periodically
                    if (Math.random() < 0.1) this.recentReloads = 0; 
                }
            }
            this.lastFrameTime = time;
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    private decayUsageScores() {
        this.widgets.forEach(w => {
            if (w.usageScore && w.usageScore > 0) {
                // Decay score by 5% every cycles
                w.usageScore *= 0.95;
                if (w.usageScore < 0.1) w.usageScore = 0;
            }
        });
    }

    private updateWidgetPriorities() {
        let currentPausedCount = 0;
        let pUnloadCount = 0;
        const now = Date.now();

        this.widgets.forEach(w => {
            const el = document.getElementById(w.id);
            if (!el) return;

            const isVisible = el.style.visibility !== 'hidden';
            const lastChange = w.stateChangeTime || 0;
            
            if (!isVisible) {
                // Hysteresis: ONLY move to LOW if invisible for 10s
                if (w.priority !== 'LOW') {
                    if (now - lastChange > 10000) {
                        w.priority = 'LOW';
                        w.stateChangeTime = now;
                    }
                }
                currentPausedCount++;
            } else {
                // Hysteresis: ONLY move up if visible for 2s
                if (w.priority === 'LOW') {
                    if (now - lastChange > 2000) {
                        w.priority = (now - (w.lastActivity || 0) > 300000) ? 'MEDIUM' : 'HIGH';
                        w.stateChangeTime = now;
                    }
                } else {
                    w.priority = (now - (w.lastActivity || 0) > 300000) ? 'MEDIUM' : 'HIGH';
                }
            }

            // Phased Unloading Tracking
            if (w.pendingUnload) pUnloadCount++;
        });

        this.pausedCount = currentPausedCount;
        this.pendingUnloadCount = pUnloadCount;
    }

    private calculateRAMEstimate(): string {
        let score = 0;
        this.widgets.forEach(w => {
            if (w.isDisabled) return;
            score += 10; // Base widget cost
            if (['url', 'youtube', 'spotify'].includes(w.type)) score += 50; // Iframe cost
            if (w.type === 'slideshow' && w.data?.ids) score += w.data.ids.length * 5; // Image cache cost
        });
        if (score > 400) return 'HIGH';
        if (score > 200) return 'MED';
        return 'LOW';
    }

    private async initStorageCleanup() {
        const refreshStorageInfo = async () => {
            if ('storage' in navigator && (navigator as any).storage.estimate) {
                const { usage } = await (navigator as any).storage.estimate();
                const usedMB = Math.round((usage || 0) / (1024 * 1024));
                document.getElementById('perf-storage')!.innerText = usedMB + 'MB';
                
                if (usedMB > this.storageLimitMB) {
                    await this.runLRU();
                }
            }
        };
        setInterval(refreshStorageInfo, 60000);
        refreshStorageInfo();
    }

    private async runLRU() {
        // Simple LRU: Delete first 10 images if storage exceeds
        return new Promise((resolve) => {
            const request = indexedDB.open('KioskDB', 1);
            request.onsuccess = (e: any) => {
                const db = e.target.result;
                const tx = db.transaction('images', 'readwrite');
                const store = tx.objectStore('images');
                const cursorReq = store.openCursor();
                let deletedCount = 0;
                cursorReq.onsuccess = (ev: any) => {
                    const cursor = ev.target.result;
                    if (cursor && deletedCount < 50) {
                        cursor.delete();
                        deletedCount++;
                        cursor.continue();
                    }
                };
                tx.oncomplete = () => {
                    console.log(`LRU: Deleted ${deletedCount} images to free up space.`);
                    resolve(true);
                };
            };
        });
    }

    private initCanvasSelection() {
        const canvas = document.getElementById('canvas')!;
        canvas.addEventListener('pointerdown', (e) => {
            if (!this.isEditMode) return;
            if (e.target !== canvas) return;
            
            this.isSelecting = true;
            this.selectionStartX = e.clientX;
            this.selectionStartY = e.clientY;
            this.selectedIds.clear();
            this.render();

            const box = document.getElementById('selection-box')!;
            box.style.display = 'block';
            box.style.left = `${e.clientX}px`;
            box.style.top = `${e.clientY}px`;
            box.style.width = '0px';
            box.style.height = '0px';
        });

        window.addEventListener('pointermove', (e) => {
            if (!this.isSelecting) return;
            const box = document.getElementById('selection-box')!;
            const curX = e.clientX;
            const curY = e.clientY;
            
            const left = Math.min(this.selectionStartX, curX);
            const top = Math.min(this.selectionStartY, curY);
            const width = Math.abs(curX - this.selectionStartX);
            const height = Math.abs(curY - this.selectionStartY);

            box.style.left = `${left}px`;
            box.style.top = `${top}px`;
            box.style.width = `${width}px`;
            box.style.height = `${height}px`;

            this.widgets.forEach(w => {
                const el = document.getElementById(w.id);
                if (el) {
                    const isInside = (w.x + w.w > left && w.x < left + width && w.y + w.h > top && w.y < top + height);
                    if (isInside) this.selectedIds.add(w.id);
                    else this.selectedIds.delete(w.id);
                }
            });
            this.updateSelectionClasses();
        });

        window.addEventListener('pointerup', () => {
            if (!this.isSelecting) return;
            this.isSelecting = false;
            document.getElementById('selection-box')!.style.display = 'none';
        });
    }

    private updateSelectionClasses() {
        this.widgets.forEach(w => {
            const el = document.getElementById(w.id);
            if (el) el.classList.toggle('selected', this.selectedIds.has(w.id));
        });
    }

    private async saveImagesToDB(files: FileList): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('KioskDB', 1);
            request.onupgradeneeded = (e: any) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('images')) db.createObjectStore('images', { autoIncrement: true });
            };
            request.onsuccess = (e: any) => {
                const db = e.target.result;
                const tx = db.transaction('images', 'readwrite');
                const store = tx.objectStore('images');
                const imageIds: string[] = [];
                
                tx.oncomplete = () => resolve(imageIds);
                tx.onerror = () => reject('Storage limitation or write error');

                for (let i = 0; i < files.length; i++) {
                    const reader = new FileReader();
                    reader.onload = (event: any) => {
                        const blob = new Blob([event.target.result], { type: files[i].type });
                        const putReq = store.add(blob);
                        putReq.onsuccess = (ev: any) => { imageIds.push(ev.target.result); };
                    };
                    reader.readAsArrayBuffer(files[i]);
                }
            };
            request.onerror = () => reject('Disconnected OS DB');
        });
    }

    private addWidget(config: Partial<WidgetConfig>) {
        const widget: WidgetConfig = {
            id: 'w-' + Date.now(),
            type: config.type || 'url',
            name: config.name || 'Widget',
            x: 100, y: 100, w: 300, h: 300,
            zIndex: this.widgets.length + 1,
            content: config.content,
            data: config.data,
            isEmbedded: this.isAndroid || config.type !== 'url',
            isLocked: false,
            usageScore: 0,
            lastActivity: Date.now()
        };
        this.widgets.push(widget);
        this.saveState();
        this.render();
    }

    private saveState() { localStorage.setItem('kiosk-widgets', JSON.stringify(this.widgets)); }

    private loadState() {
        const saved = localStorage.getItem('kiosk-widgets');
        if (saved) this.widgets = JSON.parse(saved);
        else {
            this.widgets = [
                { id: 'def-yt', type: 'youtube', name: 'YouTube', x: 50, y: 50, w: 600, h: 444, zIndex: 10, isEmbedded: true, cubeEnabled: true },
                { id: 'def-spotify', type: 'spotify', name: 'Spotify', x: 670, y: 50, w: 300, h: 444, zIndex: 11, isEmbedded: true, cubeEnabled: true },
                { id: 'def-calendar', type: 'calendar', name: 'Calendar', x: 50, y: 514, w: 300, h: 344, zIndex: 12, isEmbedded: true, cubeEnabled: true },
                { id: 'def-weather', type: 'weather', name: 'Weather', x: 370, y: 514, w: 220, h: 244, zIndex: 13, isEmbedded: true, cubeEnabled: true },
                { id: 'def-amazon', type: 'amazonmusic', name: 'Amazon Music', x: 610, y: 514, w: 300, h: 444, zIndex: 14, isEmbedded: true, cubeEnabled: true },
                { id: 'def-tasks', type: 'tasks', name: 'My Tasks', x: 930, y: 514, w: 300, h: 344, zIndex: 15, isEmbedded: true, cubeEnabled: true }
            ];
            this.saveState();
        }
    }

    private cleanupWidgetResources(widgetId: string) {
        // Cleanup Intervals
        if (this.widgetIntervals.has(widgetId)) {
            this.widgetIntervals.get(widgetId)?.forEach(id => clearInterval(id));
            this.widgetIntervals.delete(widgetId);
        }
        // Cleanup Observers
        if (this.widgetObservers.has(widgetId)) {
            this.widgetObservers.get(widgetId)?.disconnect();
            this.widgetObservers.delete(widgetId);
        }
    }

    private render() {
        // Before rendering new, cleanup old resources
        this.widgets.forEach(w => this.cleanupWidgetResources(w.id));
        
        const canvas = document.getElementById('canvas')!;
        canvas.innerHTML = '';
        this.widgets.forEach(w => {
            try {
                const el = this.createWidgetElement(w);
                canvas.appendChild(el);
            } catch (err) {
                console.error(`Layout Error for ${w.name}:`, err);
            }
        });
    }

    private createWidgetElement(w: WidgetConfig): HTMLElement {
        const el = document.createElement('div');
        // widget-wrapper (POSITION LAYER) - handles translate only
        el.className = `widget ${w.isLocked ? 'locked' : ''} ${this.selectedIds.has(w.id) ? 'selected' : ''} ${this.activeEditId === w.id ? 'focused' : ''} ${w.cubeEnabled ? 'cube-widget' : ''}`;
        el.id = w.id;
        el.style.width = `${w.w}px`;
        el.style.height = `${w.h}px`;
        el.style.transform = `translate(${w.x}px, ${w.y}px)`;
        el.style.zIndex = `${w.zIndex}`;

        el.innerHTML = `<div class="lock-icon">🔒</div>`;

        // Fixed Header
        const header = document.createElement('div');
        header.className = 'widget-header';
        const icon = this.getWidgetIcon(w.type);
        header.innerHTML = `
            <span class="widget-icon">${icon}</span>
            <span class="widget-title">${w.name}</span>
        `;
        el.appendChild(header);

        // Content Host
        const contentHost = document.createElement('div');
        contentHost.className = 'widget-content-host';
        
        let contentTarget: HTMLElement = contentHost;
        
        if (w.cubeEnabled) {
            this.initCube(contentHost, w);
            contentTarget = contentHost.querySelector('.cube-face.front') as HTMLElement;
        }

        const content = document.createElement('div');
        content.className = 'widget-content';
        
        if (w.isDisabled) {
            content.innerHTML = `<div style="padding:20px; font-size:10px; opacity:0.5; text-align:center">WIDGET DISABLED (TOO MANY ERRORS)</div>`;
            contentTarget.appendChild(content);
            el.appendChild(contentHost);
            return el;
        }

        // Resource Throttling
        this.setupResourceObserver(el, content, w);

        if (w.isEmbedded || w.type !== 'url') {
            this.renderWidgetContent(content, w);
        } else {
            content.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:5px">
                    <div style="font-size:40px">🔗</div>
                    <div style="text-transform:uppercase; letter-spacing:1px; font-size:10px">${w.name}</div>
                </div>
            `;
            el.addEventListener('click', () => {
                if (!this.isEditMode && w.content) window.open(w.content, '_blank');
            });
        }

        contentTarget.appendChild(content);
        el.appendChild(contentHost);

        // UI Buttons
        this.addWidgetButtons(el, w);

        // Interaction Logic
        el.onpointerdown = (e) => {
            const isHeader = (e.target as HTMLElement).closest('.widget-header');
            if (this.isEditMode) {
                this.startDrag(e, w);
            } else if (w.cubeEnabled && !isHeader) {
                const cube = el.querySelector('.cube-container') as HTMLElement;
                if (cube) {
                    if (!w.data) w.data = { rotX: 0, rotY: 0 };
                    w.data.rotY = (w.data.rotY || 0) + 90;
                    w.data.rotX = Math.floor(Math.random() * 3) * 20 - 10;
                    console.log(`CUBE ROTATED AXIS: X=${w.data.rotX}deg, Y=${w.data.rotY}deg`);
                    cube.style.transform = `rotateX(${w.data.rotX}deg) rotateY(${w.data.rotY}deg)`;
                    e.stopPropagation();
                }
            } else {
                this.handleLiveFocus(w);
            }
        };
        
        return el;
    }

    private getWidgetIcon(type: string): string {
        switch(type) {
            case 'youtube': return '📹';
            case 'spotify': return '🎧';
            case 'amazonmusic': return '🎵';
            case 'calendar': return '📅';
            case 'weather': return '🌡️';
            case 'tasks': return '📝';
            case 'slideshow': return '🖼️';
            case 'clock': return '⏰';
            default: return '📦';
        }
    }

    private renderWidgetContent(content: HTMLElement, w: WidgetConfig) {
        if (['url', 'youtube', 'spotify', 'amazonmusic', 'calendar'].includes(w.type)) {
            this.renderIframe(content, w);
        } else if (w.type === 'slideshow') this.initSlideshow(content, w);
        else if (w.type === 'clock') this.initClock(content, w.id);
        else if (w.type === 'tasks') this.initTasks(content, w.id);
        else if (w.type === 'weather') this.initWeather(content, w.id);
    }

    private setupResourceObserver(el: HTMLElement, content: HTMLElement, w: WidgetConfig) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const iframe = content.querySelector('iframe');
                if (entry.isIntersecting) {
                    w.pendingUnload = false;
                    content.style.visibility = 'visible';
                    if (iframe && iframe.dataset.src && iframe.src === 'about:blank') {
                        setTimeout(() => {
                            if (content.style.visibility !== 'hidden') {
                                iframe.src = iframe.dataset.src || '';
                            }
                        }, 500);
                    }
                } else {
                    content.style.visibility = 'hidden';
                    w.pendingUnload = true;
                    setTimeout(() => {
                        if (content.style.visibility === 'hidden' && iframe && iframe.src !== 'about:blank') {
                            iframe.dataset.src = iframe.src;
                            w.lastStateUrl = iframe.src;
                            w.lastStateTime = Date.now();
                            iframe.src = 'about:blank';
                            w.pendingUnload = false;
                            this.saveState();
                        }
                    }, 15000); 
                }
            });
        }, { threshold: 0.1 });
        observer.observe(el);
        this.widgetObservers.set(w.id, observer);
    }

    private addWidgetButtons(el: HTMLElement, w: WidgetConfig) {
        const delBtn = document.createElement('button');
        delBtn.className = 'delete-btn';
        delBtn.innerHTML = '✕';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            this.cleanupWidgetResources(w.id);
            this.widgets = this.widgets.filter(item => item.id !== w.id);
            this.saveState();
            this.render();
        };
        el.appendChild(delBtn);

        const resizer = document.createElement('div');
        resizer.className = 'resize-handle';
        resizer.onpointerdown = (e) => this.startResize(e, w);
        el.appendChild(resizer);
    }

    private handleLiveFocus(w: WidgetConfig) {
        w.lastActivity = Date.now();
        w.usageScore = (w.usageScore || 0) + 1;
        this.activeEditId = w.id;
        this.widgets.forEach(item => {
            const widEl = document.getElementById(item.id);
            if (widEl) widEl.classList.toggle('focused', item.id === w.id);
        });
    }

    private renderIframe(container: HTMLElement, w: WidgetConfig) {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.loading = 'lazy';
        
        // Error Rate Limiting (Cooldown)
        if (w.cooldownUntil && Date.now() < w.cooldownUntil) {
            container.innerHTML = `<div style="padding:20px; font-size:10px; opacity:0.7; text-align:center">RELOAD COOLDOWN (WAITING...)</div>`;
            return;
        }

        let src = w.lastStateUrl || w.content; // Prefer saved session state
        if (w.type === 'youtube') src = src || 'https://www.youtube.com/embed/jfKfPfyJRdk';
        if (w.type === 'spotify') src = src || 'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM3M';
        if (w.type === 'amazonmusic') src = src || 'https://music.amazon.com/embed/playlists/B07R1W8N6W';
        if (w.type === 'calendar') src = src || 'https://calendar.google.com/calendar/embed?src=en.german%23holiday%40group.v.calendar.google.com';
        
        iframe.src = src || '';
        if (src) iframe.dataset.src = src;

        iframe.onload = () => {
            // Reset burst tracking on successful load
            w.burstReloadCount = 0;
            w.failureCount = 0;
        };

        // Failure tracking & Rate Limiting (with window.open fallback)
        iframe.onerror = () => {
            const now = Date.now();
            this.recentReloads++;
            w.failureCount = (w.failureCount || 0) + 1;
            w.burstReloadCount = (w.burstReloadCount || 0) + 1;
            
            console.warn(`Widget ${w.name} failure #${w.failureCount}`);
            
            // If failing too fast (Burst protection)
            if (w.burstReloadCount > 2) {
                if (w.content) {
                    container.innerHTML = `<div style="padding:20px; text-align:center; display:flex; flex-direction:column; gap:10px">
                        <div style="font-size:10px">SERVICE REFUSED EMBED</div>
                        <button style="padding:10px; background:#0ff; color:#000; border:none; border-radius:5px; font-size:10px; cursor:pointer" onclick="window.open('${w.content}', '_blank')">OPEN NATIVE</button>
                    </div>`;
                } else {
                    w.cooldownUntil = now + (60000 * 5); 
                    container.innerHTML = `<div style="padding:20px; font-size:10px; opacity:0.7; text-align:center">WIDGET SUSPENDED (REPETITIVE ERRORS)</div>`;
                }
                return;
            }

            if (w.failureCount > 5) {
                w.isDisabled = true;
                w.lastStateUrl = undefined; 
                this.render(); 
                return;
            }
            
            const retryDelay = 5000 * w.failureCount; 
            setTimeout(() => { if (!w.isDisabled) iframe.src = src || w.content || ''; }, retryDelay);
        };

        container.appendChild(iframe);
    }

    private initTasks(container: HTMLElement, widgetId: string) {
        const root = document.createElement('div');
        root.style.cssText = 'height:100%; display:flex; flex-direction:column; padding:15px; box-sizing:border-box;';
        container.appendChild(root);

        const listEl = document.createElement('div');
        listEl.style.cssText = 'flex:1; overflow-y:auto; margin-bottom:10px;';
        
        const inputArea = document.createElement('div');
        inputArea.style.display = 'flex';
        inputArea.style.gap = '5px';
        
        const input = document.createElement('input');
        input.placeholder = 'New Task...';
        input.style.cssText = 'flex:1; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; font-size:12px; border-radius:4px; padding:5px;';
        input.onpointerdown = (e) => e.stopPropagation(); // Allow typing in edit move

        const addBtn = document.createElement('button');
        addBtn.innerText = '+';
        addBtn.style.cssText = 'background:#0ff; color:#000; border:none; border-radius:4px; width:28px; cursor:pointer; font-weight:bold;';
        
        inputArea.appendChild(input);
        inputArea.appendChild(addBtn);
        root.appendChild(listEl);
        root.appendChild(inputArea);

        const getTasks = () => JSON.parse(localStorage.getItem(`tasks-${widgetId}`) || '[]');
        const saveTasks = (tasks: any[]) => localStorage.setItem(`tasks-${widgetId}`, JSON.stringify(tasks));

        const renderList = () => {
            const tasks = getTasks();
            listEl.innerHTML = '';
            tasks.forEach((t: any, index: number) => {
                const item = document.createElement('div');
                item.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:6px; margin-bottom:5px; font-size:12px;';
                item.innerHTML = `<span>${t}</span>`;
                const del = document.createElement('span');
                del.innerHTML = '✕';
                del.style.cssText = 'color:#f55; cursor:pointer; font-weight:bold;';
                del.onclick = () => {
                    tasks.splice(index, 1);
                    saveTasks(tasks);
                    renderList();
                };
                item.appendChild(del);
                listEl.appendChild(item);
            });
        };

        addBtn.onclick = () => {
            const val = input.value.trim();
            if (val) {
                const tasks = getTasks();
                tasks.push(val);
                saveTasks(tasks);
                input.value = '';
                renderList();
            }
        };

        renderList();
    }

    private initWeather(container: HTMLElement, widgetId: string) {
        const root = document.createElement('div');
        root.style.cssText = 'height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:10px;';
        container.appendChild(root);

        const update = async () => {
            if (document.hidden || container.parentElement?.style.visibility === 'hidden') return;
            
            // Reduced update frequency logic check (integrated in interval)
            const isNight = this.isNight;
            const mode = this.perfMode;

            try {
                // Using Open-Meteo for free weather (Berlin default)
                const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current_weather=true');
                const weather = await res.json();
                const temp = Math.round(weather.current_weather.temperature);
                const code = weather.current_weather.weathercode;

                const getIcon = (c: number) => {
                    if (c === 0) return '☀️';
                    if (c < 3) return '🌤️';
                    if (c < 50) return '☁️';
                    if (c < 70) return '🌧️';
                    return '❄️';
                };

                if (isNight) {
                    root.innerHTML = `<div style="font-size:32px; opacity:0.6">${getIcon(code)}</div><div style="font-size:24px; opacity:0.5">${temp}°C</div>`;
                } else {
                    root.innerHTML = `
                        <div style="font-size:48px">${getIcon(code)}</div>
                        <div style="font-size:32px; font-weight:100">${temp}°C</div>
                        <div style="opacity:0.6; font-size:12px; text-transform:uppercase">Berlin</div>
                        <div style="font-size:9px; opacity:0.4; margin-top:5px">${mode.toUpperCase()}</div>
                    `;
                }
            } catch (err) {
                root.innerHTML = '<div style="font-size:10px; opacity:0.4">Weather Unavailable</div>';
            }
        };

        update();
        // Integration in System Modes: Night mode reduces updates significantly (30 min vs 5 min)
        const intervalTime = this.isNight ? 1800000 : 300000;
        const intervalId = setInterval(update, intervalTime) as unknown as number;
        this.registerInterval(widgetId, intervalId);
    }

    private initCube(container: HTMLElement, w: WidgetConfig) {
        // Set half-size for 3D translation (based on content area size)
        const contentW = w.w;
        const contentH = w.h - 44; // Subtract header height
        const halfSize = Math.min(contentW, contentH) / 2;
        container.style.setProperty('--half', `${halfSize}px`);

        container.innerHTML = `
            <div class="cube-container" style="transform: rotateX(0deg) rotateY(0deg)">
                <div class="cube-face front"></div>
                <div class="cube-face back" style="background:#000; opacity:0.8">
                    <div style="font-size:10px; opacity:0.5">STATUS ACTIVE</div>
                </div>
                <div class="cube-face left" style="background:#000; border-color:rgba(255,255,255,0.1)"></div>
                <div class="cube-face right" style="background:#000; border-color:rgba(255,255,255,0.1)"></div>
                <div class="cube-face top" style="background:#000; border-color:rgba(255,255,255,0.1)"></div>
                <div class="cube-face bottom" style="background:#000; border-color:rgba(255,255,255,0.1)"></div>
            </div>
        `;
    }

    private initClock(container: HTMLElement, widgetId: string) {
        const timeEl = document.createElement('div');
        timeEl.style.cssText = 'height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; font-family:monospace;';
        container.appendChild(timeEl);
        const update = () => {
            const now = new Date();
            timeEl.innerHTML = `
                <div style="font-size:48px; font-weight:bold">${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}</div>
                <div style="opacity:0.5; font-size:14px">${now.toLocaleDateString()}</div>
            `;
        };
        update();
        const intervalId = setInterval(update, 1000) as unknown as number;
        this.registerInterval(widgetId, intervalId);
    }

    private registerInterval(widgetId: string, intervalId: number) {
        if (!this.widgetIntervals.has(widgetId)) this.widgetIntervals.set(widgetId, []);
        this.widgetIntervals.get(widgetId)?.push(intervalId);
    }

    private initSlideshow(container: HTMLElement, w: WidgetConfig) {
        if (!w.data || !w.data.ids || w.data.ids.length === 0) {
            container.innerHTML = '<div style="padding:20px">No images selected</div>';
            return;
        }

        const inner = document.createElement('div');
        inner.className = 'widget-inner';
        container.appendChild(inner);

        const ids = w.data.ids;
        const transition = w.data.transition || 'fade';
        const speed = w.data.speed || 5000;
        let currentImg: HTMLImageElement | null = null;
        let nextImg: HTMLImageElement | null = null;
        let idx = 0;

        const loadImg = (id: any): Promise<string> => {
            return new Promise((resolve) => {
                try {
                const request = indexedDB.open('KioskDB', 1);
                request.onsuccess = (e: any) => {
                    const db = e.target.result;
                    const tx = db.transaction('images', 'readonly');
                    const store = tx.objectStore('images');
                    const getReq = store.get(id);
                    getReq.onsuccess = () => resolve(getReq.result ? URL.createObjectURL(getReq.result) : '');
                    getReq.onerror = () => resolve('');
                };
                request.onerror = () => resolve('');
                } catch(e) { resolve(''); }
            });
        };

        const showNext = async () => {
            if (document.hidden || container.parentElement?.style.visibility === 'hidden') return;
            
            // Thermal / Priority / Night Throttling
            if (this.isNight) return; // Completely pause transitions in Night Mode
            if ((this.perfMode === 'critical' || this.perfMode === 'cooldown') && container.parentElement?.style.visibility !== 'visible') return;
            if (this.perfMode === 'cooldown' && w.priority !== 'HIGH') return; 

            const url = nextImg ? nextImg.src : await loadImg(ids[idx]);
            if (!url) { idx = (idx+1)%ids.length; return; }

            const newImg = document.createElement('img');
            newImg.src = url;
            newImg.className = (this.perfMode !== 'normal') ? 'fade' : transition; 
            newImg.style.width = '100%';
            newImg.style.height = '100%';
            newImg.style.objectFit = 'cover';
            inner.appendChild(newImg);

            const animDelay = (this.perfMode === 'eco' || this.perfMode === 'critical' || this.perfMode === 'cooldown') ? 0 : 50; 
            
            requestAnimationFrame(() => {
                setTimeout(() => {
                    newImg.classList.add('active');
                    if (currentImg) {
                        currentImg.classList.remove('active');
                        const old = currentImg;
                        const cleanupDelay = (this.perfMode === 'normal') ? 1000 : 0; // Immediate cleanup in high stress
                        setTimeout(() => old.remove(), cleanupDelay);
                    }
                    currentImg = newImg;
                    
                    idx = (idx+1)%ids.length;
                    
                    // Prediction Guard: Limit concurrent preloads & respect stress modes
                    const score = w.usageScore || 0;
                    const canPreload = (this.perfMode === 'normal' || (this.perfMode === 'eco' && score > 20));
                    
                    if (canPreload && this.activePreloads < 2) {
                        this.activePreloads++;
                        loadImg(ids[idx]).then(prefUrl => {
                            if (prefUrl) {
                                nextImg = new Image();
                                nextImg.src = prefUrl;
                            }
                            this.activePreloads--;
                        }).catch(() => {
                            this.activePreloads--;
                        });
                    }
                }, animDelay);
            });
        };

        showNext();
        // Adaptive Speed: Medium priority or ECO/Critical/Cooldown slows down
        let effectiveSpeed = speed;
        if (this.perfMode === 'eco') effectiveSpeed *= 1.5;
        if (this.perfMode === 'critical' || this.perfMode === 'cooldown') effectiveSpeed *= 3;
        if (w.priority === 'MEDIUM') effectiveSpeed *= 2;

        const intervalId = setInterval(showNext, effectiveSpeed) as unknown as number;
        this.registerInterval(w.id, intervalId);
    }

    private startDrag(e: PointerEvent, w: WidgetConfig) {
        if (!this.isEditMode || w.isLocked) return;
        if ((e.target as HTMLElement).className === 'resize-handle') return;

        console.log("DRAG ACTIVE");
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        this.widgetStartPositions.clear();
        
        if (!this.selectedIds.has(w.id)) {
            this.selectedIds.clear();
            this.selectedIds.add(w.id);
            this.updateSelectionClasses();
        }

        this.selectedIds.forEach(id => {
            const item = this.widgets.find(i => i.id === id);
            if (item && !item.isLocked) {
                this.widgetStartPositions.set(id, {x: item.x, y: item.y});
                const el = document.getElementById(id);
                if (el) el.classList.add('moving');
            }
        });

        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
    }

    private startResize(e: PointerEvent, w: WidgetConfig) {
        if (!this.isEditMode || w.isLocked) return;
        e.stopPropagation();

        this.activeResizeWidget = document.getElementById(w.id);
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.widgetStartW = w.w;
        this.widgetStartH = w.h;

        window.addEventListener('pointermove', this.handlePointerMove);
        window.addEventListener('pointerup', this.handlePointerUp);
    }

    private handlePointerMove = (e: PointerEvent) => {
        const dx = e.clientX - this.dragStartX;
        const dy = e.clientY - this.dragStartY;

        if (this.widgetStartPositions.size > 0) {
            this.widgetStartPositions.forEach((start, id) => {
                const wConfig = this.widgets.find(item => item.id === id);
                if (wConfig) {
                    let nx = start.x + dx;
                    let ny = start.y + dy;
                    if (this.isSnapEnabled) {
                        nx = Math.round(nx / this.gridSize) * this.gridSize;
                        ny = Math.round(ny / this.gridSize) * this.gridSize;
                    }
                    wConfig.x = nx;
                    wConfig.y = ny;
                    const el = document.getElementById(id);
                    if (el) el.style.transform = `translate(${nx}px, ${ny}px)`;
                }
            });
        }

        if (this.activeResizeWidget) {
            const wId = this.activeResizeWidget.id;
            const wConfig = this.widgets.find(item => item.id === wId);
            if (wConfig) {
                let nw = this.widgetStartW + dx;
                let nh = this.widgetStartH + dy;
                if (this.isSnapEnabled) {
                    nw = Math.round(nw / this.gridSize) * this.gridSize;
                    nh = Math.round(nh / this.gridSize) * this.gridSize;
                }
                wConfig.w = Math.max(100, nw);
                wConfig.h = Math.max(100, nh);
                this.activeResizeWidget.style.width = `${wConfig.w}px`;
                this.activeResizeWidget.style.height = `${wConfig.h}px`;
            }
        }
    }

    private handlePointerUp = () => {
        window.removeEventListener('pointermove', this.handlePointerMove);
        window.removeEventListener('pointerup', this.handlePointerUp);
        
        this.widgets.forEach(w => {
            const el = document.getElementById(w.id);
            if (el) el.classList.remove('moving');
        });

        this.widgetStartPositions.clear();
        this.activeResizeWidget = null;
        this.saveState();
    }

    private initWakeLock() {
        if ('wakeLock' in navigator) {
            let wakeLock: any = null;
            const req = async () => { 
                try { 
                    wakeLock = await (navigator as any).wakeLock.request('screen'); 
                    console.log('Wake Lock Active');
                } catch (err) {} 
            };
            req();
            document.addEventListener('visibilitychange', () => { if (wakeLock !== null && document.visibilityState === 'visible') req(); });
        }
    }
}

new DashboardEngine();

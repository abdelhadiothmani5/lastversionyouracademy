import React, { useState, useEffect, useRef } from 'react';
import {
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sliders,
  Check,
  ShieldCheck,
  Eye,
  Crosshair,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export interface ViewportPreset {
  id: string;
  name: string;
  nameAr: string;
  width: number;
  height: number;
  deviceType: 'compact' | 'standard' | 'large';
  badge: string;
}

export const VIEWPORT_PRESETS: ViewportPreset[] = [
  {
    id: 'iphone-se-1',
    name: 'iPhone SE (1st gen)',
    nameAr: 'آيفون SE الجيل الأول (الأصغر)',
    width: 320,
    height: 568,
    deviceType: 'compact',
    badge: '320px • أصغر شاشة مدعومة',
  },
  {
    id: 'samsung-galaxy',
    name: 'Samsung Galaxy / Android',
    nameAr: 'سامسونج جالاكسي صغير',
    width: 360,
    height: 740,
    deviceType: 'compact',
    badge: '360px • أندرويد قياسي',
  },
  {
    id: 'iphone-se-mini',
    name: 'iPhone SE / 13 mini',
    nameAr: 'آيفون SE / 13 ميني',
    width: 375,
    height: 667,
    deviceType: 'standard',
    badge: '375px • كلاسيكي آبل',
  },
  {
    id: 'iphone-standard',
    name: 'iPhone 12 / 13 / 14 / 15 / 16',
    nameAr: 'آيفون 14 / 15 / 16 القياسي',
    width: 390,
    height: 844,
    deviceType: 'standard',
    badge: '390px • الأكثر انتشاراً',
  },
  {
    id: 'iphone-plus',
    name: 'iPhone XR / 11 / Plus',
    nameAr: 'آيفون XR / 11 / بلس',
    width: 414,
    height: 896,
    deviceType: 'large',
    badge: '414px • شاشات عريضة',
  },
  {
    id: 'iphone-pro-max',
    name: 'iPhone 14 / 15 / 16 Pro Max',
    nameAr: 'آيفون 16 برو ماكس (الأكبر)',
    width: 430,
    height: 932,
    deviceType: 'large',
    badge: '430px • أكبر شاشة هواتف',
  },
];

interface DetectedOverflow {
  id: string;
  tagName: string;
  selector: string;
  className: string;
  scrollWidth: number;
  clientWidth: number;
  overflowPx: number;
  rect: DOMRect;
  element: HTMLElement;
}

export const MobileResponsiveTester: React.FC = () => {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scan' | 'simulator'>('scan');
  const [selectedWidth, setSelectedWidth] = useState<number>(375);
  const [currentWindowWidth, setCurrentWindowWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 375
  );
  const [isScanning, setIsScanning] = useState(false);
  const [detectedOverflows, setDetectedOverflows] = useState<DetectedOverflow[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [pageScrollWidth, setPageScrollWidth] = useState<number>(0);
  const [isPageOverflowing, setIsPageOverflowing] = useState<boolean>(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [simulatorRoute, setSimulatorRoute] = useState<string>('/');
  const [isRotated, setIsRotated] = useState<boolean>(false);

  // Monitor real window size
  useEffect(() => {
    const handleResize = () => {
      setCurrentWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut Ctrl+Shift+M or Cmd+Shift+M to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Run DOM overflow scan on active window
  const runLiveOverflowScan = () => {
    setIsScanning(true);
    setHighlightedId(null);

    // Remove any previous debug markers
    document.querySelectorAll('.mobile-overflow-highlight-badge').forEach((el) => el.remove());
    document.querySelectorAll('[data-mobile-overflow-flagged]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      el.removeAttribute('data-mobile-overflow-flagged');
    });

    setTimeout(() => {
      const docWidth = document.documentElement.clientWidth;
      const docScrollWidth = document.documentElement.scrollWidth;
      const windowWidth = window.innerWidth;
      
      setPageScrollWidth(docScrollWidth);
      const docOverflow = docScrollWidth > docWidth + 1;
      setIsPageOverflowing(docOverflow);

      const elements = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
      const found: DetectedOverflow[] = [];

      elements.forEach((el, index) => {
        // Skip script, style, tester elements themselves
        if (
          el.tagName === 'SCRIPT' ||
          el.tagName === 'STYLE' ||
          el.tagName === 'NOSCRIPT' ||
          el.closest('#mobile-responsive-tester-root') ||
          el.classList.contains('mobile-overflow-highlight-badge')
        ) {
          return;
        }

        const rect = el.getBoundingClientRect();
        const clientWidth = el.clientWidth;
        const scrollWidth = el.scrollWidth;

        // Skip completely hidden elements
        if (rect.width === 0 && rect.height === 0) return;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Check if element spills beyond right or left viewport
        const rightEdgeSpill = rect.right > windowWidth + 1;
        const leftEdgeSpill = rect.left < -1;
        const innerOverflow = scrollWidth > clientWidth + 2 && clientWidth > 0 && style.overflowX !== 'auto' && style.overflowX !== 'scroll';

        if (rightEdgeSpill || leftEdgeSpill || innerOverflow) {
          const overflowPx = Math.max(
            rightEdgeSpill ? Math.round(rect.right - windowWidth) : 0,
            leftEdgeSpill ? Math.round(Math.abs(rect.left)) : 0,
            innerOverflow ? Math.round(scrollWidth - clientWidth) : 0
          );

          if (overflowPx >= 2) {
            // Build meaningful selector
            let selector = el.tagName.toLowerCase();
            if (el.id) {
              selector += `#${el.id}`;
            } else if (el.className && typeof el.className === 'string') {
              const firstClass = el.className.split(' ').filter((c) => !c.startsWith('mobile-'))[0];
              if (firstClass) selector += `.${firstClass}`;
            }

            found.push({
              id: `overflow-node-${index}`,
              tagName: el.tagName.toLowerCase(),
              selector,
              className: typeof el.className === 'string' ? el.className.slice(0, 100) : '',
              scrollWidth,
              clientWidth,
              overflowPx,
              rect,
              element: el,
            });

            // Visually flag the element in DOM
            el.setAttribute('data-mobile-overflow-flagged', 'true');
            el.style.outline = '2px dashed #EF4444';
          }
        }
      });

      setDetectedOverflows(found);
      setHasScanned(true);
      setIsScanning(false);
    }, 150);
  };

  // Scroll to and highlight a specific element
  const focusElement = (item: DetectedOverflow) => {
    setHighlightedId(item.id);
    item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add temporary high-visibility pulse effect
    const originalOutline = item.element.style.outline;
    item.element.style.outline = '4px solid #F59E0B';
    item.element.style.outlineOffset = '2px';
    
    setTimeout(() => {
      item.element.style.outline = '2px dashed #EF4444';
      item.element.style.outlineOffset = '';
    }, 2500);
  };

  // Clear highlights on close
  const handleClose = () => {
    setIsOpen(false);
    setHighlightedId(null);
    document.querySelectorAll('[data-mobile-overflow-flagged]').forEach((el) => {
      (el as HTMLElement).style.outline = '';
      el.removeAttribute('data-mobile-overflow-flagged');
    });
  };

  return (
    <div id="mobile-responsive-tester-root" className="fixed z-[9999] pointer-events-none">
      {/* Floating Launch Trigger Button (Discrete Bottom Corner) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            runLiveOverflowScan();
          }}
          className="pointer-events-auto fixed bottom-20 sm:bottom-6 left-3 sm:left-6 flex items-center gap-2 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-full bg-zinc-950/90 dark:bg-amber-400 text-amber-400 dark:text-zinc-950 border border-amber-400/40 dark:border-amber-500 shadow-2xl backdrop-blur-md hover:scale-105 active:scale-95 transition-all text-xs font-black select-none group cursor-pointer"
          title="افتح فاحص التجاوب والتوافق (320px - 430px) • Shortcut: Ctrl+Shift+M"
          aria-label="Mobile Responsiveness Inspector"
        >
          <Smartphone className="w-4 h-4 animate-pulse" />
          <span className="hidden xs:inline">
            {isAr ? 'فاحص التجاوب' : 'Mobile Tester'}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-400/20 dark:bg-black/15 text-[10px] font-mono">
            {currentWindowWidth}px
          </span>
        </button>
      )}

      {/* Main Tester Panel Modal */}
      {isOpen && (
        <div className="pointer-events-auto fixed inset-0 sm:inset-auto sm:bottom-4 sm:left-4 sm:w-[540px] max-w-full sm:max-h-[85vh] bg-white dark:bg-[#0E131F] text-zinc-900 dark:text-white rounded-none sm:rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-zinc-900 to-zinc-950 text-white flex items-center justify-between shrink-0 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-black flex items-center justify-center font-black">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  <span>{isAr ? 'أداة اختبار وفحص التجاوب' : 'Mobile Viewport Tester'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono">
                    320px–430px
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {isAr
                    ? `العرض الحالي للمتصفح: ${currentWindowWidth} بكسل`
                    : `Active Viewport: ${currentWindowWidth}px`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                title={isAr ? 'إغلاق' : 'Close'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'scan'
                  ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isAr ? 'فحص التجاوز الأفقي (Live Scan)' : 'Overflow Scanner'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'simulator'
                  ? 'bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isAr ? 'محاكي الشاشات (320-430px)' : 'Viewport Simulator'}</span>
            </button>
          </div>

          {/* Tab 1: Live DOM Overflow Scanner */}
          {activeTab === 'scan' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Scan Trigger Bar */}
              <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                    {isAr ? 'فحص كامل عناصر الصفحة الحالية' : 'Scan Current Active DOM'}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isAr
                      ? 'يكتشف أي عنصر يمتد خارج حدود الشاشة أو يسبب شريط تمرير أفقي'
                      : 'Checks scrollWidth vs clientWidth and off-screen bounds'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={runLiveOverflowScan}
                  disabled={isScanning}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  <span>{isScanning ? (isAr ? 'جاري الفحص...' : 'Scanning...') : (isAr ? 'إعادة الفحص' : 'Re-scan')}</span>
                </button>
              </div>

              {/* Status Banner */}
              {hasScanned && (
                <div>
                  {detectedOverflows.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <h4 className="text-sm font-black">
                          {isAr ? 'ممتاز! لا يوجد أي تجاوز أفقي (0px Overflow)' : 'Clean! 0 Horizontal Overflows Detected'}
                        </h4>
                      </div>
                      <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-400">
                        {isAr
                          ? `جميع الحاويات والعناصر تتسع تماماً داخل العرض الحالي (${currentWindowWidth} بكسل) دون أي تسريب أفقي.`
                          : `All DOM containers fit perfectly within the current ${currentWindowWidth}px viewport width without breaking boundaries.`}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-900 dark:text-red-300 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <h4 className="text-sm font-black">
                          {isAr
                            ? `تم رصد ${detectedOverflows.length} عنصر يتجاوز الحدود الأفقية`
                            : `Found ${detectedOverflows.length} elements exceeding viewport bounds`}
                        </h4>
                      </div>
                      <p className="text-xs text-red-800 dark:text-red-400">
                        {isAr
                          ? 'انقر على أي عنصر بالأسفل للتمرير التلقائي إليه وتسليط الضوء عليه باللون الأحمر.'
                          : 'Click any element below to scroll to and highlight it.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Detected Overflows List */}
              {detectedOverflows.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    {isAr ? 'قائمة العناصر المتجاوزة للحدود:' : 'Overflowing Elements:'}
                  </h5>
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detectedOverflows.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-2 ${
                          highlightedId === item.id
                            ? 'bg-amber-500/10 border-amber-400 dark:border-amber-400 shadow-sm'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-red-600 dark:text-red-400">
                              +{item.overflowPx}px
                            </span>
                            <span className="font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[11px] font-semibold truncate">
                              {item.selector}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block truncate font-mono mt-0.5">
                            scrollWidth: {item.scrollWidth}px vs client: {item.clientWidth}px
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => focusElement(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-400 hover:text-black transition-colors font-bold text-[11px] flex items-center gap-1 shrink-0"
                        >
                          <Crosshair className="w-3 h-3" />
                          <span>{isAr ? 'تحديد' : 'Locate'}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Breakpoint Checklist Guide (320px to 430px) */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <span className="text-xs font-bold block text-zinc-900 dark:text-white">
                  {isAr ? 'نطاقات الشاشات المستهدفة (320px – 430px)' : 'Tested Mobile Breakpoints'}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {VIEWPORT_PRESETS.map((preset) => {
                    const isCovered = currentWindowWidth >= preset.width;
                    return (
                      <div
                        key={preset.id}
                        className="p-2 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-black text-amber-600 dark:text-amber-400 block">
                            {preset.width}px
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate block">
                            {preset.name}
                          </span>
                        </div>
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* Tab 2: Interactive Viewport Simulator */}
          {activeTab === 'simulator' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* Preset Selector Chips */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
                  {isAr ? 'اختر حجم الهاتف المراد محاكاته:' : 'Select Target Phone Size:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VIEWPORT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedWidth(preset.width)}
                      className={`p-2.5 rounded-xl border text-start transition-all cursor-pointer ${
                        selectedWidth === preset.width
                          ? 'bg-amber-400 text-black border-amber-500 shadow-md font-bold'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-xs">{preset.width}px</span>
                        {selectedWidth === preset.width && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[10px] opacity-80 block truncate mt-0.5">
                        {isAr ? preset.nameAr : preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Precision Width Slider (320px to 430px) */}
              <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{isAr ? 'الضبط الدقيق للعرض:' : 'Fine-Tune Width:'}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedWidth((w) => Math.max(320, w - 5))}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold"
                    >
                      -5
                    </button>
                    <span className="font-mono font-black text-sm px-2 py-0.5 rounded bg-amber-400 text-black">
                      {selectedWidth}px
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedWidth((w) => Math.min(430, w + 5))}
                      className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold"
                    >
                      +5
                    </button>
                  </div>
                </div>

                <input
                  type="range"
                  min="320"
                  max="430"
                  step="1"
                  value={selectedWidth}
                  onChange={(e) => setSelectedWidth(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                  <span>320px (Compact)</span>
                  <span>375px (iPhone)</span>
                  <span>430px (Pro Max)</span>
                </div>
              </div>

              {/* Route Selector for Simulator */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400 block">
                  {isAr ? 'الصفحة المراد فحصها في المحاكي:' : 'Page to inspect in simulator:'}
                </label>
                <select
                  value={simulatorRoute}
                  onChange={(e) => setSimulatorRoute(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-xs font-bold"
                >
                  <option value="/">الرئيسية (Home Page)</option>
                  <option value="/books">مناهج وكتب الأكاديمية (Books Page)</option>
                  <option value="/languages">برامج اللغات الأجنبية (Languages Page)</option>
                  <option value="/academic-support">الدعم المدرسي (Academic Support)</option>
                  <option value="/programs">البرامج الشاملة (Programs Page)</option>
                  <option value="/why-your-academy">لماذا نحن (Why Us Page)</option>
                  <option value="/branches-contact">الفروع والاتصال (Branches & Contact)</option>
                  <option value="/registration">التسجيل والاشتراك (Registration Page)</option>
                  <option value="/faq">الأسئلة الشائعة (FAQ Page)</option>
                </select>
              </div>

              {/* Visual Frame Simulator */}
              <div className="pt-2">
                <div className="text-center pb-2">
                  <span className="text-[11px] font-mono text-zinc-500">
                    {isAr ? 'معاينة حية للمحتوى داخل إطار العرض المحدد:' : 'Live responsive frame preview:'}
                  </span>
                </div>

                <div className="flex justify-center p-3 rounded-2xl bg-zinc-200 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 overflow-x-auto">
                  <div
                    style={{ width: `${selectedWidth}px` }}
                    className="h-[480px] bg-white dark:bg-[#0B0F17] rounded-3xl shadow-2xl border-4 border-zinc-800 overflow-hidden flex flex-col relative transition-all duration-200"
                  >
                    {/* Phone Notch / Speaker Mock */}
                    <div className="h-4 bg-zinc-900 w-full flex items-center justify-center shrink-0">
                      <div className="w-16 h-1 bg-zinc-700 rounded-full" />
                    </div>

                    {/* iFrame Rendering App at exact width */}
                    <iframe
                      src={simulatorRoute}
                      title="Mobile Simulator Viewport"
                      className="w-full flex-1 border-0"
                    />

                    {/* Home Indicator */}
                    <div className="h-3 bg-zinc-950 w-full flex items-center justify-center shrink-0">
                      <div className="w-20 h-1 bg-zinc-600 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Footer Info */}
          <div className="p-3 bg-zinc-100 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs shrink-0">
            <span className="text-[11px] text-zinc-500">
              {isAr ? 'اضغط Ctrl+Shift+M للإخفاء/الإظهار' : 'Press Ctrl+Shift+M to toggle'}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 font-bold text-xs transition-colors"
            >
              {isAr ? 'تم' : 'Done'}
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

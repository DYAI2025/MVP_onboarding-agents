
import React, { useState, useEffect, useRef } from 'react';
import { FusionResult, CalculationState, Transit } from '../types';
import { SymbolConfig } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  result: FusionResult;
  state: CalculationState;
  onGenerateImage: (config: SymbolConfig) => void;
  onNavigateToQuizzes?: () => void;
  transits?: Transit[];
}

const SUN_SIGN_INSIGHTS: Record<string, string> = {
  "Aries": "Der Urfunke des Seins. Mutig, instinktiv und getrieben von der reinen Kraft des Anfangs.",
  "Taurus": "Der Garten der Sinne. Du verankerst den Geist in der Materie mit unerschütterlicher Beständigkeit.",
  "Gemini": "Der himmlische Bote. Du webst Verbindungen durch die Dualität von Gedanke und Ausdruck.",
  "Cancer": "Das Gefäß der Erinnerung. Du nährt die Wurzeln der Seele mit schützenden lunaren Wassern.",
  "Leo": "Der strahlende Souverän. Du erleuchtest die Welt mit der großzügigen Wärme des kreativen Herzens.",
  "Virgo": "Der heilige Analyst. Du reinigst das Chaotische zum Göttlichen durch Hingabe und Präzision.",
  "Libra": "Der harmonische Spiegel. Du suchst das Gleichgewicht und die Schönheit im Tanz der Beziehungen.",
  "Scorpio": "Der Alchemist der Tiefe. Du transformierst Schatten in Licht durch die Intensität der Erneuerung.",
  "Sagittarius": "Der ewige Sucher. Du erweiterst Horizonte mit dem Pfeil der Wahrheit und dem Feuer der Weisheit.",
  "Capricorn": "Der Gipfel des Berges. Du baust Vermächtnisse von Dauer durch Disziplin und die Meisterschaft der Zeit.",
  "Aquarius": "Der visionäre Architekt. Du gießt die Wasser der Innovation in das kollektive Bewusstsein.",
  "Pisces": "Der grenzenlose Ozean. Du löst Grenzen auf, um mit dem universellen Traum zu verschmelzen."
};

export const AnalysisView: React.FC<Props> = ({ result, state, onGenerateImage, transits }) => {
  const { t } = useLanguage();

  // Default config for background generation - Hidden from user
  const defaultConfig: SymbolConfig = {
    influence: 'balanced',
    transparentBackground: true
  };

  // Parallax & Mouse States
  const solarSigRef = useRef<HTMLDivElement>(null);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [autoPulse, setAutoPulse] = useState(0);

  useEffect(() => {
    // Scroll handler for parallax
    const handleScroll = () => {
      if (solarSigRef.current) {
        const rect = solarSigRef.current.getBoundingClientRect();
        const viewHeight = window.innerHeight;

        if (rect.top < viewHeight && rect.bottom > 0) {
          const sensitivity = 0.15;
          const centerPoint = (rect.top + rect.height / 2) - (viewHeight / 2);
          setParallaxOffset(centerPoint * sensitivity);

          const progress = (centerPoint / (viewHeight / 2));
          setScrollProgress(Math.min(Math.max(progress, -1), 1));
        }
      }
    };

    // Auto-pulse animation loop
    let frameId: number;
    const animatePulse = () => {
      const now = Date.now();
      const wave = (Math.sin(now / 2000) + 1) / 2;
      setAutoPulse(wave);
      frameId = requestAnimationFrame(animatePulse);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    animatePulse();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(frameId);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!solarSigRef.current) return;
    const rect = solarSigRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const sunInsight = SUN_SIGN_INSIGHTS[result.western.sunSign] || "Ein einzigartiges Licht im kosmischen Gefüge.";

  const normalizedRotation = Math.min(Math.max(parallaxOffset / 12, -8), 8) + (mousePos.y * 10);
  const normalizedRotationY = mousePos.x * 10;
  const dynamicScale = (1 + (0.05 * (1 - Math.abs(scrollProgress)))) + (isHovering ? 0.02 : 0);

  // Dynamic Glow Calculation
  const pulseFactor = 0.15 + (autoPulse * 0.2);
  const mouseDist = Math.sqrt(mousePos.x ** 2 + mousePos.y ** 2);
  const normalizedMouseDist = Math.min(mouseDist * 2, 1);
  const glowAlpha = (pulseFactor + Math.abs(scrollProgress) * 0.15 + (normalizedMouseDist * 0.4));
  const glowHueShift = 135 + scrollProgress * 45 + (normalizedMouseDist * 15) + (autoPulse * 20);
  const blurAmount = Math.abs(scrollProgress) * 4 + (normalizedMouseDist * 2) + (autoPulse * 4);



  return (
    <div className="space-y-12 md:space-y-16 animate-fade-in w-full pb-20">

      {/* Intro Header */}
      <div className="text-center space-y-4 px-4 mb-8">
        <div className="inline-block px-3 py-1 border border-green-200 bg-green-50 text-green-700 text-[10px] tracking-widest uppercase rounded-full dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
          ✅ {t.analysis.synced}
        </div>
        <h2 className="font-serif text-3xl md:text-5xl text-astro-text tracking-tight">{t.analysis.heading}</h2>
        <p className="font-sans text-sm md:text-base text-astro-subtext max-w-2xl mx-auto leading-relaxed">
          {t.analysis.subheading}
        </p>
      </div>

      <div className="bg-astro-card border border-astro-border rounded-[2rem] md:rounded-[3rem] p-6 md:p-14 shadow-elevated relative overflow-hidden transition-all duration-700 w-full">

        {/* Synthesis Title */}
        <div className="text-center mb-10 md:mb-16 relative z-10 mt-6 md:mt-0">
          <span className="font-sans text-[10px] md:text-[11px] tracking-[0.4em] text-astro-gold uppercase mb-3 md:mb-4 block font-black">{t.analysis.synthesis_matrix}</span>
          <h3 className="font-serif text-4xl md:text-6xl text-astro-text mb-6 md:mb-8 tracking-tighter leading-tight">{result.synthesisTitle}</h3>
          <p className="font-sans text-base md:text-xl text-astro-subtext max-w-3xl mx-auto leading-relaxed opacity-80 font-light px-2">
            "{result.synthesisDescription}"
          </p>
        </div>

        {/* Dual Cards: Western vs Eastern */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 mb-10 md:mb-16">
          <div className="bg-p-violet/20 backdrop-blur-md border border-astro-border rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 transition-transform hover:scale-[1.01] duration-500">
            <h5 className="font-serif text-xl md:text-3xl text-astro-text mb-4 md:mb-8 border-b border-astro-border/50 pb-4 text-center">{t.analysis.western_sphere}</h5>
            <div className="space-y-6 font-sans text-xs">
              {[
                { label: t.analysis.sun_sign, val: result.western.sunSign },
                { label: t.analysis.ascendant, val: result.western.ascendant },
                { label: t.analysis.element, val: result.western.element }
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-astro-subtext uppercase tracking-widest font-bold">{item.label}</span>
                  <span className="font-serif italic text-lg md:text-2xl text-astro-text">{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-p-sage/20 backdrop-blur-md border border-astro-border rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-12 transition-transform hover:scale-[1.01] duration-500">
            <h5 className="font-serif text-xl md:text-3xl text-astro-text mb-4 md:mb-8 border-b border-astro-border/50 pb-4 text-center">{t.analysis.eastern_path}</h5>
            <div className="space-y-6 font-sans text-xs">
              {[
                { label: t.analysis.guardian_animal, val: result.eastern.yearAnimal },
                { label: t.analysis.base_element, val: result.eastern.yearElement },
                { label: t.analysis.day_master, val: result.eastern.dayElement },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-astro-subtext uppercase tracking-widest font-bold">{item.label}</span>
                  <span className="font-serif italic text-lg md:text-2xl text-astro-text">{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* REFINED SOLAR SIGNATURE WITH DYNAMIC REACTIVE GLOW */}
        <div
          ref={solarSigRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => {
            setIsHovering(false);
            setMousePos({ x: 0, y: 0 });
          }}
          className={`
            bg-white/40 dark:bg-zinc-900/40 border rounded-[2rem] md:rounded-[3.5rem] text-center backdrop-blur-2xl relative overflow-hidden group min-h-[350px] md:min-h-[500px] flex items-center justify-center transition-all duration-700 perspective-1000
            ${isHovering ? 'border-astro-gold shadow-[0_45px_100px_rgba(212,175,55,0.25)]' : 'border-astro-border shadow-elevated'}
          `}
        >
          {/* Primary Dynamic Gradient */}
          <div
            className="absolute inset-0 pointer-events-none transition-all duration-1000 will-change-[background,opacity,filter] dynamic-glow"
            // eslint-disable-next-line
            style={{
              '--glow-bg': `linear-gradient(${glowHueShift}deg, rgba(212,175,55,${glowAlpha}) 0%, transparent 50%, rgba(245,243,255,${glowAlpha * 0.5}) 100%)`,
              '--glow-opacity': isHovering ? 1 : 0.8,
              '--glow-filter': `blur(${blurAmount}px)`
            } as React.CSSProperties}
          ></div>

          <div
            className="relative z-10 p-6 md:p-16 will-change-transform transition-all duration-500 ease-out flex flex-col items-center max-w-5xl dynamic-card-transform"
            // eslint-disable-next-line
            style={{
              '--card-transform': `translateY(${parallaxOffset * 1.5}px) scale(${dynamicScale}) rotateX(${normalizedRotation}deg) rotateY(${normalizedRotationY}deg)`
            } as React.CSSProperties}
          >
            <div className="inline-flex items-center gap-4 mb-8 md:mb-12">
              <span className={`w-1.5 h-1.5 rounded-full bg-astro-gold transition-all duration-500 animate-pulse-soft ${isHovering ? 'scale-150 shadow-[0_0_12px_#D4AF37]' : ''}`}></span>
              <span className="font-serif text-sm md:text-xl italic tracking-[0.2em] text-astro-gold font-medium transition-all duration-700 group-hover:tracking-[0.3em]">
                {t.analysis.solar_signature}: {result.western.sunSign}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full bg-astro-gold transition-all duration-500 animate-pulse-soft delay-1500 ${isHovering ? 'scale-150 shadow-[0_0_12px_#D4AF37]' : ''}`}></span>
            </div>

            <div className="relative group/text cursor-default px-4">
              <p className="font-sans font-light text-astro-text text-3xl md:text-7xl leading-tight opacity-95 mx-auto drop-shadow-xl select-none transition-all duration-700 group-hover/text:scale-[1.02] group-hover/text:text-astro-gold tracking-tight">
                "{sunInsight}"
              </p>
            </div>

            <div
              className={`mt-12 h-1 transition-all duration-1000 bg-gradient-to-r from-transparent via-astro-gold/40 to-transparent dynamic-separator`}
              // eslint-disable-next-line
              style={{
                '--sep-width': isHovering ? '16rem' : '6rem',
                '--sep-opacity': 0.5 + autoPulse * 0.5
              } as React.CSSProperties}
            ></div>
          </div>
        </div>

        {/* --- ONE ACTION BUTTON SECTION --- */}
        <div className="mt-12 md:mt-20 text-center">
          <button
            onClick={() => onGenerateImage(defaultConfig)}
            disabled={state === CalculationState.GENERATING_IMAGE || state === CalculationState.FINISHED}
            className="w-full md:w-auto px-12 py-6 md:px-20 md:py-8 bg-astro-text text-white font-serif italic text-2xl md:text-3xl rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_60px_rgba(212,175,55,0.2)] hover:bg-black hover:scale-[1.02] transition-all duration-500 disabled:opacity-50 relative overflow-hidden group"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              {state === CalculationState.GENERATING_IMAGE ? (
                <>
                  <span className="animate-spin text-astro-gold">✧</span>
                  {t.analysis.btn_generating}
                </>
              ) : (
                <>
                  {t.analysis.btn_generate} <span className="text-astro-gold">→</span>
                </>
              )}
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-astro-gold/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          </button>
          <p className="mt-4 text-xs text-astro-subtext uppercase tracking-widest font-bold opacity-60">
            Startet die KI-Symbolgenerierung & Agenten-Uplink
          </p>
        </div>

        {/* Status Indicator */}
        <div className="mt-6 flex justify-center">
          {state === CalculationState.FINISHED && (
            <span className="inline-block px-4 py-1 text-[10px] text-green-400 bg-green-900/20 rounded-full border border-green-500/30 animate-fade-in">
              ✨ Symbol Captured. Uplink Establishing...
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

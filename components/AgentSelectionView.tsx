
import React, { useRef, useEffect, useState } from 'react';
import { FusionResult } from '../types';
import { SmartImage } from './SmartImage';
import { getAgentConfig, isAgentConfigured } from '../services/elevenLabsAgents';

// NOTE: Global JSX declaration removed to prevent IntrinsicElements conflict.
// We handle the custom element via explicit cast below.

interface Props {
  result: FusionResult | null;
  symbolUrl: string | null;
  onAgentSelect: (agentId: string) => void;
  onBackToDashboard: () => void;
}

export const AgentSelectionView: React.FC<Props> = ({ result, symbolUrl, onAgentSelect, onBackToDashboard }) => {
  // Fallback UI if essential data missing
  if (!result || !symbolUrl) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">&#x2728;</div>
          <h2 className="font-serif text-3xl text-white mb-4">Daten werden geladen...</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Falls diese Ansicht bestehen bleibt, starte den Onboarding-Prozess bitte neu.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-8 py-4 bg-gradient-to-r from-astro-gold to-[#B89628] text-white font-serif italic text-lg rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Zurück zum Start
          </button>
        </div>
      </div>
    );
  }
  
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const gongRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    gongRef.current = new Audio('https://cdn.freesound.org/previews/26/26777_189914-lq.mp3');
  }, []);

  const handleSelection = (agentId: string) => {
    // 1. Play Gong
    if (gongRef.current) {
      const audio = gongRef.current;
      audio.currentTime = 0;
      audio.volume = 1.0;
      audio.play().catch(e => console.error("Audio play failed", e));
      setTimeout(() => {
        const fadeInterval = setInterval(() => {
            if (audio.volume > 0.05) { audio.volume -= 0.05; } 
            else { audio.volume = 0; audio.pause(); clearInterval(fadeInterval); }
        }, 150);
      }, 2000);
    }
    
    // 2. Open Chat Interface
    setSelectedAgent(agentId);
    setIsChatActive(true);
  };

  const handleProceedToDashboard = () => {
    if (selectedAgent) {
      onAgentSelect(selectedAgent);
    }
  };

  // Cast custom element to any to avoid TypeScript errors without polluting global namespace
  const ElevenLabsConvai = 'elevenlabs-convai' as any;

  return (
    <div className="min-h-screen bg-[#0F1014] text-gray-300 font-sans p-6 md:p-12 relative overflow-hidden animate-fade-in">
      
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-amber-900/10 rounded-full blur-[100px] pointer-events-none"></div>

      {/* --- CHAT MODAL OVERLAY --- */}
      {isChatActive && selectedAgent && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in">
           <div className="max-w-4xl w-full h-[85vh] bg-[#0F1014] border border-astro-gold/30 rounded-[3rem] shadow-[0_0_100px_rgba(212,175,55,0.1)] relative overflow-hidden flex flex-col md:flex-row">
              
              {/* Left Panel: Visual Context */}
              <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/10 relative bg-gradient-to-b from-[#15151A] to-[#0F1014]">
                 <div className="absolute top-8 left-8 text-[10px] uppercase tracking-[0.3em] text-astro-gold font-bold animate-pulse">Live Uplink Active</div>
                 
                 {/* Symbol Display */}
                 <div className="w-64 h-64 rounded-full border border-astro-gold/20 p-2 relative mb-8 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                    <div className="absolute inset-0 rounded-full border border-astro-gold/10 animate-[spin_30s_linear_infinite]"></div>
                    <div className="w-full h-full rounded-full overflow-hidden bg-black relative z-10 flex items-center justify-center">
                       <SmartImage 
                         src={symbolUrl} 
                         alt="Symbol" 
                         containerClassName="w-full h-full"
                         className="w-full h-full object-cover object-center" 
                       />
                    </div>
                 </div>

                 <h3 className="font-serif text-3xl text-white mb-2">{getAgentConfig(selectedAgent as 'levi' | 'victoria').name}</h3>
                 <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-8">
                   {getAgentConfig(selectedAgent as 'levi' | 'victoria').role}
                 </p>

                 <div className="text-center space-y-4">
                    <p className="text-sm text-gray-400 italic max-w-xs mx-auto">
                      "Ich bin bereit. Sprich mit mir über deine Matrix oder das Symbol, das wir generiert haben."
                    </p>
                 </div>
              </div>

              {/* Right Panel: Eleven Labs Widget */}
              <div className="w-full md:w-1/2 relative bg-[#0B0C10] flex flex-col">
                 <div className="flex-1 flex items-center justify-center p-8">
                    {/* ELEVEN LABS WIDGET CONTAINER */}
                    <div className="w-full max-w-sm min-h-[400px] flex flex-col items-center justify-center">
                       {/* Render widget via dangerouslySetInnerHTML to ensure proper custom element rendering */}
                       <div
                         dangerouslySetInnerHTML={{
                           __html: `<elevenlabs-convai agent-id="${getAgentConfig(selectedAgent as 'levi' | 'victoria').elevenLabsId}"></elevenlabs-convai>`
                         }}
                         className="w-full h-full min-h-[400px]"
                       />
                       
                       {/* Fallback message if no ID is configured */}
                       {!isAgentConfigured(selectedAgent as 'levi' | 'victoria') && (
                         <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-center">
                           <p className="text-xs text-red-400">Dev Note: Please configure valid Agent IDs in AgentSelectionView.tsx</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Bottom Action */}
                 <div className="p-8 border-t border-white/5 bg-[#0F1014]">
                    <button 
                      onClick={handleProceedToDashboard}
                      className="w-full py-4 bg-gradient-to-r from-astro-gold to-[#B89628] text-white font-serif italic text-xl rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                    >
                      Zum Dashboard fortfahren <span className="not-italic">→</span>
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- HEADER SECTION --- */}
      <div className={`max-w-7xl mx-auto mb-20 relative z-10 transition-all duration-700 ${isChatActive ? 'blur-xl opacity-30 pointer-events-none' : ''}`}>
        
        {/* Navigation / Meta */}
        <div className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  disabled={isChatActive}
                  className="text-[10px] uppercase tracking-[0.3em] text-slate-300 font-black border border-white/10 px-4 py-2 rounded-full hover:border-astro-gold/60 hover:text-astro-gold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Zurück zur Analyse
                </button>
                <div className="text-[10px] uppercase tracking-[0.4em] text-slate-500 font-black">System v.7.0</div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]"></span>
                <span className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Uplink Established</span>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-32">
            
            {/* LARGE SYMBOL DISPLAY */}
            <div className="relative group shrink-0 order-1 lg:order-1">
                 {/* Decorative rings */}
                 <div className="absolute inset-[-40px] border border-white/5 rounded-full animate-[spin_60s_linear_infinite]"></div>
                 <div className="absolute inset-[-20px] border border-white/10 rounded-full animate-[spin_40s_linear_infinite_reverse]"></div>
                 
                 {/* Main Container */}
                 <div className="w-80 h-80 md:w-[28rem] md:h-[28rem] rounded-full border border-white/10 bg-[#1E293B]/20 backdrop-blur-xl shadow-[0_0_60px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden transition-transform duration-700 hover:scale-[1.02]">
                    <div className="w-[80%] h-[80%] rounded-full overflow-hidden relative z-10 border border-white/10 bg-black/40 shadow-2xl">
                         <SmartImage 
                           src={symbolUrl} 
                           alt="Cosmic Fusion Symbol" 
                           containerClassName="w-full h-full"
                           // Using absolute positioning to perfectly center the zoomed image
                           className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[125%] h-[125%] max-w-none object-cover transition-transform duration-[2s] ease-in-out group-hover:scale-[1.35] group-hover:rotate-3" 
                           priority={true}
                         />
                    </div>
                    {/* Gloss effect */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/5 via-transparent to-transparent pointer-events-none z-20"></div>
                 </div>

                 {/* Label Badge */}
                 <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0F1014] border border-astro-gold/30 px-8 py-4 rounded-full backdrop-blur-md whitespace-nowrap shadow-xl flex items-center gap-3 z-30">
                    <span className="text-2xl text-astro-gold">✦</span>
                    <div>
                        <div className="text-[10px] uppercase tracking-[0.3em] text-astro-gold font-bold">Dein Kosmisches Siegel</div>
                        <div className="text-[8px] text-slate-500 font-mono tracking-widest">VERIFIED_UNIQUE</div>
                    </div>
                 </div>
            </div>

            {/* Title & Context */}
            <div className="text-center lg:text-left max-w-2xl order-2 lg:order-2">
                <h1 className="font-serif text-5xl md:text-7xl text-white tracking-tight mb-8 leading-[0.9] drop-shadow-lg">
                  Wähle deine <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-white to-astro-gold italic">Intelligenz</span>
                </h1>
                
                <div className="text-lg text-slate-400 font-light leading-relaxed mb-10 space-y-6">
                  <p>
                    Deine Fusion aus <strong className="text-white font-serif italic text-xl">{result.western.sunSign}</strong> (Westlich) und <strong className="text-white font-serif italic text-xl">{result.eastern.yearAnimal}</strong> (Östlich) bildet eine einzigartige energetische Signatur.
                  </p>
                  <p className="opacity-70 text-sm md:text-base border-l-2 border-astro-gold/30 pl-4">
                    Während die westliche Astrologie deine psychologische Struktur und den solaren Willen definiert, offenbart das östliche Ba Zi die elementaren Rhythmen und das Fundament deines Schicksals. Zusammen weben sie die Matrix deiner wahren Potentiale.
                  </p>
                  <p className="text-astro-gold/80 font-medium text-xl font-serif italic pt-2">
                    Sprich jetzt mit deinem Astro-Agenten über das Widget, um deine Reise zu beginnen.
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                   <div className="px-5 py-2.5 bg-white/5 rounded-xl border border-white/5 text-xs font-mono text-slate-400 flex items-center gap-2 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-astro-gold rounded-full"></span>
                      ID: {result.synthesisTitle.split(' ').slice(0, 2).join('_').toUpperCase()}
                   </div>
                   <div className="px-5 py-2.5 bg-white/5 rounded-xl border border-white/5 text-xs font-mono text-slate-400 flex items-center gap-2 shadow-sm">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                      MATRIX: {result.elementMatrix}
                   </div>
                </div>
            </div>

        </div>
      </div>

      {/* --- AGENT CARDS --- */}
      <div className={`max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10 pb-20 mt-28 transition-all duration-700 ${isChatActive ? 'blur-xl opacity-30 pointer-events-none' : ''}`}>
         
         {/* AGENT 1: LEVI BAZI */}
         <div 
            onClick={() => handleSelection('levi')}
            className="group relative cursor-pointer transform hover:-translate-y-2 transition-transform duration-500"
         >
            <div className="relative rounded-[2.5rem] p-10 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] transition-all duration-500 group-hover:shadow-[0_35px_60px_-15px_rgba(212,175,55,0.15)]
                 bg-gradient-to-br from-[#785a3c] via-[#a88856] to-[#4a3420]
                 border-t border-l border-[#d4af37]/40 border-b-[6px] border-r-[6px] border-[#2a1b0e]/60"
            >
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum-dark.png')] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-700 mix-blend-multiply">
                   <span className="text-9xl text-[#2a1b0e]">🐉</span>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                       <span className="text-[9px] uppercase tracking-[0.3em] font-black text-[#3e2718]">Quantum_BaZi_Protocols</span>
                       <div className="w-2 h-2 rounded-full bg-[#3e2718] shadow-inner"></div>
                    </div>
                    <h2 className="font-serif text-5xl mb-4 text-[#2a1b0e] font-bold [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)]">
                        Levi Bazi
                    </h2>
                    <div className="flex gap-2 mb-8">
                       {['BAZI', 'ELEMENTS', 'CYCLES', 'FUSION'].map(tag => (
                          <span key={tag} className="text-[9px] uppercase tracking-widest text-[#3e2718] border border-[#3e2718]/20 px-3 py-1.5 rounded-lg bg-[#3e2718]/5 font-bold">{tag}</span>
                       ))}
                    </div>
                    <div className="bg-[#2a1b0e]/10 border border-[#2a1b0e]/10 p-6 rounded-2xl mb-8 shadow-inner">
                       <p className="font-sans text-sm text-[#1a0f05] leading-relaxed italic font-medium">
                          "Systematische Analyse deiner Schicksalsmatrix. Klicke hier für das Briefing."
                       </p>
                    </div>
                    <div className="absolute bottom-8 right-8 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 opacity-80 group-hover:opacity-100">
                       <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#2a1b0e] to-[#0f0803] text-[#d4af37] flex items-center justify-center text-2xl shadow-[0_4px_8px_rgba(0,0,0,0.4)] border border-[#d4af37]/20">💬</div>
                    </div>
                </div>
            </div>
         </div>

         {/* AGENT 2: VICTORIA CELESTIA */}
         <div 
            onClick={() => handleSelection('victoria')}
            className="group relative cursor-pointer transform hover:-translate-y-2 transition-transform duration-500"
         >
            <div className="relative rounded-[2.5rem] p-10 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7)] transition-all duration-500 group-hover:shadow-[0_35px_60px_-15px_rgba(212,175,55,0.15)]
                 bg-gradient-to-br from-[#785a3c] via-[#a88856] to-[#4a3420]
                 border-t border-l border-[#d4af37]/40 border-b-[6px] border-r-[6px] border-[#2a1b0e]/60"
            >
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/brushed-alum-dark.png')] mix-blend-overlay pointer-events-none"></div>
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:-rotate-12 duration-700 mix-blend-multiply">
                   <span className="text-9xl text-[#2a1b0e]">⚖️</span>
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-8">
                       <span className="text-[9px] uppercase tracking-[0.3em] font-black text-[#3e2718]">Celestial_Relationship_Module</span>
                       <div className="w-2 h-2 rounded-full bg-[#3e2718] shadow-inner"></div>
                    </div>
                    <h2 className="font-serif text-5xl mb-4 text-[#2a1b0e] font-bold [text-shadow:1px_1px_2px_rgba(0,0,0,0.5)]">
                        Victoria Celestia
                    </h2>
                    <div className="flex gap-2 mb-8 flex-wrap">
                       {['RELATIONSHIPS', 'CAREER', 'SYNASTRY'].map(tag => (
                          <span key={tag} className="text-[9px] uppercase tracking-widest text-[#3e2718] border border-[#3e2718]/20 px-3 py-1.5 rounded-lg bg-[#3e2718]/5 font-bold">{tag}</span>
                       ))}
                    </div>
                    <div className="bg-[#2a1b0e]/10 border border-[#2a1b0e]/10 p-6 rounded-2xl mb-8 shadow-inner">
                       <p className="font-sans text-sm text-[#1a0f05] leading-relaxed italic font-medium">
                          "Ich beleuchte deine Beziehungsdynamik. Starte die Konversation jetzt."
                       </p>
                    </div>
                    <div className="absolute bottom-8 right-8 transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 opacity-80 group-hover:opacity-100">
                       <div className="w-14 h-14 rounded-full bg-gradient-to-b from-[#2a1b0e] to-[#0f0803] text-[#d4af37] flex items-center justify-center text-2xl shadow-[0_4px_8px_rgba(0,0,0,0.4)] border border-[#d4af37]/20">💬</div>
                    </div>
                </div>
            </div>
         </div>

      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { InputCard } from './components/InputCard';
import { AnalysisView } from './components/AnalysisView';
import { ResultSymbol } from './components/ResultSymbol'; // Kept for consistency if needed, though mostly used via AnalysisView or CharacterDashboard
import { QuizView } from './components/QuizView';
import { CharacterDashboard } from './components/CharacterDashboard';
import { CosmicWeather } from './components/CosmicWeather';
import { AgentSelectionView } from './components/AgentSelectionView';
import { MatrixDocsView } from './components/MatrixDocsView';
import { BirthData, CalculationState, FusionResult, Transit } from './types';
import { runFusionAnalysis } from './services/astroPhysics';
import { generateSymbol, SymbolConfig, GenerationResult } from './services/geminiService';
import { fetchCurrentTransits, fetchTransitsForDate } from './services/transitService';
import { loadState, saveState, clearState } from './services/persistence';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { DEMO_MODE, FORCE_HAPPY_PATH } from './src/config';

type ViewType = 'dashboard' | 'quizzes' | 'character_dashboard' | 'agent_selection' | 'matrix';

interface GenerationStats {
  engine: string;
  durationMs?: number;
  error?: string;
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const { t } = useLanguage();

  // Initialize theme from localStorage with system preference fallback
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const savedTheme = localStorage.getItem('astro_theme');
      if (savedTheme) {
        return savedTheme === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      console.warn('Theme preference access failed:', e);
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('astro_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('astro_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // State
  const [astroState, setAstroState] = useState<CalculationState>(CalculationState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<FusionResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(null);

  const [transits, setTransits] = useState<Transit[]>([]);
  const [loadingTransits, setLoadingTransits] = useState(false);
  const [transitDate, setTransitDate] = useState<Date>(new Date());

  // Load Persistence
  useEffect(() => {
    const savedState = loadState();
    if (savedState) {
      console.log("Loading saved journey state...", savedState);
      if (savedState.analysisResult) {
        setAnalysisResult(savedState.analysisResult);
        setAstroState(CalculationState.COMPLETE);
      }
      if (savedState.generatedImage) {
        setGeneratedImage(savedState.generatedImage);
      }
      if (savedState.selectedAgent) {
        setSelectedAgent(savedState.selectedAgent);
      }

      // Smart Navigation Recovery (Enhanced for Happy Path)
      if (savedState.selectedAgent) {
        setCurrentView('character_dashboard');
      } else if (savedState.generatedImage) {
        setCurrentView('agent_selection');
      } else if (savedState.analysisResult) {
        setCurrentView('dashboard');
        // If we have analysis but no image, in force mode we might want to auto-trigger? 
        // But better to let user see the analysis first unless logic dictates otherwise.
      }
    }
  }, []);

  // Save Persistence
  useEffect(() => {
    if (analysisResult || generatedImage || selectedAgent) {
      saveState({
        analysisResult,
        generatedImage,
        selectedAgent,
        lastView: currentView // Optional to track
      });
    }
  }, [analysisResult, generatedImage, selectedAgent, currentView]);

  const handleReset = () => {
    clearState();
    setAnalysisResult(null);
    setGeneratedImage(null);
    setSelectedAgent(null);
    setAstroState(CalculationState.IDLE);
    setGenerationStats(null);
    setCurrentView('dashboard');
    window.location.reload(); // Hard reset
  };

  useEffect(() => {
    const loadTransits = async () => {
      setLoadingTransits(true);
      try {
        const data = await fetchCurrentTransits();
        if (data && data.length > 0) setTransits(data);
        setTransitDate(new Date());
      } catch (e) {
        console.error("Failed to load transits", e);
      } finally {
        setLoadingTransits(false);
      }
    };
    loadTransits();
  }, []);

  // Separate Image Generation Function to be called from validations or UI
  const performImageGeneration = async (prompt: string, customConfig?: SymbolConfig) => {
    setAstroState(CalculationState.GENERATING_IMAGE);
    try {
      const result: GenerationResult = await generateSymbol(prompt, customConfig);

      setGeneratedImage(result.imageUrl);
      setGenerationStats({
        engine: result.engineUsed,
        durationMs: result.durationMs,
        error: result.error
      });

      setAstroState(CalculationState.FINISHED);

      // Auto-navigate to Agent Selection
      // Add small delay for user to see "Finished" state if needed
      setTimeout(() => {
        setCurrentView('agent_selection');
      }, 800);

    } catch (error) {
      console.error("Critical generation error", error);
      setAstroState(CalculationState.COMPLETE);

      // Even on error, if FORCE_HAPPY_PATH, ensures we don't block. 
      // But generateSymbol logic now guarantees return, so this catch handles only catastrophic app errors.
      if (FORCE_HAPPY_PATH) {
        // Should theoretically not happen with new geminiService
        setCurrentView('agent_selection');
      }
    }
  };

  const handleValidation = async (data: BirthData) => {
    if (!data.date || !data.time) return;
    setAstroState(CalculationState.CALCULATING);
    setGeneratedImage(null);
    setGenerationStats(null);
    setLoadingTransits(true);
    try {
      const dateObj = new Date(data.date + 'T' + data.time);
      const [result, birthTransits] = await Promise.all([
        runFusionAnalysis(data),
        fetchTransitsForDate(dateObj)
      ]);
      setAnalysisResult(result);
      if (birthTransits && birthTransits.length > 0) {
        setTransits(birthTransits);
        setTransitDate(dateObj);
      }
      setAstroState(CalculationState.COMPLETE);

      setTimeout(() => {
        document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);

      // AUTO-PROGRESSION (Requirement C)
      // Automatically trigger symbol generation after analysis in Demo/Happy Path
      if (FORCE_HAPPY_PATH || DEMO_MODE) {
        // Trigger generation with default config
        performImageGeneration(result.prompt, { influence: 'balanced' }); // Default config
      }

    } catch (error) {
      setAstroState(CalculationState.ERROR);
    } finally {
      setLoadingTransits(false);
    }
  };

  const handleManualGenerateImage = async (customConfig: SymbolConfig) => {
    if (!analysisResult) return;
    performImageGeneration(analysisResult.prompt, customConfig);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setCurrentView('character_dashboard');
  };

  if (currentView === 'agent_selection' && analysisResult && generatedImage) {
    return (
      <AgentSelectionView
        result={analysisResult}
        symbolUrl={generatedImage}
        onAgentSelect={handleAgentSelect}
      />
    );
  }

  return (
    <div className="min-h-screen bg-astro-bg text-astro-text pl-20 md:pl-64 transition-all duration-300 relative">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onReset={handleReset} // Passed handleReset to sidebar if updated, or stick to current
      />

      {/* Reset/Clear State Button (Debug/Utility) */}
      <div className="fixed bottom-4 left-4 z-[60] md:hidden">
        {/* Mobile debug/reset if needed */}
      </div>

      <main className="max-w-[1600px] mx-auto p-6 md:p-12 lg:p-16 relative">

        {/* Header Status & Utility */}
        <div className="flex justify-between items-center mb-12 animate-fade-in">
          <div className="flex items-center gap-2 text-astro-subtext text-xs font-sans tracking-widest uppercase font-bold">
            <span>Core_Logic_V5.1_${DEMO_MODE ? 'DEMO' : 'PROD'}</span>
            <span className="text-astro-gold animate-pulse">•</span>
            <span>
              {currentView === 'dashboard' ? 'FUSION_ACTIVE' :
                currentView === 'quizzes' ? 'KNOWLEDGE_VAULT' :
                  currentView === 'matrix' ? 'SYSTEM_DOCS' : 'ENTITY_MATRIX'}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Observability Badge */}
            {generatedImage && generationStats && (
              <div className="flex flex-col text-[9px] text-right font-mono text-astro-subtext/60 leading-tight hidden xl:block">
                <div>ENGINE: {generationStats.engine.toUpperCase()}</div>
                <div>RTIME: {generationStats.durationMs}ms</div>
              </div>
            )}

            <div className="hidden md:flex items-center gap-4">
              <div className="flex flex-col items-end mr-2">
                <span className="font-sans text-[10px] text-astro-subtext uppercase tracking-widest font-bold">Authenticated_Seeker</span>
                <span className="font-serif italic text-sm text-astro-gold">Julian S.</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-astro-gold animate-pulse"></div>
            </div>

            {/* Reset Button */}
            {(analysisResult || selectedAgent) && (
              <button
                onClick={handleReset}
                className="text-xs text-red-400 hover:text-red-500 underline decoration-dotted underline-offset-4"
                title="Reset Journey State"
              >
                RESET
              </button>
            )}
          </div>
        </div>

        {currentView === 'quizzes' ? (
          <QuizView />
        ) : currentView === 'character_dashboard' ? (
          analysisResult && generatedImage ? (
            <CharacterDashboard
              result={analysisResult}
              symbolUrl={generatedImage}
              onNavigateToQuizzes={() => setCurrentView('quizzes')}
              transits={transits}
              isLoadingTransits={loadingTransits}
            />
          ) : (
            <div className="text-center py-20">
              <h3 className="font-serif text-2xl text-astro-text mb-4">Matrix Leer</h3>
              <p className="font-sans text-sm text-astro-subtext mb-8">Daten inkonsistent. State restored partial.</p>
              <button onClick={handleReset} className="text-astro-gold underline">System Reset</button>
            </div>
          )
        ) : currentView === 'matrix' ? (
          <MatrixDocsView />
        ) : (
          <div className="flex flex-col gap-16 md:gap-24 animate-fade-in">

            {/* TOP SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-start">
              <div className="lg:col-span-4 space-y-10 sticky top-10">
                <InputCard onSubmit={handleValidation} isLoading={astroState === CalculationState.CALCULATING || astroState === CalculationState.GENERATING_IMAGE} />
              </div>

              <div className="lg:col-span-8 space-y-12">
                <CosmicWeather
                  transits={transits}
                  isLoading={loadingTransits}
                  displayDate={transitDate}
                  title={astroState === CalculationState.IDLE ? t.weather.title : t.weather.matrix_title}
                />

                {astroState === CalculationState.IDLE && (
                  <div className="flex flex-col items-center justify-center text-center py-10 opacity-60">
                    <p className="font-serif italic text-lg text-astro-subtext">{t.weather.idle_state}</p>
                  </div>
                )}

                {astroState === CalculationState.ERROR && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20 bg-red-50 dark:bg-red-900/10 rounded-[3rem] border border-red-200">
                    <h3 className="font-serif text-3xl text-red-600">{t.weather.connection_lost}</h3>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM SECTION */}
            {(astroState !== CalculationState.IDLE && astroState !== CalculationState.ERROR) && analysisResult && (
              <div id="analysis-section" className="w-full max-w-5xl mx-auto space-y-16 animate-fade-in-up border-t border-astro-border pt-16 md:pt-24">
                <AnalysisView
                  result={analysisResult}
                  state={astroState}
                  onGenerateImage={handleManualGenerateImage}
                  onNavigateToQuizzes={() => setCurrentView('quizzes')}
                  transits={transits}
                />

                {/* Observability Display for Generation */}
                {generationStats && generationStats.error && (
                  <div className="p-4 bg-red-900/20 border border-red-800 text-red-200 text-sm font-mono rounded-lg">
                    Error: {generationStats.error} (Fallback active)
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

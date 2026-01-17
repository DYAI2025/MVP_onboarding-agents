
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
import { ErrorCard } from './components/ErrorCard';
import { BirthData, CalculationState, FusionResult, Transit } from './types';
import { runFusionAnalysis } from './services/astroPhysics';
import { generateSymbol, SymbolConfig, GenerationResult } from './services/geminiService';
import { fetchCurrentTransits, fetchTransitsForDate } from './services/transitService';
import { loadState, saveState, clearState } from './services/persistence';
import { supabase } from './services/supabaseClient';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';

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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [transitError, setTransitError] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [generationStats, setGenerationStats] = useState<GenerationStats | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);

  const [transits, setTransits] = useState<Transit[]>([]);
  const [loadingTransits, setLoadingTransits] = useState(false);
  const [transitDate, setTransitDate] = useState<Date>(new Date());

  // Load Persistence
  useEffect(() => {
    const initJourney = async () => {
      const savedState = await loadState();
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
          setIsChatActive(false);
        } else if (savedState.analysisResult) {
          setCurrentView('dashboard');
        }
      }
    };

    initJourney();
  }, []);

  // Save Persistence
  useEffect(() => {
    if (analysisResult || generatedImage || selectedAgent) {
      // Async save (fire and forget)
      saveState({
        analysisResult,
        generatedImage,
        selectedAgent,
        lastView: currentView // Optional to track
      }).catch(err => console.error("Background save failed:", err));
    }
  }, [analysisResult, generatedImage, selectedAgent, currentView]);

  const handleReset = () => {
    clearState();
    setAnalysisResult(null);
    setGeneratedImage(null);
    setSelectedAgent(null);
    setAstroState(CalculationState.IDLE);
    setGenerationStats(null);
    setIsChatActive(false);
    setCurrentView('dashboard');
    window.location.reload(); // Hard reset
  };

  useEffect(() => {
    const loadTransits = async () => {
      setLoadingTransits(true);
      setTransitError(null);
      try {
        const data = await fetchCurrentTransits();
        if (data && data.length > 0) setTransits(data);
        setTransitDate(new Date());
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to load Cosmic Weather';
        setTransitError(errorMsg);
        console.error('[App] Transit loading failed:', e);
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
        engine: result.engine,
        durationMs: result.durationMs,
        error: undefined
      });

      setAstroState(CalculationState.FINISHED);

    } catch (error) {
      console.error("Critical generation error", error);
      setAstroState(CalculationState.COMPLETE);

      // Error handling: If generation fails, we still want to proceed to the agent selection
      // This ensures the user isn't stuck on the analysis screen.
      setGenerationStats({
        engine: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      // Auto-navigate to Agent Selection regardless of success/failure
      // Increased delay to 2.0s to allow user to see "Visual Confirmation" state or failure state
      setTimeout(() => {
        setCurrentView('agent_selection');
        setIsChatActive(false);
      }, 2000);
    }
  };

  const handleValidation = async (data: BirthData) => {
    if (!data.date || !data.time) return;
    setAstroState(CalculationState.CALCULATING);
    setAnalysisError(null); // Clear previous errors
    setTransitError(null); // Clear previous transit errors
    setGeneratedImage(null);
    setGenerationStats(null);
    setLoadingTransits(true);

    try {
      // STEP 1.3: Ensure Supabase session exists before analysis
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // Sign in anonymously if no session
        console.log('[App] No active session, creating anonymous session...');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();

        if (anonError || !anonData.user) {
          setAnalysisError('Failed to create session. Please refresh and try again.');
          setAstroState(CalculationState.ERROR);
          setLoadingTransits(false);
          return;
        }

        console.log('[App] Created anonymous session:', anonData.user.id);
      } else {
        console.log('[App] Using existing session:', user.id);
      }

      const dateObj = new Date(data.date + 'T' + data.time);

      // Run analysis (critical path)
      const result = await runFusionAnalysis(data);
      setAnalysisResult(result);
      setAstroState(CalculationState.COMPLETE);

      // Fetch transits separately (non-critical, can fail without blocking analysis)
      try {
        const birthTransits = await fetchTransitsForDate(dateObj);
        if (birthTransits && birthTransits.length > 0) {
          setTransits(birthTransits);
          setTransitDate(dateObj);
        }
      } catch (transitError) {
        // Transit failure doesn't block analysis
        const errorMsg = transitError instanceof Error 
          ? transitError.message 
          : 'Failed to load birth transits';
        setTransitError(errorMsg);
        console.error('[App] Transit fetch failed (non-critical):', transitError);
      } finally {
        setLoadingTransits(false);
      }

      setTimeout(() => {
        document.getElementById('analysis-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 500);

    } catch (error) {
      // Analysis failure is critical
      setAstroState(CalculationState.ERROR);
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed. Please try again.';
      setAnalysisError(errorMessage);
      console.error('[App] Analysis failed:', error);
      setLoadingTransits(false);
    }
  };

  const handleManualGenerateImage = async (customConfig: SymbolConfig) => {
    if (!analysisResult) return;
    performImageGeneration(analysisResult.prompt, customConfig);
  };

  const handleAgentSelect = (agentId: string) => {
    setSelectedAgent(agentId);
    setIsChatActive(false);
    setCurrentView('character_dashboard');
  };

  const handleBackToDashboard = () => {
    setIsChatActive(false);
    setCurrentView('dashboard');
  };

  if (currentView === 'agent_selection') {
    return (
      <AgentSelectionView
        result={analysisResult}
        symbolUrl={generatedImage}
        onAgentSelect={handleAgentSelect}
        onBackToDashboard={() => setCurrentView('dashboard')}
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
            <span>Core_Logic_V5.1_PROD</span>
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
                  error={transitError}
                />

                {astroState === CalculationState.IDLE && (
                  <div className="flex flex-col items-center justify-center text-center py-10 opacity-60">
                    <p className="font-serif italic text-lg text-astro-subtext">{t.weather.idle_state}</p>
                  </div>
                )}

                {astroState === CalculationState.ERROR && analysisError && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <ErrorCard
                      title="Analyse fehlgeschlagen"
                      message={analysisError}
                      severity="error"
                      actionLabel="Erneut versuchen"
                      onAction={() => {
                        // Retry by clearing error and resetting state
                        setAnalysisError(null);
                        setAstroState(CalculationState.IDLE);
                      }}
                    />
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

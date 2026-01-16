
import React, { useState, useEffect } from 'react';
import { BirthData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onSubmit: (data: BirthData) => void;
  isLoading: boolean;
}

export const InputCard: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const { t } = useLanguage();
  
  // Detect browser timezone as default
  const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const [formData, setFormData] = useState<BirthData>({
    date: '',
    time: '',
    place: '',
    lat: 0,
    lon: 0,
    tz: defaultTz
  });

  const [validationErrors, setValidationErrors] = useState<{
    lat?: string;
    lon?: string;
    tz?: string;
  }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    
    // Handle number inputs for lat/lon
    if (id === 'lat' || id === 'lon') {
      const numValue = parseFloat(value);
      setFormData({ ...formData, [id]: isNaN(numValue) ? 0 : numValue });
    } else {
      setFormData({ ...formData, [id]: value });
    }
    
    // Clear validation error for this field
    if (validationErrors[id as keyof typeof validationErrors]) {
      setValidationErrors({ ...validationErrors, [id]: undefined });
    }
  };

  const validateCoordinates = (): boolean => {
    const errors: typeof validationErrors = {};
    
    // Validate latitude
    if (formData.lat < -90 || formData.lat > 90) {
      errors.lat = 'Latitude must be between -90 and 90';
    }
    
    // Validate longitude
    if (formData.lon < -180 || formData.lon > 180) {
      errors.lon = 'Longitude must be between -180 and 180';
    }
    
    // Validate timezone (basic IANA format check)
    if (!formData.tz || !formData.tz.includes('/')) {
      errors.tz = 'Please enter a valid timezone (e.g. Europe/Berlin)';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateCoordinates()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-astro-card border border-astro-border rounded-[2rem] p-8 md:p-12 shadow-ambient relative overflow-hidden group max-w-2xl mx-auto lg:mx-0">
      
      <div className="mb-8 border-b border-astro-border/50 pb-6">
        <h3 className="font-serif text-4xl text-astro-text mb-3 leading-tight">{t.input.title}</h3>
        <p className="font-sans text-sm text-astro-subtext leading-relaxed">
           Bitte gib deine Geburtsdaten ein. Wir berechnen sofort deine westliche und östliche Signatur.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 font-sans">
        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="date" className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">{t.input.date}</label>
            <input
              type="date"
              id="date"
              required
              className="w-full bg-white dark:bg-zinc-900/50 border border-astro-border rounded-xl p-4 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner"
              onChange={handleChange}
              value={formData.date}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="time" className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">{t.input.time}</label>
            <input
              type="time"
              id="time"
              required
              className="w-full bg-white dark:bg-zinc-900/50 border border-astro-border rounded-xl p-4 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner"
              onChange={handleChange}
              value={formData.time}
            />
          </div>
        </div>

        {/* Birth Place */}
        <div className="space-y-2">
          <label htmlFor="place" className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">GEBURTSORT</label>
          <input
            type="text"
            id="place"
            required
            placeholder="z.B. Berlin, Deutschland"
            className="w-full bg-white dark:bg-zinc-900/50 border border-astro-border rounded-xl p-4 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner placeholder:text-gray-300"
            onChange={handleChange}
            value={formData.place}
          />
        </div>

        {/* Coordinates Section */}
        <div className="space-y-4 pt-4 border-t border-astro-border/30">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">KOORDINATEN (ERFORDERLICH)</label>
            <a 
              href="https://www.google.com/maps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-astro-gold hover:text-astro-gold/80 transition-colors"
            >
              📍 Google Maps öffnen
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Latitude */}
            <div className="space-y-2">
              <label htmlFor="lat" className="block text-xs text-astro-subtext">Breitengrad (Latitude)</label>
              <div className="relative">
                <input
                  type="number"
                  id="lat"
                  required
                  step="0.000001"
                  min="-90"
                  max="90"
                  placeholder="z.B. 52.520008"
                  className={`w-full bg-white dark:bg-zinc-900/50 border rounded-xl p-4 pr-12 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner ${
                    validationErrors.lat ? 'border-red-500' : 'border-astro-border'
                  }`}
                  onChange={handleChange}
                  value={formData.lat || ''}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-astro-subtext text-sm">°N/S</span>
              </div>
              {validationErrors.lat && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.lat}</p>
              )}
            </div>

            {/* Longitude */}
            <div className="space-y-2">
              <label htmlFor="lon" className="block text-xs text-astro-subtext">Längengrad (Longitude)</label>
              <div className="relative">
                <input
                  type="number"
                  id="lon"
                  required
                  step="0.000001"
                  min="-180"
                  max="180"
                  placeholder="z.B. 13.404954"
                  className={`w-full bg-white dark:bg-zinc-900/50 border rounded-xl p-4 pr-12 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner ${
                    validationErrors.lon ? 'border-red-500' : 'border-astro-border'
                  }`}
                  onChange={handleChange}
                  value={formData.lon || ''}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-astro-subtext text-sm">°E/W</span>
              </div>
              {validationErrors.lon && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.lon}</p>
              )}
            </div>
          </div>

          {/* Helper Text */}
          <div className="bg-astro-gold/5 border border-astro-gold/20 rounded-lg p-4">
            <p className="text-xs text-astro-subtext leading-relaxed">
              💡 <strong>Tipp:</strong> Öffne <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-astro-gold hover:underline">Google Maps</a>, 
              suche deinen Geburtsort, klicke mit der rechten Maustaste auf die genaue Stelle und wähle "Koordinaten kopieren".
            </p>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label htmlFor="tz" className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">ZEITZONE</label>
          <input
            type="text"
            id="tz"
            required
            placeholder="z.B. Europe/Berlin"
            className={`w-full bg-white dark:bg-zinc-900/50 border rounded-xl p-4 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner ${
              validationErrors.tz ? 'border-red-500' : 'border-astro-border'
            }`}
            onChange={handleChange}
            value={formData.tz}
          />
          {validationErrors.tz && (
            <p className="text-xs text-red-500 mt-1">{validationErrors.tz}</p>
          )}
          <p className="text-xs text-astro-subtext mt-1">
            Auto-erkannt: <span className="text-astro-gold font-mono">{defaultTz}</span>
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 mt-6 rounded-2xl bg-gradient-to-r from-astro-gold to-[#B89628] text-white font-serif text-2xl italic tracking-wide shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-3 ${
            isLoading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <span>{t.input.button_loading}</span>
            </>
          ) : (
            <span>{t.input.button_idle}</span>
          )}
        </button>
      </form>
    </div>
  );
};

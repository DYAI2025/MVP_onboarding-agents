
import React, { useState } from 'react';
import { BirthData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onSubmit: (data: BirthData) => void;
  isLoading: boolean;
}

export const InputCard: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<BirthData>({
    date: '',
    time: '',
    location: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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

        <div className="space-y-2">
          <label htmlFor="location" className="block text-[10px] font-bold uppercase tracking-widest text-astro-subtext">{t.input.location}</label>
          <input
            type="text"
            id="location"
            required
            placeholder={t.input.placeholder_loc}
            className="w-full bg-white dark:bg-zinc-900/50 border border-astro-border rounded-xl p-4 text-astro-text focus:outline-none focus:border-astro-gold focus:ring-1 focus:ring-astro-gold/20 transition-all shadow-inner placeholder:text-gray-300"
            onChange={handleChange}
            value={formData.location}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-5 mt-6 rounded-2xl bg-gradient-to-r from-astro-gold to-[#B89628] text-white font-serif text-2xl italic tracking-wide shadow-lg hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
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

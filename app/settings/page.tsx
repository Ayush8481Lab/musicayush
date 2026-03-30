"use client";
import { useAppContext } from "../../context/AppContext";

const languages =[
  "Hindi", "Punjabi", "Bhojpuri", "Tamil", "Telugu", 
  "Kannada", "Gujarati", "Marathi", "Odia", 
  "Rajasthani", "Haryanvi", "Assamese", "Malayalam", "Bengali"
];

export default function SettingsPage() {
  const { language, setLanguage } = useAppContext();

  return (
    <div className="p-4 pt-12 min-h-screen pb-24 bg-black">
      <h1 className="text-4xl font-black mb-8 tracking-tighter">Settings</h1>
      
      <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800">
        <h2 className="text-xl font-bold mb-4">Content Language</h2>
        <p className="text-neutral-400 text-xs mb-4">Select your preferred language for the Home page.</p>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => {
            const isSelected = language === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => setLanguage(lang.toLowerCase())}
                className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                  isSelected ? "bg-white text-black shadow-lg" : "bg-neutral-800 text-neutral-300"
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  );
}

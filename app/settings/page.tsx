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
    <div className="p-4 min-h-screen pt-12 pb-24">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="bg-neutral-900/50 p-5 rounded-2xl border border-neutral-800">
        <h2 className="text-lg font-semibold mb-4 text-neutral-200">Music Language</h2>
        <div className="grid grid-cols-2 gap-3">
          {languages.map((lang) => {
            const isSelected = language === lang.toLowerCase();
            return (
              <button
                key={lang}
                onClick={() => setLanguage(lang.toLowerCase())}
                className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all ${
                  isSelected 
                    ? "bg-white text-black" 
                    : "bg-neutral-800 text-neutral-400 active:bg-neutral-700"
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

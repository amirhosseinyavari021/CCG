import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelect() {
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState('fa');

  const handleSelect = () => {
    changeLanguage(selectedLang);
    navigate('/welcome');
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-ccg-bg p-4">
      <div className="bg-ccg-card border border-blue-500/20 rounded-xl p-8 w-full max-w-md shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-ccg-blue text-3xl font-bold">CCG</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">CCG Platform</h1>
          <p className="text-slate-400">
            Command & Code Generator for DevOps Engineers
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-lg font-medium text-center text-slate-200">
            Select your preferred language
          </h2>
          
          <div className="flex justify-center gap-6">
            <button
              onClick={() => setSelectedLang('fa')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                selectedLang === 'fa'
                  ? 'border-ccg-blue bg-blue-500/10'
                  : 'border-ccg-border hover:border-blue-500/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                <span className="text-blue-400 font-bold">FA</span>
              </div>
              <span className="font-medium">فارسی</span>
            </button>
            
            <button
              onClick={() => setSelectedLang('en')}
              className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all ${
                selectedLang === 'en'
                  ? 'border-ccg-blue bg-blue-500/10'
                  : 'border-ccg-border hover:border-blue-500/50'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
                <span className="text-blue-400 font-bold">EN</span>
              </div>
              <span className="font-medium">English</span>
            </button>
          </div>
          
          <button
            onClick={handleSelect}
            className="w-full bg-gradient-to-r from-blue-500 to-ccg-blue text-white py-3 rounded-lg font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
          >
            <span>Continue</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

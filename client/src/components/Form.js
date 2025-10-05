// client/src/components/Form.js
import React, { useState, useEffect } from 'react';
import CustomSelect from './common/CustomSelect';
import CustomInput from './common/CustomInput';
import { osDetails } from '../constants/osDetails';
import { translations } from '../constants/translations';
import { Bot, FileCode, HelpCircle } from 'lucide-react'; // Icons for buttons

const Form = ({ onSubmit, onExplain, onScript, isLoading, lang }) => {
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [cli, setCli] = useState('');
  const [userInput, setUserInput] = useState('');
  const currentTranslations = translations[lang];

  useEffect(() => {
    // Auto-select first available version and cli when OS changes
    if (os && osDetails[os]) {
      const details = osDetails[os];
      if (details.versions.length > 0) {
        setOsVersion(details.versions[0]);
      } else {
        setOsVersion('');
      }
      if (details.clis.length > 0) {
        setCli(details.clis[0]);
      } else {
        setCli('');
      }
    }
  }, [os]);

  const validateAndSubmit = (handler) => {
    if (!userInput.trim()) {
      alert(currentTranslations.fieldRequired);
      return;
    }
    handler({ os, osVersion, cli, userInput });
  };

  const osOptions = Object.keys(osDetails).map(opt => ({
    value: opt,
    label: opt.charAt(0).toUpperCase() + opt.slice(1)
  }));

  const versionOptions = osDetails[os] ? osDetails[os].versions.map(v => ({ value: v, label: v })) : [];
  const cliOptions = osDetails[os] ? osDetails[os].clis.map(c => ({ value: c, label: c })) : [];

  return (
    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm p-6 md:p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CustomSelect
          label={currentTranslations.os}
          value={os}
          onChange={(e) => setOs(e.target.value)}
          options={osOptions}
        />
        <CustomSelect
          label={currentTranslations.osVersion}
          value={osVersion}
          onChange={(e) => setOsVersion(e.target.value)}
          options={versionOptions}
          disabled={!versionOptions.length}
        />
        <CustomSelect
          label={currentTranslations.cli}
          value={cli}
          onChange={(e) => setCli(e.target.value)}
          options={cliOptions}
          disabled={!cliOptions.length}
        />
      </div>

      <div className="mt-6">
        <CustomInput
          label={currentTranslations.yourRequest}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={currentTranslations.placeholder}
          isTextarea={true}
        />
      </div>

      {/* CHANGED: Updated button layout and added Script button */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => validateAndSubmit(onSubmit)}
          disabled={isLoading}
          className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <Bot className="w-5 h-5 mr-2" />
          {currentTranslations.generate}
        </button>

        {/* NEW: Script Button with a different color */}
        <button
          onClick={() => validateAndSubmit(onScript)}
          disabled={isLoading}
          className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <FileCode className="w-5 h-5 mr-2" />
          {currentTranslations.script}
        </button>

        <button
          onClick={() => validateAndSubmit(onExplain)}
          disabled={isLoading}
          className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          <HelpCircle className="w-5 h-5 mr-2" />
          {currentTranslations.explain}
        </button>
      </div>
    </div>
  );
};

export default Form;
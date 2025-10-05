// client/src/components/Form.js
import React, { useState, useEffect } from 'react';
import CustomSelect from './common/CustomSelect';
import CustomInput from './common/CustomInput';
import { t } from '../constants/translations';
import osDetails from '../constants/osDetails';

const Form = ({ onSubmit, onExplain, onScript, isLoading, loadingMessage, lang }) => {
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [cli, setCli] = useState('');
  const [userInput, setUserInput] = useState('');

  const currentTranslations = t[lang] || t['en'];

  useEffect(() => {
    if (osDetails[os]) {
      setOsVersion(osDetails[os].versions[0]);
      setCli(osDetails[os].clis[0]);
    } else if (os === 'other') {
      setCli(osDetails.other.clis[0]);
      setOsVersion('');
    }
  }, [os]);

  const validateAndSubmit = (handler) => {
    if (!userInput.trim()) {
      alert(currentTranslations.fieldRequired);
      return;
    }
    handler({ os, osVersion, cli, userInput });
  };

  const osOptions = [...Object.keys(osDetails).filter(k => k !== 'other'), 'other'];

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{currentTranslations.osLabel}</label>
          <CustomSelect
            value={os}
            onChange={(e) => setOs(e.target.value)}
            options={osOptions.map(opt => ({
              value: opt,
              label: opt === 'other' ? currentTranslations.osOther : opt.charAt(0).toUpperCase() + opt.slice(1)
            }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{currentTranslations.osVersionLabel}</label>
          <CustomSelect
            value={osVersion}
            onChange={(e) => setOsVersion(e.target.value)}
            options={
              os === 'other'
                ? []
                : osDetails[os]?.versions.map(ver => ({ value: ver, label: ver })) || []
            }
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">{currentTranslations.cliLabel}</label>
          <CustomSelect
            value={cli}
            onChange={(e) => setCli(e.target.value)}
            options={
              os === 'other'
                ? osDetails.other.clis.map(cli => ({ value: cli, label: cli }))
                : osDetails[os]?.clis.map(cli => ({ value: cli, label: cli }))
            }
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-1">{currentTranslations.requestLabel}</label>
        <CustomInput
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={currentTranslations.requestPlaceholder}
          isTextarea
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => validateAndSubmit(onSubmit)}
          disabled={isLoading}
          className={`flex-1 bg-cyan-600 text-white px-4 py-2 rounded-md hover:bg-cyan-700 disabled:bg-gray-600 transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isLoading ? loadingMessage : currentTranslations.generateButton}
        </button>
        <button
          onClick={() => validateAndSubmit(onScript)}
          disabled={isLoading}
          className={`flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-600 transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isLoading ? loadingMessage : currentTranslations.scriptButton}
        </button>
        <button
          onClick={() => validateAndSubmit(onExplain)}
          disabled={isLoading}
          className={`flex-1 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-600 transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isLoading ? loadingMessage : currentTranslations.explainButton}
        </button>
      </div>
    </div>
  );
};

export default Form;
// client/src/components/Form.js
import React, { useState, useEffect } from 'react';
import CustomSelect from './common/CustomSelect'; // اطمینان حاصل کنید که این فایل وجود دارد
import CustomInput from './common/CustomInput'; // اطمینان حاصل کنید که این فایل وجود دارد
// حذف Chakra UI
// import { Button, Flex, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import translations from '../constants/translations'; // تغییر نام ایمپورت برای تطبیق با App.js
import osDetails from '../constants/osDetails';

const Form = ({ onSubmit, onExplain, isLoading, loadingMessage, lang, activeTab, onTabChange }) => { // تغییر نام prop از setActiveTab به onTabChange
  const [os, setOs] = useState('linux');
  const [osVersion, setOsVersion] = useState('');
  const [cli, setCli] = useState('');
  const [userInput, setUserInput] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [customOsName, setCustomOsName] = useState('');
  const [customOsVersion, setCustomOsVersion] = useState('');

  const t = translations[lang] || translations['en']; // استفاده از ترجمه مربوط به زبان

  useEffect(() => {
    if (osDetails[os]) {
      setOsVersion(osDetails[os].versions[0]);
      setCli(osDetails[os].clis[0]);
      setCustomOsName('');
      setCustomOsVersion('');
    } else if (os === 'other') {
      setCli(osDetails.other.clis[0]);
      setOsVersion(''); // Clear version when switching to other
    }
  }, [os, osDetails]);

  const validateAndSubmit = (handler) => {
    const newErrors = {};
    if (!userInput.trim()) newErrors.userInput = t.fieldRequired;

    if (os === 'other') {
      if (!customOsName.trim()) newErrors.customOsName = t.fieldRequired;
      if (!customOsVersion.trim()) newErrors.customOsVersion = t.fieldRequired;
    }

    setFormErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      let finalOs = os;
      let finalOsVersion = osVersion;

      if (os === 'other') {
        finalOs = customOsName.trim();
        finalOsVersion = customOsVersion.trim();
      }

      handler({ os: finalOs, osVersion: finalOsVersion, cli, userInput });
    }
  };

  const osOptions = [...Object.keys(osDetails).filter(k => k !== 'other'), 'other'];

  return (
    <div className="w-full flex flex-col gap-6"> {/* جایگزین VStack */}
      <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200"> {/* جایگزین Text */}
        {t.formTitle}
      </h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap"> {/* جایگزین Flex */}
        <button
          onClick={() => onTabChange('generate')} // استفاده از onTabChange
          className={`px-4 py-2 text-sm rounded-md ${activeTab === 'generate'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          {t.generateCommands}
        </button>
        <button
          onClick={() => onTabChange('script')} // استفاده از onTabChange
          className={`px-4 py-2 text-sm rounded-md ${activeTab === 'script'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          {t.generateScript}
        </button>
        <button
          onClick={() => onTabChange('analyze')} // استفاده از onTabChange
          className={`px-4 py-2 text-sm rounded-md ${activeTab === 'analyze'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          {t.analyzeCommand}
        </button>
        <button
          onClick={() => onTabChange('explain')} // استفاده از onTabChange
          className={`px-4 py-2 text-sm rounded-md ${activeTab === 'explain'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
          {t.explainCommand}
        </button>
      </div>

      <CustomSelect
        label={t.osLabel}
        value={os}
        onChange={(e) => setOs(e.target.value)}
        options={osOptions.map(opt => ({
          value: opt,
          label: opt === 'other' ? t.osOther : opt.charAt(0).toUpperCase() + opt.slice(1)
        }))}
        error={formErrors.os}
      />

      {os === 'other' ? (
        <>
          <CustomInput
            label={t.customOsNameLabel}
            value={customOsName}
            onChange={(e) => setCustomOsName(e.target.value)}
            placeholder={t.customOsNamePlaceholder}
            error={formErrors.customOsName}
          />
          <CustomInput
            label={t.customOsVersionLabel}
            value={customOsVersion}
            onChange={(e) => setCustomOsVersion(e.target.value)}
            placeholder={t.customOsVersionPlaceholder}
            error={formErrors.customOsVersion}
          />
        </>
      ) : (
        <CustomSelect
          label={t.osVersionLabel}
          value={osVersion}
          onChange={(e) => setOsVersion(e.target.value)}
          options={osDetails[os]?.versions.map(ver => ({ value: ver, label: ver })) || []}
          error={formErrors.osVersion}
        />
      )}

      <CustomSelect
        label={t.cliLabel}
        value={cli}
        onChange={(e) => setCli(e.target.value)}
        options={
          os === 'other'
            ? osDetails.other.clis.map(cli => ({ value: cli, label: cli }))
            : osDetails[os]?.clis.map(cli => ({ value: cli, label: cli }))
        }
        error={formErrors.cli}
      />

      <CustomInput
        label={t.requestLabel}
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={t.requestPlaceholder}
        error={formErrors.userInput}
        isTextarea={true} // اطمینان از اینکه textarea است
      />

      <div className="flex gap-4 w-full"> {/* جایگزین Flex */}
        <button
          onClick={() => validateAndSubmit(onSubmit)}
          disabled={isLoading}
          className={`w-full bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
        >
          {isLoading && loadingMessage ? (
            <span>{loadingMessage}</span> // نمایش پیام لودینگ در دکمه
          ) : (
            activeTab === 'generate' ? t.generateButton :
              activeTab === 'script' ? t.scriptButton :
                activeTab === 'analyze' ? t.analyzeButton : t.explainButton
          )}
        </button>
      </div>
    </div>
  );
};

export default Form;
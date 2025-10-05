import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Correct import for useTranslation
import CustomSelect from './common/CustomSelect';
import CustomInput from './common/CustomInput';
import LoadingSpinner from './common/LoadingSpinner';
import { osOptions, shellOptions } from '../../constants/osDetails'; // Adjust path if needed

const Form = ({
  os,
  setOs,
  osVersion,
  setOsVersion,
  shell,
  setShell,
  request,
  setRequest,
  onGenerateCommand,
  onGenerateScript,
  onExplainCommand,
  isLoading,
  currentLanguage
}) => {
  const { t } = useTranslation(); // Use hook, not direct import from translations

  const handleGenerateCommand = () => {
    onGenerateCommand();
  };

  const handleGenerateScript = () => {
    onGenerateScript();
  };

  const handleExplainCommand = () => {
    onExplainCommand();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full mx-auto md:max-w-2xl">
      <div className="space-y-4">
        <CustomSelect
          label={t('os')}
          value={os}
          onChange={setOs}
          options={osOptions}
        />
        <CustomSelect
          label={t('osVersion')}
          value={osVersion}
          onChange={setOsVersion}
          options={osOptions.find(opt => opt.value === os)?.versions || []}
          disabled={!os}
        />
        <CustomSelect
          label={t('shell')}
          value={shell}
          onChange={setShell}
          options={shellOptions}
        />
        <CustomInput
          label={t('request')}
          value={request}
          onChange={setRequest}
          placeholder={t('requestPlaceholder')}
          multiline
          rows={3}
        />
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            onClick={handleGenerateCommand}
            disabled={isLoading || !request.trim()}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-md transition-colors duration-200 flex-1 flex items-center justify-center space-x-2"
          >
            {isLoading && <LoadingSpinner size="small" />}
            <span>{t('generateCommand')}</span>
          </button>
          <button
            onClick={handleGenerateScript}
            disabled={isLoading || !request.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-md transition-colors duration-200 flex-1 flex items-center justify-center space-x-2"
          >
            {isLoading && <LoadingSpinner size="small" />}
            <span>{t('generateScript')}</span>
          </button>
          <button
            onClick={handleExplainCommand}
            disabled={isLoading || !request.trim()}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-500 text-white px-6 py-3 rounded-md transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading && <LoadingSpinner size="small" />}
            <span>{t('explainCommand')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Form;
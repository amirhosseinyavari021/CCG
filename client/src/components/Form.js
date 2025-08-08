import React, { useState, useEffect } from 'react';
import { Wand2, Search } from 'lucide-react';
import { translations } from '../constants/translations';
import { osDetails } from '../constants/osDetails';
import Card from './common/Card';
import CustomSelect from './common/CustomSelect';
import LoadingSpinner from './common/LoadingSpinner';

const Form = ({ onSubmit, onExplain, isLoading, loadingMessage, lang }) => {
    const t = translations[lang];
    
    const [os, setOs] = useState('linux');
    const [osVersion, setOsVersion] = useState('');
    const [cli, setCli] = useState('');
    const [userInput, setUserInput] = useState('');
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        setOsVersion(osDetails[os].versions[0]);
        setCli(osDetails[os].clis[0]);
    }, [os]);

    const validateAndSubmit = (handler) => {
        const newErrors = {};
        if (!userInput.trim()) newErrors.userInput = t.fieldRequired;
        if (!os) newErrors.os = t.fieldRequired;
        if (!osVersion) newErrors.osVersion = t.fieldRequired;
        if (!cli) newErrors.cli = t.fieldRequired;
        
        setFormErrors(newErrors);
        
        if (Object.keys(newErrors).length === 0) {
            handler({ os, osVersion, cli, userInput });
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">CMDGEN</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-md">Generate commands, or enter a command/script to get an explanation.</p>

            <Card lang={lang}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <CustomSelect label={t.os} value={os} onChange={setOs} options={Object.keys(osDetails)} placeholder={t.os} lang={lang} error={formErrors.os} />
                    <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os]?.versions || []} placeholder={t.selectVersion} lang={lang} error={formErrors.osVersion} />
                    <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os]?.clis || []} placeholder={t.selectCli} lang={lang} error={formErrors.cli} />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.questionLabel} <span className="text-red-500">*</span></label>
                    <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={t.questionPlaceholder} className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 resize-none" />
                    {formErrors.userInput && <p className="text-red-500 text-xs mt-1">{formErrors.userInput}</p>}
                </div>
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => validateAndSubmit(onSubmit)} disabled={isLoading} className="w-full bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px]">
                        {isLoading ? <LoadingSpinner/> : <><Wand2 size={18} /><span className="ml-2">{t.generate}</span></>}
                    </button>
                    <button onClick={() => validateAndSubmit(onExplain)} disabled={isLoading} className="w-full bg-gray-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px]">
                        {isLoading ? <LoadingSpinner/> : <><Search size={18} /><span className="ml-2">{t.explain}</span></>}
                    </button>
                </div>
                {isLoading && <p className="text-center text-sm text-gray-500 mt-2">{loadingMessage}</p>}
            </Card>
        </div>
    );
};

export default Form;

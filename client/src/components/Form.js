import React, { useState, useEffect } from 'react';
import { Wand2, Search, FileCode2 } from 'lucide-react';
import { translations } from '../constants/translations';
import { osDetails } from '../constants/osDetails';
import Card from './common/Card';
import CustomSelect from './common/CustomSelect';
import LoadingSpinner from './common/LoadingSpinner';

const Form = ({ mode, setMode, onSubmit, isLoading, loadingMessage, lang }) => {
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

    const currentModeData = {
        generate: { label: t.questionLabel, placeholder: t.questionPlaceholder, button: t.generate, loadingText: t.generating, subheader: t.generateSubheader },
        explain: { label: t.commandLabel, placeholder: t.commandPlaceholder, button: t.explain, loadingText: t.explaining, subheader: t.explainSubheader },
        script: { label: t.taskLabel, placeholder: t.taskPlaceholder, button: t.generateScript, loadingText: t.generatingScript, subheader: t.scriptSubheader },
    };

    const validateAndSubmit = () => {
        const newErrors = {};
        if (!userInput.trim()) newErrors.userInput = t.fieldRequired;
        if (!os) newErrors.os = t.fieldRequired;
        if (!osVersion) newErrors.osVersion = t.fieldRequired;
        if (!cli) newErrors.cli = t.fieldRequired;
        
        setFormErrors(newErrors);
        
        if (Object.keys(newErrors).length === 0) {
            onSubmit({ os, osVersion, cli, userInput });
        }
    };

    return (
        <div>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
                {['generate', 'explain', 'script'].map(m => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-4 py-2 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors duration-200 ${mode === m ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                        {m === 'generate' && <Wand2 size={16} />}
                        {m === 'explain' && <Search size={16} />}
                        {m === 'script' && <FileCode2 size={16} />}
                        {t[`mode${m.charAt(0).toUpperCase() + m.slice(1)}`]}
                    </button>
                ))}
            </div>

            <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-center">{t[`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`]}</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-center text-md">{currentModeData[mode].subheader}</p>
            </div>

            <Card lang={lang}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <CustomSelect label={t.os} value={os} onChange={setOs} options={Object.keys(osDetails)} placeholder={t.os} lang={lang} error={formErrors.os} />
                    <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os]?.versions || []} placeholder={t.selectVersion} lang={lang} error={formErrors.osVersion} />
                    <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os]?.clis || []} placeholder={t.selectCli} lang={lang} error={formErrors.cli} />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{currentModeData[mode].label} <span className="text-red-500">*</span></label>
                    <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={currentModeData[mode].placeholder} className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cyan-500 resize-none" />
                    {formErrors.userInput && <p className="text-red-500 text-xs mt-1">{formErrors.userInput}</p>}
                </div>
                <button onClick={validateAndSubmit} disabled={isLoading} className="mt-5 w-full bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px]">
                    {isLoading ? (
                        <>
                            <LoadingSpinner/>
                            <span className="ml-2">{loadingMessage || currentModeData[mode].loadingText}</span>
                        </>
                    ) : (
                        currentModeData[mode].button
                    )}
                </button>
            </Card>
        </div>
    );
};

export default Form;

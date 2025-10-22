import React, { useState, useEffect } from 'react';
import { Wand2, Search, FileCode2 } from 'lucide-react';
import { translations } from '../constants/translations';
import { osDetails } from '../constants/osDetails';
import Card from './common/Card';
import CustomSelect from './common/CustomSelect';
import LoadingSpinner from './common/LoadingSpinner';

const CustomInput = ({ label, value, onChange, placeholder, error }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            {label}&nbsp;<span className="text-red-500">*</span>
        </label>
        <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500"
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

const Form = ({ onSubmit, onExplain, onScript, isLoading, loadingMessage, lang }) => {
    const t = translations[lang];

    const [os, setOs] = useState('linux');
    const [osVersion, setOsVersion] = useState('');
    const [cli, setCli] = useState('');
    const [userInput, setUserInput] = useState('');
    const [formErrors, setFormErrors] = useState({});

    const [customOsName, setCustomOsName] = useState('');
    const [customOsVersion, setCustomOsVersion] = useState('');
    const [customCli, setCustomCli] = useState('');

    const [deviceType, setDeviceType] = useState('router');
    const [knowledgeLevel, setKnowledgeLevel] = useState('intermediate');

    useEffect(() => {
        if (os in osDetails && os !== 'other') {
            setOsVersion(osDetails[os].versions[0] || '');
            setCli(osDetails[os].clis[0] || '');
        } else {
            setOsVersion('');
            setCli('');
        }
    }, [os]);

    const validateAndSubmit = (handler) => {
        const newErrors = {};
        if (!userInput.trim()) newErrors.userInput = t.fieldRequired;

        let finalOs = os;
        let finalOsVersion = osVersion;
        let finalCli = cli;

        if (os === 'other') {
            if (!customOsName.trim()) newErrors.customOsName = t.fieldRequired;
            if (!customOsVersion.trim()) newErrors.customOsVersion = t.fieldRequired;
            if (!customCli.trim()) newErrors.customCli = t.fieldRequired;
            finalOs = customOsName.trim();
            finalOsVersion = customOsVersion.trim();
            finalCli = customCli.trim();
        } else {
            if (!os) newErrors.os = t.fieldRequired;
            if (!osVersion && osDetails[os]?.versions.length > 0) newErrors.osVersion = t.fieldRequired;
            if (!cli) newErrors.cli = t.fieldRequired;
        }

        if (os === 'cisco' && !deviceType) {
            newErrors.deviceType = t.fieldRequired;
        }

        setFormErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            const formData = {
                os: finalOs,
                osVersion: finalOsVersion,
                cli: finalCli,
                userInput,
                knowledgeLevel,
                deviceType: os === 'cisco' ? deviceType : undefined,
            };
            handler(formData);
        }
    };

    const osOptions = [...Object.keys(osDetails).filter(k => k !== 'other'), 'other'];
    const deviceOptions = ['router', 'switch', 'firewall'];
    const knowledgeLevelOptions = ['beginner', 'intermediate', 'expert'];

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">CCG - Cando Command Generator</h2>
            <p className="text-gray-600 mb-8 text-center text-md">{t.generateSubheader}</p>

            <Card lang={lang}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <CustomSelect
                        label={t.os}
                        value={os}
                        onChange={setOs}
                        options={osOptions.map(opt => ({
                            value: opt,
                            label: t[`os_${opt}`] || (opt.charAt(0).toUpperCase() + opt.slice(1))
                        }))}
                        placeholder={t.os}
                        lang={lang}
                        error={formErrors.os}
                        isObjectOptions={true}
                    />

                    {os !== 'other' ? (
                        <>
                            <CustomSelect label={t.osVersion} value={osVersion} onChange={setOsVersion} options={osDetails[os]?.versions || []} placeholder={t.selectVersion} lang={lang} error={formErrors.osVersion} />
                            <CustomSelect label={t.cli} value={cli} onChange={setCli} options={osDetails[os]?.clis || []} placeholder={t.selectCli} lang={lang} error={formErrors.cli} />
                        </>
                    ) : (
                        <>
                            <CustomInput label={t.customOsLabel} value={customOsName} onChange={setCustomOsName} placeholder={t.customOsPlaceholder} error={formErrors.customOsName} />
                            <CustomInput label={t.customOsVersionLabel} value={customOsVersion} onChange={setCustomOsVersion} placeholder={t.customOsVersionPlaceholder} error={formErrors.customOsVersion} />
                            <CustomInput label={t.cli} value={customCli} onChange={setCustomCli} placeholder={t.customCliPlaceholder || 'e.g., sh'} error={formErrors.customCli} />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <CustomSelect
                        label={t.knowledgeLevel}
                        value={knowledgeLevel}
                        onChange={setKnowledgeLevel}
                        options={knowledgeLevelOptions.map(opt => ({ value: opt, label: t[`level_${opt}`] }))}
                        placeholder={t.selectLevel}
                        lang={lang}
                        isObjectOptions={true}
                    />
                    {os === 'cisco' && (
                        <CustomSelect
                            label={t.deviceType}
                            value={deviceType}
                            onChange={setDeviceType}
                            options={deviceOptions.map(opt => ({ value: opt, label: t[`device_${opt}`] }))}
                            placeholder={t.selectDevice}
                            lang={lang}
                            isObjectOptions={true}
                            error={formErrors.deviceType}
                        />
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t.questionLabel}</label>
                    <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder={t.questionPlaceholder} className="w-full h-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-amber-500 resize-none" />
                    {formErrors.userInput && <p className="text-red-500 text-xs mt-1">{formErrors.userInput}</p>}
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button onClick={() => validateAndSubmit(onSubmit)} disabled={isLoading} className="w-full bg-amber-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-amber-700 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors">
                        {isLoading ? <LoadingSpinner /> : <><Wand2 size={18} /><span className="ml-2">{t.generate}</span></>}
                    </button>
                    <button onClick={() => validateAndSubmit(onScript)} disabled={isLoading} className="w-full bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-emerald-800 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors">
                        {isLoading ? <LoadingSpinner /> : <><FileCode2 size={18} /><span className="ml-2">{t.generateScript}</span></>}
                    </button>
                    <button onClick={() => validateAndSubmit(onExplain)} disabled={isLoading} className="w-full bg-sky-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:bg-sky-800 disabled:bg-gray-400 flex items-center justify-center min-h-[48px] transition-colors">
                        {isLoading ? <LoadingSpinner /> : <><Search size={18} /><span className="ml-2">{t.explain}</span></>}
                    </button>
                </div>
                {isLoading && <p className="text-center text-sm text-gray-500 mt-2">{loadingMessage}</p>}
            </Card>
        </div>
    );
};

export default Form;

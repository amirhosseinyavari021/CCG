import React from 'react';
import { ChevronDown } from 'lucide-react';

const CustomSelect = ({ label, value, onChange, options, placeholder, lang, error, isObjectOptions = false }) => (
    <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            {label}&nbsp;<span className="text-red-500">*</span>
        </label>
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-amber-500"
            >
                <option value="" disabled>{placeholder}</option>
                {isObjectOptions
                    ? options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)
                    : options.map(opt => <option key={opt} value={opt}>{opt}</option>)
                }
            </select>
            <ChevronDown className={`w-5 h-5 absolute text-gray-500 dark:text-gray-400 pointer-events-none ${lang === 'fa' ? 'left-2' : 'right-2'} top-1/2 -translate-y-1/2`} />
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
);

export default CustomSelect;

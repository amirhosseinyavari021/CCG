// client/src/components/common/CustomSelect.js
import React from 'react';
// حذف: import { translations } from '../constants/translations'; // این وجود نداره
// استفاده از t: import { t } from '../constants/translations'; // اگر نیاز بود، ولی این کامپوننت معمولاً نیاز نداره

const CustomSelect = ({ label, value, onChange, options, placeholder, error }) => {
    return (
        <div className="mb-4">
            {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
            <select
                value={value}
                onChange={onChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default CustomSelect;
// client/src/components/common/CustomInput.js
import React from 'react';

const CustomInput = ({ label, value, onChange, placeholder, error, isTextarea = false }) => {
  const inputElement = isTextarea ? (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
      rows={4} // یا هر تعدادی که مناسب باشه
    />
  ) : (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 ${
        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
      } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
    />
  );

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
      {inputElement}
      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
};

export default CustomInput;
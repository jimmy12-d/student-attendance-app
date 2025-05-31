// app/_components/CustomMultiSelectDropdown.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Icon from "../../_components/Icon"; // Assuming being imported from a file two levels deep from _components
import { mdiChevronDown } from '@mdi/js'; // Using a chevron for the dropdown arrow

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiSelectOption[];
  selectedValues: string[]; // Array of selected value strings
  onChange: (newSelectedValues: string[]) => void; // Callback with the new array of selected values
  placeholder?: string;
  buttonClassName?: string; // Custom classes for the button
  // For integration with your FormField if it provides styling via fieldData
  fieldData?: { className?: string };
  id?: string; // For label htmlFor
}

const CustomMultiSelectDropdown: React.FC<Props> = ({
  options,
  selectedValues,
  onChange,
  placeholder = "Select options...",
  buttonClassName,
  fieldData,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleOption = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newSelectedValues);
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]); // Deselect all
    } else {
      onChange(options.map(opt => opt.value)); // Select all
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displaySelectedLabels = () => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === options.length) return "All Selected";
    if (selectedValues.length <= 2) { // Show names if 1 or 2 selected
      return selectedValues
        .map(val => options.find(opt => opt.value === val)?.label)
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedValues.length} items selected`;
  };

  // Base styling similar to your AddStudentForm button, can be customized
  const defaultButtonClasses = "text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500";
  // Use fieldData.className if provided by FormField, otherwise use default/custom
  const finalButtonClasses = fieldData?.className 
    ? `${fieldData.className.replace('px-3 py-2', 'px-3 py-2.5')} text-left inline-flex items-center justify-between ${buttonClassName || ''}` // Adjust padding from FormField
    : `${defaultButtonClasses} ${buttonClassName || ''}`;


  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={finalButtonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displaySelectedLabels()}</span>
        <Icon path={mdiChevronDown} w="h-5 w-5" className={`ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="z-20 absolute mt-1 w-full bg-white rounded-lg shadow-xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
          <ul className="py-1" role="listbox">
            {/* Select All / Deselect All Option */}
            <li className="px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
              <label className="flex items-center space-x-3 text-sm text-gray-900 dark:text-gray-100">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-500 dark:focus:ring-indigo-600"
                  checked={selectedValues.length === options.length && options.length > 0}
                  onChange={handleSelectAll}
                  disabled={options.length === 0}
                />
                <span>{selectedValues.length === options.length && options.length > 0 ? 'Deselect All' : 'Select All'}</span>
              </label>
            </li>
            {options.map(option => (
              <li key={option.value} className="px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                <label className="flex items-center space-x-3 text-sm text-gray-900 dark:text-gray-100">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-500 dark:focus:ring-indigo-600"
                    value={option.value}
                    checked={selectedValues.includes(option.value)}
                    onChange={() => handleToggleOption(option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              </li>
            ))}
            {options.length === 0 && (
                <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No options available</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomMultiSelectDropdown;
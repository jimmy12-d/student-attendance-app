// app/_components/CustomMultiSelectDropdown.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Icon from '../../_components/Icon'; // Assuming Icon component is in the same directory
import { mdiChevronDown } from '@mdi/js';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface Props {
  options: MultiSelectOption[]; // The original, full list of options
  selectedValues: string[];
  onChange: (newSelectedValues: string[]) => void;
  placeholder?: string;
  buttonClassName?: string;
  fieldData?: { className?: string };
  id?: string;
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
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Memoize filtered options based on searchTerm
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) {
      return options; // If search is empty, show all original options
    }
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const handleToggleOption = (value: string) => {
    const newSelectedValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onChange(newSelectedValues);
  };

  // MODIFIED: Select All / Deselect All now operates on filteredOptions
  const handleSelectAllToggleFiltered = () => {
    const filteredValues = filteredOptions.map(opt => opt.value);
    const allFilteredSelected = filteredValues.length > 0 && filteredValues.every(val => selectedValues.includes(val));

    let newSelectedValues = [...selectedValues];

    if (allFilteredSelected) {
      // Deselect all currently filtered options
      newSelectedValues = newSelectedValues.filter(val => !filteredValues.includes(val));
    } else {
      // Select all currently filtered options that aren't already selected
      filteredValues.forEach(val => {
        if (!newSelectedValues.includes(val)) {
          newSelectedValues.push(val);
        }
      });
    }
    onChange(newSelectedValues);
  };


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      setTimeout(() => searchInputRef.current?.focus(), 0);
    } else {
      setSearchTerm(""); // Clear search term when dropdown closes
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const displaySelectedLabels = () => {
    if (selectedValues.length === 0) return placeholder;
    // If all original options are selected, show "All Selected"
    if (options.length > 0 && selectedValues.length === options.length) return `All Selected (${options.length})`;
    if (selectedValues.length <= 2) {
      return selectedValues
        .map(val => options.find(opt => opt.value === val)?.label) // Find label from original options
        .filter(Boolean)
        .join(', ');
    }
    return `${selectedValues.length} items selected`;
  };

  const defaultButtonClasses = "text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500";
  const finalButtonClasses = fieldData?.className
    ? `${fieldData.className.replace('px-3 py-2', 'px-3 py-2.5')} text-left inline-flex items-center justify-between ${buttonClassName || ''}`
    : `${defaultButtonClasses} ${buttonClassName || ''}`;

  // Determine if all *currently filtered* options are selected
  const areAllFilteredSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selectedValues.includes(opt.value));

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
        <div className="z-20 absolute mt-1 w-full bg-white rounded-lg shadow-xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-200 dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-700">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search options..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-500 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <ul className="flex-grow overflow-y-auto py-1" role="listbox">
            {/* Select All / Deselect All Option - now operates on FILTERED options */}
            {filteredOptions.length > 0 && ( // Show only if there are filtered options to select/deselect
                <li className="px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                <label className="flex items-center space-x-3 text-sm text-gray-900 dark:text-gray-100">
                    <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:border-gray-500 dark:focus:ring-indigo-600"
                    checked={areAllFilteredSelected} // <-- Use new state
                    onChange={handleSelectAllToggleFiltered} // <-- Use new handler
                    />
                    {/* Label reflects action on filtered items */}
                    <span>{areAllFilteredSelected ? 'Deselect All Shown' : 'Select All Shown'} ({filteredOptions.length})</span>
                </label>
                </li>
            )}

            {filteredOptions.map(option => (
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
            {/* Message for when search yields no results but there are original options */}
            {options.length > 0 && filteredOptions.length === 0 && searchTerm && (
                <li className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No options match "{searchTerm}"</li>
            )}
            {/* Message for when there are no options at all */}
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
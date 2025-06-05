// /Users/jimmy/datta-able-free-react-admin-template/admin-one-react-tailwind/app/dashboard/students/AddStudentForm.jsx

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../../firebase-config';
import { collection, addDoc, doc, setDoc, serverTimestamp, query, orderBy, getDocs} from "firebase/firestore";

/**
 * @typedef {object} Student
 * @property {string} id
 * @property {string} fullName
 * @property {string} [phone]
 * @property {string} class
 * @property {string} shift
 */

/**
 * @typedef {object} AddStudentFormProps
 * @property {(id: string) => void} onStudentAdded
 * @property {() => void} onCancel
 * @property {Student | null | undefined} [initialData]
 */

/**
 * @param {AddStudentFormProps} props
 */
function AddStudentForm({ onStudentAdded, onCancel, initialData }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [studentClass, setStudentClass] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false); // For the new class dropdown
  const classDropdownRef = useRef(null); // For the new class dropdown
  const [classOptions, setClassOptions] = useState([]); // To store fetched classes { value: string, label: string }[]
  const [loadingClasses, setLoadingClasses] = useState(true); // Loading state for classes

  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
  const shiftDropdownRef = useRef(null); // To detect clicks outside

  const shiftOptions = [
    { value: "Morning", label: "Morning" },
    { value: "Afternoon", label: "Afternoon" },
    { value: "Evening", label: "Evening" },
  ];

  useEffect(() => {
    if (initialData && initialData.id) {
      setIsEditMode(true);
      setFullName(initialData.fullName || '');
      setPhone(initialData.phone || '');
      setStudentClass(initialData.class || '');
      setShift(initialData.shift || '');
    } else {
      setIsEditMode(false);
      setFullName('');
      setPhone('');
      setStudentClass('');
      setShift('');
    }
  }, [initialData]);

  useEffect(() => {
  const fetchClasses = async () => {
        console.log("Attempting to fetch classes..."); // New log
    setLoadingClasses(true);
    try {
      const classesCollectionRef = collection(db, "classes");
      const q = query(classesCollectionRef, orderBy("name")); // Order by name
      const querySnapshot = await getDocs(q);
      const fetchedClasses = querySnapshot.docs.map(doc => ({
        value: doc.data().name, // Assuming 'name' field stores class name
        label: doc.data().name,
      }));
      setClassOptions(fetchedClasses);
    } catch (error) {
      console.error("Error fetching classes: ", error);
      setError("Failed to load class list. Please try adding manually."); // Update error state
      setClassOptions([]); // Set to empty array on error
    }
    setLoadingClasses(false);
  };

  fetchClasses();
}, []);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName || !studentClass || !shift) {
      setError("Full Name, Class, Phone, and Shift are required.");
      setLoading(false);
      return;
    }

    try {
      const studentData = {
        fullName,
        phone,
        class: studentClass,
        shift,
      };

      if (isEditMode && initialData?.id) {
        const studentRef = doc(db, "students", initialData.id);
        await setDoc(studentRef, { ...studentData, updatedAt: serverTimestamp() }, { merge: true });
        if (onStudentAdded) {
          onStudentAdded(initialData.id);
        }
      } else {
        const docRef = await addDoc(collection(db, "students"), { ...studentData, createdAt: serverTimestamp() });
        if (onStudentAdded) {
          onStudentAdded(docRef.id);
        }
      }
    } catch (err) {
      console.error("Error saving student: ", err);
      setError("Failed to save student. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleClickOutsideShift = (event) => {
      if (shiftDropdownRef.current && !shiftDropdownRef.current.contains(event.target)) {
        setIsShiftDropdownOpen(false);
      }
    };
    if (isShiftDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideShift);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideShift);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideShift); // Cleanup
  }, [isShiftDropdownOpen]);

  // if (isShiftDropdownOpen) {
  //   document.addEventListener("mousedown", handleClickOutside);
  // } else {
  //   document.removeEventListener("mousedown", handleClickOutside);
  // }

    useEffect(() => {
    const handleClickOutsideClass = (event) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setIsClassDropdownOpen(false);
      }
    };
    if (isClassDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideClass);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideClass);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideClass); // Cleanup
  }, [isClassDropdownOpen]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Full Name and Phone */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-white-700">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black" // Added text-black
            required
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-white-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black" // Added text-black
            required
          />
        </div>
      </div>

      {/* Row 2: Class and Shift */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        <div>
          <label htmlFor="studentClass" className="block text-sm font-medium text-white-700">
            Class
          </label>
  <div className="mt-1 relative" ref={classDropdownRef}>
    <button
      type="button"
      id="class-button"
      onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
      disabled={loadingClasses} // Disable while classes are loading
      className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
      aria-haspopup="true"
      aria-expanded={isClassDropdownOpen}
    >
      <span className="truncate">
        {loadingClasses && "Loading classes..."}
        {!loadingClasses && (studentClass || "Select Class")}
        {!loadingClasses && classOptions.length === 0 && !studentClass && "No classes available"}
      </span>
      <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
      </svg>
    </button>

    {isClassDropdownOpen && !loadingClasses && classOptions.length > 0 && (
      <div
        className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto"
      >
        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="class-button">
          {/* Option to clear selection or select placeholder */}
          <li>
            <button
              type="button"
              onClick={() => {
                setStudentClass('');
                setIsClassDropdownOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!studentClass ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
              role="menuitem"
            >
              Select Class
            </button>
          </li>
          {classOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  setStudentClass(option.value);
                  setIsClassDropdownOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${studentClass === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                role="menuitem"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
        </div>
{/* Inside the return statement of AddStudentForm, within the second grid row */}
<div>
  <label htmlFor="shift-button" className="block text-sm font-medium text-gray-700">
    Shift
  </label>
  <div className="mt-1 relative" ref={shiftDropdownRef}> {/* Assign the ref here */}
    <button
      type="button" // Crucial: prevent form submission
      id="shift-button"
      data-dropdown-toggle="shift-dropdown-options" // Optional: if you use Flowbite's JS
      onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
      className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500"
      aria-haspopup="true"
      aria-expanded={isShiftDropdownOpen}
    >
      <span>{shift || "Select Shift"}</span>
      <svg className="w-2.5 h-2.5 ms-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
      </svg>
    </button>

    {/* Dropdown menu */}
    {isShiftDropdownOpen && (
      <div
        id="shift-dropdown-options"
        className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
        // Style to ensure it appears above other elements if necessary
      >
        <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="shift-button">
          {/* Option for "Select Shift" if you want to be able to clear selection or show it initially */}
          <li>
            <button
              type="button"
              onClick={() => {
                setShift(''); // Set to empty or a specific default
                setIsShiftDropdownOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!shift ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
              role="menuitem"
            >
              Select Shift
            </button>
          </li>
          {shiftOptions.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                onClick={() => {
                  setShift(option.value);
                  setIsShiftDropdownOpen(false);
                }}
                className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${shift === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                role="menuitem"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
        </div>
      )}
    </div>
  {/* You don't strictly need a hidden input if your form submission relies on the `shift` state directly */}
  {/* <input type="hidden" name="shift" value={shift} /> */}
  </div>
  </div>

      {error && <p className="text-red-500 text-sm mb-3 -mt-2">{error}</p>}

      <div className="flex justify-end space-x-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Student' : 'Add Student')}
        </button>
      </div>
    </form>
  );
}

export default AddStudentForm;
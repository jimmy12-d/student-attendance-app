// /Users/jimmy/datta-able-free-react-admin-template/admin-one-react-tailwind/app/dashboard/students/AddStudentForm.jsx

import React, { useState, useEffect, useRef, useMemo} from 'react';
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

  const [allClassData, setAllClassData] = useState(null); // Or useState<AllClassConfigs | null>(null); if using TypeScript interface here
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
  const shiftDropdownRef = useRef(null); // To detect clicks outside

  const [dynamicShiftOptions, setDynamicShiftOptions] = useState([]); // { value: string, label: string }[]

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
      setLoadingClasses(true);
      setError(null);
      try {
        const classesCollectionRef = collection(db, "classes");
        const q = query(classesCollectionRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const fetchedClassConfigs = {}; // To store all class data
        const dropdownOpts = [];      // For the class dropdown

        if (querySnapshot.empty) {
          console.warn("No documents found in 'classes' collection.");
        } else {
          querySnapshot.forEach(doc => {
            const data = doc.data();
            // Assuming doc.id is the class name like "10A" and data includes 'name' and 'shifts'
            fetchedClassConfigs[doc.id] = { name: data.name, shifts: data.shifts || {} };
            dropdownOpts.push({
              value: doc.id, // Use doc.id (class name) as value
              label: data.name || doc.id, // Use data.name or doc.id as label
            });
          });
        }
        setAllClassData(fetchedClassConfigs);
        setClassOptions(dropdownOpts); // For the class selection dropdown
        console.log("All class data loaded:", fetchedClassConfigs);
        console.log("Class dropdown options:", dropdownOpts);
      } catch (error) {
        console.error("Error fetching classes: ", error);
        setError("Failed to load class list.");
        setAllClassData({}); // Ensure it's an empty object on error
        setClassOptions([]);
      }
      setLoadingClasses(false);
    };

    fetchClasses();
  }, []);

 useEffect(() => {
  if (!studentClass || !allClassData || loadingClasses) { // If no class, or configs not ready, or still loading
    setDynamicShiftOptions([]);
    // Only reset shift if studentClass is explicitly cleared, not just on initial loading phase
    if (!studentClass && !loadingClasses) { // Avoid resetting shift if configs are just loading
        setShift('');
    }
    return;
  }

  const classData = allClassData[studentClass];
    if (classData && classData.shifts) {
      const shiftKeys = Object.keys(classData.shifts);
      const newShiftOptions = shiftKeys.map(shiftKey => ({
        value: shiftKey,
        label: shiftKey,
      }));
      setDynamicShiftOptions(newShiftOptions);

      // Determine the target shift
      let targetShift = ''; // Default to empty

      if (isEditMode && initialData && initialData.class === studentClass) {
        // We are in edit mode, and the current studentClass is the one from initialData.
        // Prioritize initialData.shift if it's valid for this class.
        if (shiftKeys.includes(initialData.shift)) {
          targetShift = initialData.shift;
        } else if (shiftKeys.length === 1) {
          // If initialData.shift is not valid (e.g., data inconsistency) but there's only one option, use it.
          targetShift = shiftKeys[0];
        }
        // If initialData.shift is not valid and there are multiple options, targetShift remains '' (user must select)
      } else {
        // This is for 'add' mode or when class has been changed by the user in 'edit' mode.
        if (shiftKeys.length === 1) {
          targetShift = shiftKeys[0]; // Auto-select if only one option
        } else if (shiftKeys.includes(shift)) {
          // If current shift state is valid for the newly selected class, keep it.
          targetShift = shift;
        }
        // Otherwise, targetShift remains '', prompting user selection.
      }
      
      // Only update shift state if it's different, to avoid unnecessary re-renders/loops
      if (shift !== targetShift) {
        setShift(targetShift);
      }

    } else {
      // Selected class has no shifts defined in allClassData
      setDynamicShiftOptions([]);
      setShift('');
    }
  }, [studentClass, allClassData]);

  const filteredClassOptions = useMemo(() => {
    if (!classSearchTerm.trim()) {
      return classOptions; // If search term is empty, show all original class options
    }
    return classOptions.filter(option =>
      option.label.toLowerCase().includes(classSearchTerm.toLowerCase())
    );
  }, [classOptions, classSearchTerm]); 

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
        {/* CLASS DROPDOWN */}
        <div>
          <label htmlFor="class-button" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Class
          </label>
          <div className="mt-1 relative" ref={classDropdownRef}>
            <button
              type="button"
              id="class-button"
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              disabled={loadingClasses}
              className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-haspopup="true"
              aria-expanded={isClassDropdownOpen}
              required // Add required if class is mandatory
            >
              <span className="truncate">
                {loadingClasses ? "Loading classes..." : (studentClass || "Select Class")}
                {!loadingClasses && classOptions.length === 0 && !studentClass && "No classes available"}
              </span>
              <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>

            {isClassDropdownOpen && !loadingClasses && ( // Keep !loadingClasses guard
              <div
                className="z-20 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 flex flex-col" // Added flex flex-col for structure
              >
                {/* VVVV ADD SEARCH INPUT HERE VVVV */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Search class..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    autoFocus // Optional: auto-focus when dropdown opens
                  />
                </div>
                {/* ^^^^ END OF SEARCH INPUT ^^^^ */}

                <ul className="flex-grow overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="class-button">
                  {/* Only show "Select Class" option if no search term or if it matches */}
                  {(!classSearchTerm || "Select Class".toLowerCase().includes(classSearchTerm.toLowerCase())) && (
                    <li>
                      <button type="button" onClick={() => { setStudentClass(''); setIsClassDropdownOpen(false); setClassSearchTerm(''); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!studentClass ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
                        role="menuitem">
                        Select Class
                      </button>
                    </li>
                  )}

                  {/* VVVV Use filteredClassOptions for mapping VVVV */}
                  {filteredClassOptions.length > 0 ? (
                    filteredClassOptions.map((option) => (
                      <li key={option.value}>
                        <button type="button" onClick={() => { setStudentClass(option.value); setIsClassDropdownOpen(false); setClassSearchTerm(''); /* Clear search on selection */ }}
                          className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${studentClass === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                          role="menuitem">
                          {option.label}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-gray-500 dark:text-gray-400">No matching classes found.</li>
                  )}
                  {/* ^^^^ Use filteredClassOptions for mapping ^^^^ */}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* SHIFT DROPDOWN (NOW DYNAMIC) */}
        <div>
          <label htmlFor="shift-button" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Shift
          </label>
          <div className="mt-1 relative" ref={shiftDropdownRef}>
            <button
              type="button"
              id="shift-button"
              onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
              // Disable if no class selected, or if loading classes (which implies no class data yet), or if no shift options
              disabled={!studentClass || loadingClasses || dynamicShiftOptions.length === 0}
              className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-haspopup="true"
              aria-expanded={isShiftDropdownOpen}
              required // Add required if shift is mandatory
            >
              <span className="truncate">
                {loadingClasses && !studentClass && "Select class first"}
                {!loadingClasses && !studentClass && "Select class first"}
                {!loadingClasses && studentClass && dynamicShiftOptions.length === 0 && "No shifts for class"}
                {!loadingClasses && studentClass && dynamicShiftOptions.length > 0 && (shift || "Select Shift")}

              </span>
              <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>

            {isShiftDropdownOpen && !loadingClasses && dynamicShiftOptions.length > 0 && (
              <div className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="shift-button">
                  <li>
                    <button type="button" onClick={() => { setShift(''); setIsShiftDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!shift ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
                      role="menuitem">
                      Select Shift
                    </button>
                  </li>
                  {dynamicShiftOptions.map((option) => (
                    <li key={option.value}>
                      <button type="button" onClick={() => { setShift(option.value); setIsShiftDropdownOpen(false); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${shift === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                        role="menuitem">
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface DarkModeState {
  isEnabled: boolean;
}

// Place this function at the top
const getInitialDarkMode = (): boolean => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === '1';
  }
  return true; // default to dark
};

// Use the function here
const initialState: DarkModeState = {
  isEnabled: true,
};

export const styleSlice = createSlice({
  name: "darkMode",
  initialState,
  reducers: {
    setDarkMode: (state, action: PayloadAction<boolean | null>) => {
      state.isEnabled =
        action.payload !== null ? action.payload : !state.isEnabled;

      if (typeof document !== "undefined") {
        document.body.classList[state.isEnabled ? "add" : "remove"](
          "dark-scrollbars",
        );

        document.documentElement.classList[state.isEnabled ? "add" : "remove"](
          "dark",
          "dark-scrollbars-compat",
        );
      }

      // You can persist dark mode setting
      // if (typeof localStorage !== 'undefined') {
      //   localStorage.setItem('darkMode', state.isEnabled ? '1' : '0')
      // }
    },
  },
});

// Action creators are generated for each case reducer function
export const { setDarkMode } = styleSlice.actions;

export default styleSlice.reducer;

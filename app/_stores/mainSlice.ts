// app/_stores/mainSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define the User type to allow for null values, as Firebase User properties can be null
export interface User {
  name: string | null;
  email: string | null;
  avatar: string | null;
  uid?: string; // Optional: Store Firebase UID if needed
}

export interface MainState {
  userName: string | null;
  userEmail: string | null;
  userAvatar: string | null;
  userUid?: string | null; // Optional: For Firebase UID
  isFieldFocusRegistered: boolean;
  // You might add an isAuthenticated flag here, updated by onAuthStateChanged,
  // but usually checking userName or userUid is sufficient.
}

const initialState: MainState = {
  /* User */
  userName: null, // Default to null, indicating no user logged in
  userEmail: null,
  userAvatar: null,
  userUid: null,

  /* Field focus with ctrl+k (to register only once) */
  isFieldFocusRegistered: false,
};

export const mainSlice = createSlice({
  name: 'main',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => { // Allow setting user to null on logout
      if (action.payload) {
        state.userName = action.payload.name;
        state.userEmail = action.payload.email;
        state.userAvatar = action.payload.avatar;
        state.userUid = action.payload.uid; // Store UID if provided
      } else {
        // Reset user state on logout
        state.userName = null;
        state.userEmail = null;
        state.userAvatar = null;
        state.userUid = null;
      }
    },
    /* Field focus with ctrl+k (to register only once) */
    setFieldFocusRegistered: (state) => {
      state.isFieldFocusRegistered = true;
    },
  },
});

export const { setUser, setFieldFocusRegistered } = mainSlice.actions;

export default mainSlice.reducer;
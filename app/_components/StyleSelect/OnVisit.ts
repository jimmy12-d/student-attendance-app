"use client";

import { useEffect } from "react";
import { useAppSelector } from "../../_stores/hooks";

export function OnVisit() {
  const darkMode = useAppSelector((state) => state.darkMode.isEnabled);

  useEffect(() => {
    // if (darkMode) {
    //   dispatch(setDarkMode(false));
    // }
  }, []);

  return null;
}

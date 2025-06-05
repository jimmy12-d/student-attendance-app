"use client";

import React, { useEffect, useState } from "react";
import { mdiMinus, mdiPlus } from "@mdi/js"; // Removed mdiChevronRight as it wasn't used
import Icon from "../../../_components/Icon";
import Link from "next/link";
import { getButtonColor } from "../../../_lib/colors"; // Assuming this function correctly returns Tailwind classes
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { usePathname } from "next/navigation";

import { signOut } from "firebase/auth";
import { auth } from "../../../../firebase-config"; // Adjust path to your firebase-config.js

type Props = {
  item: MenuAsideItem;
  onRouteChange?: () => void; // Made onRouteChange optional
  isDropdownList?: boolean;
};

const AsideMenuItem = ({ item, isDropdownList = false, onRouteChange }: Props) => {
  const [isLinkActive, setIsLinkActive] = useState(false);
  const [isDropdownActive, setIsDropdownActive] = useState(false);

  // Assuming asideMenuItemActiveStyle is for active links, not directly for logout button styling
  const activeClassAddon =
    !item.color && isLinkActive ? "aside-menu-item-active font-bold" : "";

  const pathname = usePathname();

  useEffect(() => {
    // Only check for active link if it's a navigation item (has href)
    if (item.href) {
      // A more robust active link check, especially for nested routes:
      const linkPathname = item.href.split("?")[0];
      if (linkPathname === "/dashboard") { // Handle exact match for dashboard to avoid matching all sub-routes
        setIsLinkActive(pathname === linkPathname);
      } else {
        setIsLinkActive(pathname.startsWith(linkPathname) && linkPathname !== "/");
      }
    } else {
      setIsLinkActive(false);
    }
  }, [item.href, pathname]);

  // --- NEW LOGOUT HANDLER ---
  const handleFirebaseLogout = async () => {
    console.log("AsideMenuItem: Logout action triggered.");
    try {
      await signOut(auth);
      console.log("User signed out successfully from Firebase.");
      // Redirection and Redux state clearing will be handled by
      // onAuthStateChanged in your app/dashboard/layout.tsx
      if (onRouteChange) { // Call onRouteChange if provided, e.g., to close mobile menu
        onRouteChange();
      }
    } catch (error) {
      console.error("Firebase Logout Error:", error);
    }
  };
  // --- END OF NEW LOGOUT HANDLER ---

  const handleMenuClick = () => {
    if (item.isLogout) { // <--- CHECK FOR LOGOUT ITEM
      handleFirebaseLogout(); // <--- CALL FIREBASE LOGOUT
      return; // Prevent other actions for logout item
    }

    if (item.menu) {
      setIsDropdownActive(!isDropdownActive);
    }

    // Call onRouteChange for actual navigation links or if a generic onClick is not present
    if (item.href && onRouteChange) {
      onRouteChange();
    }

    // If a custom onClick is provided on the menu item itself
    if (item.onClick) {
      item.onClick(item);
    }
  };


  const asideMenuItemInnerContents = (
    <>
      {item.icon && (
        <Icon
          path={item.icon}
          className={`flex-none ${activeClassAddon}`} // activeClassAddon might need adjustment for non-link items
          w="w-16" // Original w-16
          size="18"
        />
      )}
      <span
        className={`grow text-ellipsis line-clamp-1 ${
          item.menu ? "" : "pr-12" // Original had pr-12
        } ${activeClassAddon}`}
      >
        {item.label}
      </span>
      {item.menu && (
        <Icon
          path={isDropdownActive ? mdiMinus : mdiPlus}
          className={`flex-none ${activeClassAddon}`}
          w="w-12" // Original w-12
        />
      )}
    </>
  );

  // Apply specific styling for logout button if item.color is set (e.g., to "purple" or "warning")
  const componentClass = [
    "flex cursor-pointer items-center", // Added items-center for better icon-text alignment
    isDropdownList ? "py-3 px-6 text-sm" : "py-3",
    item.color && item.isLogout // Apply color only if it's a logout item with a color
      ? getButtonColor(item.color, false, true) // false for outline, true for text color inversion on dark
      : `aside-menu-item dark:text-slate-300 dark:hover:text-white`,
    activeClassAddon, // This will apply active styles if isLinkActive is true
  ]
    .join(" ")
    .trim();

  return (
    <li>
      {/* Render as a Link if href is present AND it's NOT a logout item AND not a dropdown parent */}
      {item.href && !item.menu && !item.isLogout && (
        <Link
          href={item.href}
          target={item.target}
          className={componentClass}
          onClick={handleMenuClick} // handleMenuClick now also calls onRouteChange
        >
          {asideMenuItemInnerContents}
        </Link>
      )}
      {/* Render as a div/button if it's a dropdown trigger OR a logout button OR a plain clickable item */}
      {(!item.href || item.menu || item.isLogout) && (
        <div
          className={componentClass}
          onClick={handleMenuClick} // Centralized click handler
          role="button" // Add role for accessibility
          tabIndex={0} // Make it focusable
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMenuClick();}} // Keyboard accessibility
        >
          {asideMenuItemInnerContents}
        </div>
      )}

      {/* Dropdown menu list */}
      {item.menu && (
        <AsideMenuList
          menu={item.menu}
          className={`aside-menu-dropdown ${
            isDropdownActive ? "block dark:bg-slate-800/50" : "hidden"
          }`}
          onRouteChange={onRouteChange ?? (() => {})}
          isDropdownList
        />
      )}
    </li>
  );
};

export default AsideMenuItem;
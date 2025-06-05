"use client"; // Assuming it might use client features or is used by client components

import React, { ReactNode } from "react";
import Icon from "../Icon";

type Props = {
  label?: string;
  icon?: string | null;
  className?: string;
  small?: boolean;
  onClick?: () => void; // For making the whole pill clickable (keep if needed)
  onIconClick?: () => void; // <-- NEW PROP for icon click
  labelClassName?: string;
  children?: ReactNode;
};

export default function PillTagPlain({
  label = "",
  className = "",
  icon = null,
  small = false,
  onClick,
  onIconClick, // <-- DESTRUCTURE new prop
  labelClassName = "",
  children,
}: Props) {
  const baseTextSize = small ? "text-xs" : "text-sm";

  // If onIconClick is provided, make the icon part a button
  const iconElement = icon ? (
    onIconClick ? (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering a potential parent onClick
          onIconClick();
        }}
        className={`flex-none items-center justify-center p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none ${small && label ? "mr-1" : "mr-1.5"}`}
        aria-label="icon-action" // Add aria-label for accessibility
      >
        <Icon
          path={icon}
          w="w-4" // Keep icon size consistent
          h="h-4"
          size={small ? 14 : 20} // Adjust size slightly if needed
        />
      </button>
    ) : (
      <Icon
        path={icon}
        w="w-4"
        h="h-4"
        className={small && label ? "mr-1" : "mr-1.5"}
        size={small ? 14 : undefined}
      />
    )
  ) : null;

  return (
    <div
      className={`inline-flex items-center capitalize ${baseTextSize} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick} // Click handler for the whole pill
    >
      {iconElement} {/* Render the potentially clickable icon */}
      {label && <span className={`px-1 ${labelClassName || ''}`}>{label}</span>}
      {children}
    </div>
  );
}
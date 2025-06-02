import {
  mdiAccountCircle,
  mdiMonitor,
  mdiGithub,
  mdiLock,
  mdiAlertCircle,
  mdiSquareEditOutline,
  mdiTable,
  mdiViewList,
  mdiTelevisionGuide,
  mdiResponsive,
  mdiPalette,
  mdiClipboardListOutline,
  mdiSearchWeb,
  mdiMagnify,
  mdiAccountClockOutline
} from "@mdi/js";
import { MenuAsideItem } from "../../_interfaces";

const menuAside: MenuAsideItem[] = [
  {
    href: "/dashboard",
    icon: mdiMonitor,
    label: "Dashboard",
  },
  {
    href: "/dashboard/scan-qr",
    icon: mdiMonitor,
    label: "Scan QR",
  },
  {
    href: "/dashboard/students",
    icon: mdiAccountCircle,
    label: "Student",
  },
  {
    href: "/dashboard/record", // Path to your new page
    label: "Attendance",
    icon: mdiClipboardListOutline, // Choose an appropriate icon
  },
  {
    href: "/dashboard/check", // Path to your new page
    label: "Check",
    icon: mdiMagnify, // Choose an appropriate icon
  },
  {
    href: "/dashboard/manage-excuses", // Path to your new page
    label: "Late Permission",
    icon: mdiAccountClockOutline, // Choose an appropriate icon
  },
  {
    href: "/dashboard/tables",
    label: "Tables",
    icon: mdiTable,
  },
  {
    href: "/dashboard/forms",
    label: "Forms",
    icon: mdiSquareEditOutline,
  },
  {
    href: "/dashboard/ui",
    label: "UI",
    icon: mdiTelevisionGuide,
  },
  {
    href: "/",
    label: "Styles",
    icon: mdiPalette,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    icon: mdiAccountCircle,
  },
  {
    href: "/login",
    label: "Login",
    icon: mdiLock,
  },
  {
    href: "/error",
    label: "Error",
    icon: mdiAlertCircle,
  },
  {
    label: "Dropdown",
    icon: mdiViewList,
    menu: [
      {
        label: "Item One",
      },
      {
        label: "Item Two",
      },
    ],
  },
  {
    href: "https://github.com/justboil/admin-one-react-tailwind",
    label: "GitHub",
    icon: mdiGithub,
    target: "_blank",
  },
];

export default menuAside;

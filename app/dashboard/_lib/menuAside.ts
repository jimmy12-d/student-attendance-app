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
];

export default menuAside;

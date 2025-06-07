import { mdiThemeLightDark } from "@mdi/js";
import { MenuNavBarItem } from "../../_interfaces";

const menuNavBar: MenuNavBarItem[] = [
  {
    icon: mdiThemeLightDark,
    label: "Light/Dark",
    isDesktopNoLabel: true,
    isToggleLightDark: true,
  },
];

export default menuNavBar;

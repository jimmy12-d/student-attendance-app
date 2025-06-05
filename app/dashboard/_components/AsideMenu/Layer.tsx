import React from "react";
import { mdiLogout, mdiClose } from "@mdi/js";
import Icon from "../../../_components/Icon";
import AsideMenuItem from "./Item";
import AsideMenuList from "./List";
import { MenuAsideItem } from "../../../_interfaces";
import { useAppSelector } from "../../../_stores/hooks";
import RodwellLogo from "../../../_components/JustboilLogo";

type Props = {
  menu: MenuAsideItem[];
  className?: string;
  onAsideLgCloseClick: () => void;
  onRouteChange: () => void;
};

export default function AsideMenuLayer({
  menu,
  className = "",
  ...props
}: Props) {
  const darkMode = useAppSelector((state) => state.darkMode.isEnabled);

  const logoutItem: MenuAsideItem = {
    label: "Logout",
    icon: mdiLogout,
    isLogout: true,
  };

  const handleAsideLgCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    props.onAsideLgCloseClick();
  };

  return (
    <aside
      className={`${className} zzz lg:py-2 lg:pl-2 w-60 fixed flex z-40 top-0 h-screen transition-position overflow-hidden`}
    >
      <div
        className={`aside lg:rounded-2xl flex-1 flex flex-col overflow-hidden dark:bg-slate-900`}
      >
        <div
          className={`aside-brand flex flex-row h-14 items-center justify-between dark:bg-purple-700 py-8`}
        >
          <div className="flex items-center justify-center flex-1 gap-2 lg:justify-start lg:pl-6 xl:justify-center xl:pl-0 ">
            <RodwellLogo />
            <b className="font-black">Rodwell Learning Center</b>
          </div>
          <button
            className="hidden lg:inline-block xl:hidden p-3"
            onClick={handleAsideLgCloseClick}
          >
            <Icon path={mdiClose} />
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto overflow-x-hidden ${
            darkMode ? "aside-scrollbars-[slate]" : "aside-scrollbars"
          }`}
        >
          <AsideMenuList menu={menu} onRouteChange={props.onRouteChange} />
        </div>
        <ul>
          <AsideMenuItem item={logoutItem} onRouteChange={props.onRouteChange} />
        </ul>
      </div>
    </aside>
  );
}

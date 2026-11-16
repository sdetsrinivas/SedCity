import Link from "next/link";
import { getT } from "@/i18n/server";
import { Seal } from "./Seal";
import { TopBar } from "./TopBar";
import { MainNav } from "./MainNav";
import { UserArea } from "./UserArea";
import s from "./Header.module.css";

export async function Header({ theme }: { theme: "light" | "dark" }) {
  const { t } = await getT();
  return (
    <header className={s.header}>
      <TopBar initialTheme={theme} />
      <div className={s.masthead}>
        <div className={`container ${s.mastInner}`}>
          <Link href="/" className={s.brand} aria-label={`${t("corp.name")} – ${t("nav.home")}`}>
            <Seal />
            <span className={s.brandText}>
              <span className={s.brandName}>{t("corp.name")}</span>
              <span className={s.brandSub}>{t("corp.portal")}</span>
            </span>
          </Link>
          <UserArea />
        </div>
      </div>
      <MainNav />
    </header>
  );
}

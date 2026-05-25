import { Button } from "@/components/ui/button";
import logo from "../assets/iloader.svg";
import { client } from "@/App";
import { ExternalLinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

function Header() {
  const { t } = useTranslation();
  return (
    <header className="sticky top-0 z-50 p-4 bg-card border-b border-border flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src={logo} alt="iloader" className="w-13" />
        <div>
          <h1 className="font-extrabold text-3xl">iloader</h1>
          <span className="text-muted-foreground m-0">{t("subtitle")}</span>
        </div>
      </div>
      <Button
        variant="ghost"
        onClick={() => client.openUrl("https://github.com/nab138/iloader-next")}
      >
        {t("app.github")} <ExternalLinkIcon />
      </Button>
    </header>
  );
}

export default Header;

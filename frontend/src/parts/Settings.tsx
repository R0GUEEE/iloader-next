import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import i18n, { sortedLanguages } from "@/i18next";
import { useStore } from "@/lib/StoreContext";
import { client } from "@/App";
import { useEffect, useMemo } from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { LogLevel, useLogs } from "@/LogContext";
import { Virtuoso } from "react-virtuoso";
import {
  FileClock,
  IdCard,
  MonitorSmartphone,
  TicketCheck,
} from "lucide-react";

function Settings() {
  const [lang, setLang] = useStore<string>("lang", "en");
  const [logLevel, setLogLevel] = useStore<string>(
    "logLevel",
    String(LogLevel.Info),
  );

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  const { t } = useTranslation();

  const logLevelOptions = useMemo(
    () => [
      // { value: String(LogLevel.Trace), label: "Trace" },
      [String(LogLevel.Debug), t("settings.debug")],
      [String(LogLevel.Info), t("settings.info")],
      [String(LogLevel.Warn), t("settings.warn")],
      [String(LogLevel.Error), t("settings.error")],
    ],
    [t],
  );

  const logs = useLogs();

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      return log.level >= Number(logLevel);
    });
  }, [logs, logLevel]);

  return (
    <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))]">
      <CardHeader>
        <CardTitle className="text-xl">Utilities</CardTitle>
        <CardDescription>Tools & Settings</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <Field className="w-full">
          <FieldLabel>{t("app.language")}</FieldLabel>
          <Select value={lang} onValueChange={(value) => setLang(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sortedLanguages.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <FieldDescription>
            <Trans
              i18nKey="settings.language_hint"
              components={{
                translation: (
                  <span
                    onClick={() =>
                      client.openUrl(
                        "https://github.com/nab138/iloader-next?tab=readme-ov-file#translating",
                      )
                    }
                    role="link"
                    className="underline cursor-pointer text-primary"
                  />
                ),
              }}
            />
          </FieldDescription>
        </Field>
      </CardContent>
      <CardFooter className="flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => toast("Not implemented yet")}>
          <TicketCheck />
          {t("certificates.manage")}
        </Button>
        <Button variant="outline" onClick={() => toast("Not implemented yet")}>
          <IdCard />
          {t("app_ids.manage")}
        </Button>
        <Button variant="outline" onClick={() => toast("Not implemented yet")}>
          <MonitorSmartphone />
          {t("pairing.manage")}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FileClock />
              {t("settings.view_logs")}
            </Button>
          </DialogTrigger>
          <DialogContent className="min-w-[min(90vw,1600px)] h-[85vh] md:h-[70vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t("settings.logs")}</DialogTitle>
              <DialogDescription>
                {t("next.settings.logs_description")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col h-full grow">
              <Field className="w-full">
                <FieldLabel>{t("settings.log_level")}</FieldLabel>
                <Select
                  value={logLevel}
                  onValueChange={(value) => setLogLevel(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("settings.log_level")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {logLevelOptions.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <div className="bg-black/80 font-mono rounded-sm border border-border mt-4 grow h-full p-1">
                {filteredLogs.length > 0 ? (
                  <Virtuoso
                    className="select-text whitespace-nowrap"
                    data={filteredLogs}
                    followOutput="smooth"
                    initialTopMostItemIndex={filteredLogs.length - 1}
                    itemContent={(_index, log) => (
                      <div>
                        <span className="text-gray-600">[{log.timestamp}]</span>{" "}
                        {getHtmlForLevel(log.level)}{" "}
                        {log.target ? (
                          <span className="text-gray-400">{log.target}</span>
                        ) : (
                          ""
                        )}{" "}
                        {log.message}
                      </div>
                    )}
                  />
                ) : (
                  <pre className="select-text whitespace-nowrap">
                    <div>{t("settings.no_logs_yet")}</div>
                  </pre>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
export default Settings;

function getHtmlForLevel(level: LogLevel) {
  switch (level) {
    case LogLevel.Trace:
      return <span className="text-purple-500">[TRACE]</span>;
    case LogLevel.Debug:
      return <span className="text-blue-500">[DEBUG]</span>;
    case LogLevel.Info:
      return <span className="text-green-500">[INFO]</span>;
    case LogLevel.Warn:
      return <span className="text-orange-500">[WARN]</span>;
    case LogLevel.Error:
      return <span className="text-red-500">[ERROR]</span>;
    default:
      return <span className="text-gray-500">[UNKNOWN]</span>;
  }
}

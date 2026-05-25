import { useCallback, useEffect, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { useOperations } from "./OperationContext";
import {
  Circle,
  CircleCheck,
  CircleMinus,
  CircleX,
  LoaderCircle,
} from "lucide-react";
import { Button } from "./components/ui/button";
import {
  getErrorSuggestions,
  parseLinkToken,
  type ErrorVariant,
} from "./lib/error";
import { usePlatform } from "./PlatformContext";
import { useStore } from "./lib/StoreContext";
import { client } from "./App";
import { toast } from "sonner";

function OperationView() {
  const { t } = useTranslation();
  const { state, clearOperation } = useOperations();
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [anisetteServer] = useStore<string>(
    "anisetteServer",
    "ani.sidestore.io",
  );
  const { platform } = usePlatform();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [underage, setUnderage] = useState<boolean>(false);

  const getSuggestions = useCallback(
    (type: ErrorVariant): string[] => {
      return getErrorSuggestions(t, type, platform, anisetteServer);
    },
    [anisetteServer, t, platform],
  );

  useEffect(() => {
    if (!state) return;
    if (state.failed.length > 0) {
      const suggestionSet = new Set<string>();
      for (let f of state.failed) {
        if (f.extra_details.type === "underage") {
          setUnderage(true);
        }
        for (const suggestion of getSuggestions(f.extra_details.type)) {
          suggestionSet.add(suggestion);
        }
      }
      setSuggestions([...suggestionSet]);
    }
  }, [state, getSuggestions]);

  if (!state) return null;
  const operation = state.current;
  const opFailed = state.failed.length > 0;
  const done =
    (opFailed &&
      state.started.length == state.completed.length + state.failed.length) ||
    state.completed.length == operation.steps.length;

  return (
    <Dialog
      open
      onOpenChange={(change) => {
        if (done && !change) clearOperation();
      }}
    >
      <DialogContent
        showCloseButton={opFailed || done}
        className="min-w-[min(50vw,800px)]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {done && !opFailed && operation.successTitleKey
              ? t(operation.successTitleKey)
              : t(operation.titleKey)}
          </DialogTitle>
          <DialogDescription className="text-base">
            {done
              ? opFailed
                ? t("operation.failed")
                : t("operation.completed")
              : t("operation.please_wait")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 min-w-0">
          {operation.steps.map((step) => {
            let failed = state.failed.find((f) => f.step_id == step.id);
            let completed = state.completed.includes(step.id);
            let started = state.started.find((s) => s.step_id == step.id);
            let notStarted = !failed && !completed && !started;
            let progress = started?.progress ?? 0;

            // a little bit gross but it gets the job done.
            let lines =
              failed?.extra_details.message
                ?.split("\n")
                .filter((line) => line.includes("●")) ?? [];
            let errorShort =
              lines[lines.length - 1]?.replace(/●\s*/, "").trim() ?? "";

            return (
              <div
                key={step.id}
                className="flex flex-col gap-2 bg-muted p-2 rounded-lg border min-w-0"
              >
                <div className="flex items-center gap-2">
                  <div>
                    {failed && <CircleX className="text-destructive" />}
                    {!failed && completed && (
                      <CircleCheck className="text-green-700" />
                    )}
                    {!failed && !completed && started && (
                      <LoaderCircle className="animate-spin" />
                    )}
                    {notStarted && !opFailed && (
                      <Circle className="text-muted-foreground" />
                    )}
                    {notStarted && opFailed && (
                      <CircleMinus className="text-muted-foreground" />
                    )}
                  </div>
                  <div>{t(step.titleKey)}</div>
                </div>
                {started && !completed && !failed && !step.hideProgress && (
                  <div className="w-full bg-card rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${progress * 100}%`,
                      }}
                    />
                  </div>
                )}
                {failed && (
                  <div className="flex flex-col gap-2 w-full min-w-0">
                    <pre className="text-xs font-mono  whitespace-pre overflow-x-auto bg-background p-2 rounded-md border max-w-full">
                      {!errorShort
                        ? failed.extra_details.message?.replace(/^\n+/, "")
                        : errorShort}
                    </pre>
                    {errorShort !== "" &&
                      errorShort !== null &&
                      errorShort !== undefined && (
                        <div className="flex flex-col min-w-0">
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground text-left w-full"
                            onClick={() => setMoreDetailsOpen((prev) => !prev)}
                          >
                            {t("common.more_details")}{" "}
                            {moreDetailsOpen ? "▲" : "▼"}
                          </button>
                          {moreDetailsOpen && (
                            <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto bg-background/50 p-2 rounded-md border max-w-full">
                              {failed.extra_details.message?.replace(
                                /^\n+/,
                                "",
                              )}
                            </pre>
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {done && (
          <div className="flex gap-2 flex-col">
            {!opFailed && operation.successMessageKey && (
              <p>{t(operation.successMessageKey)}</p>
            )}
            {opFailed && (
              <div>
                {suggestions.length > 0 && (
                  <h3 className="text-lg font-semibold mb-2">
                    {t("error.suggestions_heading")}
                  </h3>
                )}
                {suggestions.length > 0 && (
                  <ul>
                    {suggestions.map((s) => (
                      <li key={s} className="text-base ml-6 list-disc">
                        {s
                          .split(/(\(\(link:[^)]+\)\)|\(\(link:[^)]+\)\))/g)
                          .map((part, index) => {
                            const parsed = parseLinkToken(part);
                            if (parsed) {
                              const { url, text } = parsed;
                              return (
                                <span
                                  key={index}
                                  onClick={() => client.openUrl(url)}
                                  role="link"
                                  className="text-primary underline cursor-pointer"
                                >
                                  {text}
                                </span>
                              );
                            }
                            return <span key={index}>{part}</span>;
                          })}
                      </li>
                    ))}
                  </ul>
                )}
                {!underage && (
                  <p className="mt-4 text-base text-muted-foreground">
                    <Trans
                      i18nKey="error.support_message"
                      components={{
                        discord: (
                          <span
                            onClick={() =>
                              client.openUrl("https://discord.gg/EA6yVgydBz")
                            }
                            role="link"
                            className="text-primary underline cursor-pointer"
                          />
                        ),
                        github: (
                          <span
                            onClick={() =>
                              client.openUrl(
                                "https://github.com/nab138/iloader-next/issues",
                              )
                            }
                            role="link"
                            className="text-primary underline cursor-pointer"
                          />
                        ),
                      }}
                    />
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        {done && (
          <DialogFooter>
            {opFailed && (
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(
                    "```\n" +
                      (state.failed[0]?.extra_details?.message.replace(
                        /^\n+/,
                        "",
                      ) ?? t("common.no_error")) +
                      "\n```",
                  );
                  toast.success(t("common.copied_success"));
                }}
              >
                {t("common.copy_to_clipboard")}
              </Button>
            )}

            <Button onClick={clearOperation}>Dismiss</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default OperationView;

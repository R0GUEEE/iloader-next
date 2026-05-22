import { useEffect, useState } from "react";
import { Button } from "./components/ui/button";
import { client } from "./main";
import Header from "./parts/Header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Field, FieldGroup, FieldSet } from "./components/ui/field";
import { Input } from "./components/ui/input";

function PlatformGate({ children }: { children: React.ReactNode }) {
  if ("__TAURI_INTERNALS__" in window) {
    return children;
  }
  let windows = navigator.userAgent.includes("Windows");
  let webusb = "usb" in navigator;

  const [warningOpen, setWarningOpen] = useState<boolean>(false);
  const [certification, setCertification] = useState<string>("");

  useEffect(() => {
    const acknowledged = localStorage.getItem("web_warning_acknowledged");
    if (!acknowledged) {
      setWarningOpen(true);
    } else {
      setWarningOpen(false);
    }
  }, []);

  windows = false;
  webusb = true;
  if (!webusb || windows) {
    return (
      <>
        <Header />
        <main>
          <div className="flex flex-col items-center justify-center gap-4 p-4 text-center mt-10 max-w-[70%] mx-auto">
            <h1 className="text-2xl font-bold">
              {windows
                ? "Windows is not supported on web"
                : "WebUSB Not Supported"}
            </h1>
            <p>
              {windows
                ? "Due to limitations in web technologies, Windows is not supported on the web version of iloader."
                : "It seems that your browser does not support WebUSB."}
            </p>
            <p>
              {windows
                ? "Please use the desktop version for Windows."
                : "Your can switch to a compatible browser such as Chrome, Edge, or Opera, or use the desktop version of iloader."}
            </p>
            <Button
              onClick={() =>
                client.openUrl(
                  "https://github.com/nab138/iloader-next/releases",
                )
              }
            >
              Download desktop app
            </Button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Dialog
        open={warningOpen}
        onOpenChange={(open) => {
          if (open) setWarningOpen(open);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setWarningOpen(false);
              localStorage.setItem("web_warning_acknowledged", "true");
            }}
          >
            <DialogHeader>
              <DialogTitle>Warning: Web Version</DialogTitle>
              <DialogDescription>
                This is the web version of iloader.
              </DialogDescription>
              <ul className="list-disc ml-6  text-left text-muted-foreground">
                <li>
                  Requests to Apple's servers are forwarded through a proxy
                </li>
                <li>
                  The proxy is open source, but the server you reach could be
                  changed
                </li>
                <li>
                  If the server were malicious, it could compromise your
                  account.
                </li>
                <li>
                  Do not enter your credentials into ANY website unless you
                  understand the risks and completely trust the site!
                </li>
                <li>It is recommended to use the desktop version</li>
                <li>If you use the web version, use a burner account</li>
              </ul>
              <DialogDescription>
                If you understand the risks and wish to continue using the web
                version, type "I understand the risks".
              </DialogDescription>
            </DialogHeader>
            <FieldSet className="mb-4 mt-3">
              <FieldGroup>
                <Field>
                  <Input
                    placeholder="Type your certification here"
                    type="text"
                    required
                    autoFocus
                    value={certification}
                    onChange={(e) => setCertification(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
            <DialogFooter>
              <Field>
                <Button
                  type="submit"
                  disabled={certification != "I understand the risks"}
                  variant="destructive"
                >
                  Continue
                </Button>
              </Field>
              <Button
                onClick={() =>
                  client.openUrl(
                    "https://github.com/nab138/iloader-next/releases",
                  )
                }
              >
                Download Desktop App
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {children}
    </>
  );
}

export default PlatformGate;

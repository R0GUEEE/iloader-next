import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DeviceInfo } from "@/lib/client";
import { client } from "@/App";
import { CheckIcon, RefreshCw, TabletSmartphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function Devices() {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const { t } = useTranslation();

  return (
    <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))] flex-2">
      <CardHeader>
        <CardTitle className="text-xl">{t("device.title")}</CardTitle>
        <CardDescription>{t("next.device.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex flex-col gap-2 flex-1">
          {devices.length === 0 && (
            <div className="text-muted-foreground w-full flex-1 flex p-1 items-center justify-center gap-2 flex-col">
              <div className="flex gap-2 items-center">
                <TabletSmartphone />
                <p className="text-muted-foreground">
                  {t("device.no_devices_found")}
                </p>
              </div>
              <p className="text-muted-foreground">
                {t("next.device.get_started")}
              </p>
            </div>
          )}
          {devices.map((device) => (
            <Button
              key={device.udid}
              variant="outline"
              className={
                "h-auto w-full justify-start p-3" +
                (device.udid === selectedDevice?.udid
                  ? " border border-primary"
                  : "")
              }
              onClick={() => setSelectedDevice(device)}
            >
              {device.udid === selectedDevice?.udid && (
                <CheckIcon className="mr-3 h-5 w-5" />
              )}
              <div className="flex flex-col items-start">
                <div className="text-base">{device.name}</div>
                <div className="text-xs font-normal text-muted-foreground">
                  {device.udid}
                </div>
              </div>

              <div className="ml-auto flex flex-col items-end text-sm font-normal text-muted-foreground">
                <div>{device.version}</div>
                <div>{device.connection_type}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={async () => {
            try {
              const response = await client.getDevices();
              setDevices(response);
              const len = response.length;
              if (len === 0) {
                toast.warning("No devices found");
              } else {
                toast.success(
                  "Found " + len + " device" + (len > 1 ? "s" : ""),
                );
              }
            } catch (e) {
              console.log(e);
              if (e instanceof Object && "message" in e) {
                toast.error(e.message as string);
              } else {
                toast.error("Failed to get devices: " + e);
              }
            }
          }}
        >
          <RefreshCw />
          {t("common.refresh")}
        </Button>
      </CardFooter>
    </Card>
  );
}
export default Devices;

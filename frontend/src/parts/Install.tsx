import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MonitorDown, MonitorUp } from "lucide-react";
import {
  installLiveContainerOperation,
  installSideStoreOperation,
  sideloadOperation,
  useOperations,
} from "@/OperationContext";

export type variant = "stable" | "nightly" | "lcstable" | "lcnightly";

function Install() {
  const [variant, setVariant] = useState<variant>("stable");

  const { t } = useTranslation();
  const { startOperation } = useOperations();

  return (
    <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))]">
      <CardHeader>
        <CardTitle className="text-xl">{t("next.install.title")}</CardTitle>
        <CardDescription>{t("next.install.description")}</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <Field className="w-full">
          <FieldLabel>{t("next.install.variant_description")}</FieldLabel>
          <Select
            value={variant}
            onValueChange={(value) => setVariant(value as variant)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="stable">
                  {t("app.sidestore_stable")}
                </SelectItem>
                <SelectItem value="nightly">
                  {t("app.sidestore_nightly")}
                </SelectItem>
                <SelectItem value="lcstable">
                  {t("app.livecontainer_sidestore_stable")}
                </SelectItem>
                <SelectItem value="lcnightly">
                  {t("app.livecontainer_sidestore_nightly")}
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <FieldDescription>{t("next.install.variant_hint")}</FieldDescription>
        </Field>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          onClick={() => {
            if (variant === "stable" || variant === "nightly") {
              startOperation(
                installSideStoreOperation,
                false,
                variant === "nightly",
              );
            } else {
              startOperation(
                installLiveContainerOperation,
                true,
                variant === "lcnightly",
              );
            }
          }}
        >
          <MonitorDown />
          {t("next.install.install_button")}
        </Button>
        <Button
          onClick={() => startOperation(sideloadOperation)}
          variant="outline"
        >
          <MonitorUp />
          {t("app.import_ipa")}
        </Button>
      </CardFooter>
    </Card>
  );
}
export default Install;

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { client } from "@/App";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AccountInfo } from "@/lib/client";

function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolve2FARef = useRef<((code: string) => void) | null>(null);
  const [loggedInAs, setLoggedInAs] = useState<AccountInfo | null>(null);

  const checkLoggedInStatus = async () => {
    try {
      const username = await client.logged_in_as();
      setLoggedInAs(username);
    } catch (e) {
      toast.error("Failed to check login status: " + e);
    }
  };

  useEffect(() => {
    checkLoggedInStatus();
  }, []);

  const { t } = useTranslation();

  return (
    <>
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) setDialogOpen(open);
        }}
      >
        <DialogContent showCloseButton={false}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (resolve2FARef.current) {
                resolve2FARef.current(twoFactorCode);
                resolve2FARef.current = null;
              } else {
                toast.error("2FA callback not found");
              }
              setDialogOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>{t("apple_id.two_factor_title")}</DialogTitle>
              <DialogDescription>
                {t("apple_id.two_factor_prompt")}
              </DialogDescription>
            </DialogHeader>
            <FieldSet className="mb-4 mt-3">
              <FieldGroup>
                <Field>
                  <Input
                    placeholder="123456"
                    type="number"
                    required
                    autoFocus
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
            <DialogFooter>
              <Field>
                <Button type="submit">{t("apple_id.submit")}</Button>
              </Field>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Card className="min-w-[min(100%,max(400px,35%))] flex-1">
        <CardHeader>
          <CardTitle className="text-xl">{t("apple_id.title")}</CardTitle>

          <CardDescription>{t("next.apple_id.description")}</CardDescription>
        </CardHeader>
        {loggedInAs ? (
          <>
            <CardContent className="h-full">
              <div className="flex items-center gap-4 border rounded-md bg-secondary p-3">
                <div className="flex flex-col items-start">
                  <div className="text-xs font-normal text-muted-foreground">
                    {t("apple_id.logged_in_as")}
                  </div>
                  <div className="text-base">
                    {loggedInAs.first_name} {loggedInAs.last_name}
                  </div>
                </div>

                <div className="ml-auto flex flex-col items-end text-sm font-normal text-muted-foreground">
                  <div>{loggedInAs.email}</div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={async () => {
                  alert("todo");
                }}
              >
                {t("apple_id.sign_out")}
              </Button>
            </CardFooter>
          </>
        ) : (
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              let promise = client.login(email, password, () => {
                setDialogOpen(true);
                return new Promise((resolve) => {
                  resolve2FARef.current = resolve;
                });
              });
              toast.promise(promise, {
                loading: t("apple_id.logging_in"),
                success: t("apple_id.logged_in_success"),
                error: (e) => e,
              });
              promise.then(() => {
                checkLoggedInStatus();
              });
            }}
          >
            <CardContent className="h-full">
              <FieldGroup>
                <FieldSet>
                  <FieldGroup className="gap-4">
                    <Field>
                      <FieldLabel htmlFor="account-email">
                        {t("next.apple_id.email_label")}
                      </FieldLabel>
                      <Input
                        id="account-email"
                        placeholder="example@icloud.com"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    <Field className="mb-5">
                      <FieldLabel htmlFor="account-password">
                        {t("next.apple_id.password_label")}
                      </FieldLabel>
                      <Input
                        id="account-password"
                        placeholder="••••••••"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </FieldGroup>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-fit">
                {t("apple_id.login")}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </>
  );
}
export default Account;

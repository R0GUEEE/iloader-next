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
import { client } from "@/main";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function Account() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const resolve2FARef = useRef<((code: string) => void) | null>(null);
  const [loggedInAs, setLoggedInAs] = useState<string | null>(null);

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
                toast.error(
                  "2FA callback not found. Please try logging in again.",
                );
              }
              setDialogOpen(false);
            }}
          >
            <DialogHeader>
              <DialogTitle>Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Enter the 2FA code sent to your trusted devices or phone number.
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
                <Button type="submit">Submit</Button>
              </Field>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Card className="min-w-[min(100%,max(400px,35%))] flex-1">
        <CardHeader>
          <CardTitle className="text-xl">1. Apple ID</CardTitle>
          <CardDescription>
            {loggedInAs ? "Logged in as" : "Login to your Apple account"}
          </CardDescription>
        </CardHeader>
        {loggedInAs ? (
          <>
            <CardContent className="h-full">
              <p className="text-base">{loggedInAs}</p>
            </CardContent>
            <CardFooter>
              <Button
                variant="destructive"
                onClick={async () => {
                  alert("todo");
                }}
              >
                Logout
              </Button>
            </CardFooter>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              let promise = client.login(email, password, () => {
                setDialogOpen(true);
                return new Promise((resolve) => {
                  resolve2FARef.current = resolve;
                });
              });
              toast.promise(promise, {
                loading: "Logging in...",
                success: "Logged in successfully!",
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
                        Apple ID Email
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
                        Password
                      </FieldLabel>
                      <Input
                        id="account-password"
                        placeholder="Apple ID password..."
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
                Login
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </>
  );
}
export default Account;

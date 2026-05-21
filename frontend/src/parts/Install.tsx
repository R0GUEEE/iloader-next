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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

export type variant = "stable" | "nightly" | "lcstable" | "lcnightly";

function Install() {
  const [variant, setVariant] = useState<variant>("stable");

  return (
    <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))]">
      <CardHeader>
        <CardTitle className="text-xl">3. Install</CardTitle>
        <CardDescription>Install SideStore on your device</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <Field className="w-full max-w-80">
          <FieldLabel>SideStore Variant</FieldLabel>
          <Select value={variant} onValueChange={(value) => setVariant(value as variant)}>
            <SelectTrigger>
              <SelectValue placeholder="Variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="stable">SideStore Stable</SelectItem>
                <SelectItem value="nightly">SideStore Nightly</SelectItem>
                <SelectItem value="lcstable">LiveContainer+SideStore Stable</SelectItem>
                <SelectItem value="lcnightly">LiveContainer+SideStore Nightly</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <FieldDescription>Only change this if you know what you are doing</FieldDescription>
        </Field>

      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={() => toast("Not implemented yet")}>
          Install SideStore
        </Button>
        <Button onClick={() => toast("Not implemented yet")} variant="outline">
          Install .IPA
        </Button>
      </CardFooter>
    </Card>
  );
}
export default Install;

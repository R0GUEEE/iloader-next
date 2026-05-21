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
import i18n, { sortedLanguages } from "@/i18next";
import { useStore } from "@/lib/StoreContext";
import { useEffect } from "react";
import { toast } from "sonner";


function Settings() {
    const [lang, setLang] = useStore<string>("lang", "en");

    useEffect(() => {
        i18n.changeLanguage(lang);
    }, [lang]);

    return (
        <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))]">
            <CardHeader>
                <CardTitle className="text-xl">Utilities</CardTitle>
                <CardDescription>Tools & Settings</CardDescription>
            </CardHeader>
            <CardContent className="h-full">
                <Field className="w-full">
                    <FieldLabel>Language</FieldLabel>
                    <Select value={lang} onValueChange={(value) => setLang(value)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Language" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {sortedLanguages.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                    <FieldDescription>You can contribute translations here</FieldDescription>
                </Field>
            </CardContent>
            <CardFooter className="flex gap-2 flex-wrap">
                <Button onClick={() => toast("Not implemented yet")}>
                    Manage Certificates
                </Button>
                <Button onClick={() => toast("Not implemented yet")}>
                    View App IDs
                </Button>
                <Button onClick={() => toast("Not implemented yet")}>
                    Pairing File
                </Button>
            </CardFooter>
        </Card>
    );
}
export default Settings;

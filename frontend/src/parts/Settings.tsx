import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";


function Settings() {

    return (
        <Card className="grow flex flex-col min-w-[min(100%,max(400px,35%))]">
            <CardHeader>
                <CardTitle className="text-xl">Utilities</CardTitle>
                <CardDescription>Tools & Settings</CardDescription>
            </CardHeader>
            <CardContent className="h-full">
                <p>Settings are coming later!</p>
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

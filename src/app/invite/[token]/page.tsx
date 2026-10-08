import { redirect } from "next/navigation";
import { acceptInviteAction } from "@/actions/workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  async function accept() {
    "use server";
    await acceptInviteAction(token);
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center py-16">
      <Card>
        <CardHeader>
          <CardTitle>Pozvánka do workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Prihláste sa účtom so správnym e-mailom a potvrďte pozvánku.
          </p>
          <form action={accept}>
            <Button type="submit" className="w-full">
              Prijať pozvánku
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

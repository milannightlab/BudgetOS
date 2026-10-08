import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,_#ccfbf1,_#ffffff_55%)] p-4">
      <SignIn />
    </div>
  );
}

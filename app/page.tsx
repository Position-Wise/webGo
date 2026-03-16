import { redirect } from "next/navigation";
import HomePage from "./home/page";
import { getCurrentUserAccessState } from "@/lib/subscription-access";
import { getPostLoginRedirectPathForState } from "@/lib/subscription-status";

export default async function Home() {
  const access = await getCurrentUserAccessState();

  if (access.user) {
    redirect(getPostLoginRedirectPathForState(access.accessState));
  }

  return (
    <div>
      <HomePage/>
    </div>
  );
}

import { redirect } from "next/navigation";

// Root → redirect to the app dashboard
export default function RootPage() {
  redirect("/dashboard");
}

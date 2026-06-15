import { redirect } from "next/navigation";

// Sources is now a sub-tab inside /trends
export default function SourcesRedirect() {
  redirect("/trends");
}

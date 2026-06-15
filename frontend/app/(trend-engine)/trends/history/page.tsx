import { redirect } from "next/navigation";

// History is now a sub-tab inside /trends
export default function HistoryRedirect() {
  redirect("/trends");
}

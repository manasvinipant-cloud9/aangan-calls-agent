import { redirect } from "next/navigation";

/** The designers' queue now lives on the unified enquiry desk. Old shared links keep working. */
export default async function Designers({ searchParams }: { searchParams: Promise<{ key?: string }> }) {
  const { key } = await searchParams;
  redirect(`/leads${key ? `?key=${encodeURIComponent(key)}` : ""}`);
}

import { ResponseForm } from "@/app/respond/[slug]/ResponseForm";

export default async function RespondPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ResponseForm slug={slug} />;
}

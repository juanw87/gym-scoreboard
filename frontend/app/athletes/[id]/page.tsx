import { AthleteDetailView } from "@/components/athlete-detail-view";

export default async function AthletePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AthleteDetailView athleteId={id} />;
}

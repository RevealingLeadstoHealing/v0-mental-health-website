import FullProductionInterface from "../full-production-interface";

export default async function EhrTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params;
  return <FullProductionInterface initialPage={tab} />;
}

import CroquisClientComponent from './CroquisClientComponent';

export default async function CroquisPage({ params }: { params: { id: string } }) {
  const resolvedParams = await params;
  const { id: eventoID } = resolvedParams;

  return <CroquisClientComponent eventoID={eventoID} />;
}

// Les tracés viennent de data.ts (contenu statique du projet, pas de saisie utilisateur).
export default function Icon({ d }: { d: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;
}

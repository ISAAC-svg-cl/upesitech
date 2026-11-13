import { Link } from 'react-router-dom';
import Banner from '../components/Banner';

export default function Contact() {
  return (
    <section className="view on">
      <Banner variant="collab" title="Parlons de votre projet">Nous sommes ouverts aux collaborations : partenaires, institutions, agences et indépendants.</Banner>
      <div className="grid contact">
        <div className="card"><h3 style={{ marginTop: 0 }}>Réseaux</h3><p style={{ color: 'var(--muted)', margin: 0 }}>Suivez nos actualités et nos offres.</p>
          <div className="soc"><span>Instagram @upesitech</span><span>Facebook @upesitech</span><span>LinkedIn @upesitech</span></div></div>
        <div className="card"><h3 style={{ marginTop: 0 }}>Collaborer</h3><p style={{ color: 'var(--muted)' }}>Décrivez votre idée de partenariat dans une demande.</p><Link className="btn" to="/devis">Écrire à l’équipe</Link></div>
        <div className="card"><h3 style={{ marginTop: 0 }}>Siège</h3><p style={{ color: 'var(--muted)', margin: 0 }}>République Démocratique du Congo</p></div>
      </div>
    </section>
  );
}

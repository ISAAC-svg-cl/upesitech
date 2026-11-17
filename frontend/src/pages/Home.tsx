import { Link } from 'react-router-dom';
import Banner from '../components/Banner';
import HeroSlider from '../components/HeroSlider';

const STEPS = [
  ['Analyse', 'Nous cernons vos attentes et vos contraintes.'],
  ['Conception', 'Maquettes et spécifications validées avec vous.'],
  ['Réalisation', 'Développement, design ou impression, avec contrôle qualité.'],
  ['Livraison et suivi', 'Mise en service, formation, assistance et maintenance.'],
];

export default function Home() {
  return (
    <section className="view on">
      <div className="hero">
        <div>
          <h1>Le numérique qui <span className="ul">travaille pour vous.</span></h1>
          <p className="lead">Applications, sécurité, design et impression : UpesiTech accompagne les entreprises, institutions et particuliers de RDC. Nous sommes à votre service. Chez nous, c’est la qualité.</p>
          <Link className="btn" to="/devis">Demander un devis</Link>{' '}
          <Link className="btn ghost" to="/services">Voir nos services</Link>
        </div>
        <HeroSlider />
      </div>
      <div className="strip"><span>Délais respectés</span><span>Données confidentielles</span><span>Solutions fiables et sécurisées</span><span>Service après-vente</span></div>
      <div className="sec">
        <h2>Notre façon de travailler</h2>
        <div className="flow">{STEPS.map(([b, s]) => <div key={b}><b>{b}</b><span>{s}</span></div>)}</div>
      </div>
      <Banner variant="s3" extra="home" title="Qui nous servons">Entreprises, administrations, écoles et universités, ONG, startups, commerçants, entrepreneurs et particuliers.</Banner>
    </section>
  );
}

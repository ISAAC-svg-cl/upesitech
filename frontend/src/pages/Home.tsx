import { Link } from 'react-router-dom';
import Banner from '../components/Banner';
import HeroSlider from '../components/HeroSlider';
import Reveal from '../components/Reveal';

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
          <h1 className="hero-title">
            <span className="hero-title-line line-1">Le numérique qui</span>{' '}
            <span className="hero-title-line line-2">
              <span className="ul">travaille pour vous.</span>
            </span>
          </h1>
          <p className="lead">
            Applications, sécurité, design et impression : UpesiTech accompagne les entreprises, institutions et particuliers de RDC. Nous sommes à votre service. Chez nous, c’est la qualité.
          </p>
          <Link className="btn" to="/devis">
            Demander un devis
          </Link>{' '}
          <Link className="btn ghost" to="/services">
            Voir nos services
          </Link>
        </div>
        <HeroSlider />
      </div>

      <Reveal>
        <div className="strip">
          <span>Délais respectés</span>
          <span>Données confidentielles</span>
          <span>Solutions fiables et sécurisées</span>
          <span>Service après-vente</span>
        </div>
      </Reveal>

      <div className="sec">
        <Reveal>
          <h2>Notre façon de travailler</h2>
        </Reveal>
        <Reveal cascade stagger={80}>
          <div className="flow">
            {STEPS.map(([b, s]) => (
              <div key={b}>
                <b>{b}</b>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Banner variant="s3" extra="home" title="Qui nous servons">
        Entreprises, administrations, écoles et universités, ONG, startups, commerçants, entrepreneurs et particuliers.
      </Banner>
    </section>
  );
}

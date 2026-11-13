import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';

const LINKS: [string, string][] = [['/', 'Accueil'], ['/services', 'Services'], ['/devis', 'Devis'], ['/emplois', 'Emplois'], ['/contact', 'Contact']];

export function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M5 13h9v13a6 6 0 0 0 12 0V10l4 3v13a11 11 0 0 1-25 0z" style={{ fill: 'var(--text)' }} />
      <path d="M19 3h12a4 4 0 0 1 4 4v9l-6 5V9H19z" fill="#1F6BFF" />
    </svg>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <>
      <header>
        <div className="bar">
          <Link to="/" className="brand" aria-label="Accueil UpesiTech"><Logo /><span>Upesi<b>Tech</b></span></Link>
          <nav aria-label="Navigation principale">
            {LINKS.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}
          </nav>
          <Link className="btn hcta" to="/devis">Demander un devis</Link>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="foot">
        <div className="fin">
          <div>
            <div className="fb">Upesi<b>Tech</b> SARL</div>
            <p>Solutions numériques, sécurité, design et impression en République Démocratique du Congo.</p>
          </div>
          <div className="fl">{LINKS.slice(1).map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}</div>
          <div className="fs"><span>Instagram @upesitech</span><span>Facebook @upesitech</span><span>LinkedIn @upesitech</span></div>
        </div>
        <div className="fc">© {new Date().getFullYear()} UpesiTech SARL. Tous droits réservés.</div>
      </footer>
    </>
  );
}

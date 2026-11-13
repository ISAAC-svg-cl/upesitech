import Banner from '../components/Banner';
import Icon from '../components/Icon';
import { SERVICES } from '../data';
import { useCart } from '../cart';

export default function Services() {
  const { sel, toggle } = useCart();
  return (
    <section className="view on">
      <Banner variant="s1" title="Nos services">Ajoutez ce qui vous intéresse à votre demande, nous revenons vers vous avec une proposition.</Banner>
      <div className="grid">
        {SERVICES.map((s, i) => (
          <div className="card svc" key={s.id}>
            <div className={`ico c${i % 4}`}><Icon d={s.icon} /></div>
            <h3>{s.name}</h3>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{s.desc}</p>
            <ul>{s.items.map((it) => <li key={it}>{it}</li>)}</ul>
            <div className="row">
              <button className="btn ghost" onClick={() => toggle(s.id)}>{sel.includes(s.id) ? 'Retirer de ma demande' : 'Ajouter à ma demande'}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

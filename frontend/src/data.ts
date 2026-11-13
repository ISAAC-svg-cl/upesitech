import type { Service } from './types';

export const SERVICES: Service[] = [
  { id: 'web', name: 'Applications web', desc: 'Sites, e-commerce et outils de gestion sur mesure.', tagline: 'Un site ou un outil web qui représente votre activité.', items: ['Sites institutionnels et vitrines', 'Plateformes e-commerce', 'Applications de gestion et portails'],
    icon: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>' },
  { id: 'mob', name: 'Applications mobiles', desc: 'Android, iOS et hybrides, avec maintenance.', tagline: 'Votre service dans la poche de vos clients.', items: ['Applications Android et iOS', 'Applications hybrides', 'Mises à jour et maintenance'],
    icon: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 18h.01"/>' },
  { id: 'auto', name: 'Automatisation', desc: 'Moins de papier, plus de productivité.', tagline: 'Vos procédures, sans la paperasse.', items: ['Processus métier automatisés', 'Gestion électronique des documents', 'Suivi et contrôle automatisés'],
    icon: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>' },
  { id: 'cyb', name: 'Cybersécurité', desc: 'Protéger vos systèmes et vos données.', tagline: 'Vos données protégées, vos équipes formées.', items: ['Audit de sécurité', 'Sauvegarde et récupération', 'Gestion des accès, sensibilisation'],
    icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' },
  { id: 'for', name: 'Formation', desc: 'Renforcer les compétences de vos équipes.', tagline: "Des équipes à l'aise avec le numérique.", items: ['Bureautique professionnelle', 'Développement web et mobile', 'Réseaux et cybersécurité'],
    icon: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>' },
  { id: 'des', name: 'Design graphique', desc: 'Une image professionnelle et cohérente.', tagline: "Une identité visuelle qu'on reconnaît.", items: ['Logos et chartes graphiques', 'Affiches, flyers, brochures', 'Supports pour les réseaux sociaux'],
    icon: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18"/><circle cx="11" cy="11" r="2"/>' },
  { id: 'imp', name: 'Imprimerie', desc: 'Impression professionnelle, petits et grands formats.', tagline: 'Du fichier au support imprimé, livré.', items: ['Cartes de visite, flyers, affiches', 'Banderoles, bâches, calendriers', 'Documents administratifs et objets personnalisés'],
    icon: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>' },
];
export const DEADLINES = ['Urgent (moins de 2 semaines)', '1 mois', '2 à 3 mois', 'Pas de contrainte'];

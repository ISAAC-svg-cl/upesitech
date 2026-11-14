import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote } from '../../types';
import { SERVICES } from '../../data';

const serviceName = (id: string) => SERVICES.find((s) => s.id === id)?.name ?? id;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * Exporte la liste filtrée des devis dans un document PDF soigné et structuré en tableau.
 */
export function exportQuotesListPdf(quotes: Quote[], subtitle = 'Liste des demandes') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // En-tête UpesiTech
  doc.setFillColor(7, 15, 36); // #070F24
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('UpesiTech – Tableau de bord Administrateur', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rapport des devis : ${subtitle} (${quotes.length} enregistrement${quotes.length > 1 ? 's' : ''})`, 14, 18);

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setFontSize(9);
  doc.text(`Exporté le : ${dateStr}`, pageWidth - 14, 18, { align: 'right' });

  // Données du tableau
  const headers = [['Réf.', 'Date', 'Client', 'Contact', 'Services', 'Statut', 'Délai', 'Description']];
  const data = quotes.map((q) => [
    q.ref,
    fmtDate(q.createdAt),
    q.name + (q.org ? `\n(${q.org})` : ''),
    q.contact,
    q.services.map(serviceName).join(', '),
    q.status.toUpperCase(),
    q.deadline || 'Non précisé',
    (q.message || '').slice(0, 150) + (q.message && q.message.length > 150 ? '…' : ''),
  ]);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 28,
    margin: { left: 14, right: 14 },
    theme: 'striped',
    headStyles: {
      fillColor: [29, 114, 254], // #1D72FE
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 20 },
      1: { cellWidth: 26 },
      2: { cellWidth: 35 },
      3: { cellWidth: 32 },
      4: { cellWidth: 38 },
      5: { cellWidth: 20 },
      6: { cellWidth: 24 },
      7: { cellWidth: 'auto' },
    },
    didDrawPage: (dataInfo) => {
      // Pied de page
      const pageCount = doc.internal.pages.length - 1;
      const currentPage = dataInfo.pageNumber;
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `UpesiTech SURL – Document administratif confidentiel · Page ${currentPage} sur ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );
    },
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`upesitech-devis-${fileDate}.pdf`);
}

/**
 * Exporte une fiche de devis individuelle au format PDF officiel.
 */
export function exportSingleQuotePdf(quote: Quote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Barre supérieure bleue
  doc.setFillColor(7, 15, 36); // #070F24
  doc.rect(0, 0, pageWidth, 32, 'F');

  // En-tête UpesiTech
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('UpesiTech', 16, 16);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 220, 255);
  doc.text('Solutions Numériques & Services Technologiques', 16, 23);

  // Badge Référence à droite
  doc.setFillColor(29, 114, 254); // #1D72FE
  doc.roundedRect(pageWidth - 60, 9, 44, 14, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(quote.ref, pageWidth - 38, 18, { align: 'center' });

  // Titre du document
  let y = 46;
  doc.setTextColor(7, 15, 36);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE DE DEMANDE DE DEVIS', 16, y);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Enregistré le : ${fmtDate(quote.createdAt)} · Statut : ${quote.status.toUpperCase()}`, 16, y + 6);

  // Bloc Client
  y += 16;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, y, pageWidth - 32, 36, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 114, 254);
  doc.text('INFORMATIONS CLIENT', 22, y + 8);

  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Nom complet :', 22, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.name, 55, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Organisation :', 22, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.org || 'Particulier', 55, y + 24);

  doc.setFont('helvetica', 'bold');
  doc.text('Contact :', 22, y + 31);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.contact, 55, y + 31);

  doc.setFont('helvetica', 'bold');
  doc.text('Délai souhaité :', pageWidth / 2 + 10, y + 17);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.deadline || 'Non spécifié', pageWidth / 2 + 45, y + 17);

  doc.setFont('helvetica', 'bold');
  doc.text('Archivé :', pageWidth / 2 + 10, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(quote.archived ? 'Oui' : 'Non', pageWidth / 2 + 45, y + 24);

  // Services demandés
  y += 44;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(7, 15, 36);
  doc.text('SERVICES DEMANDÉS', 16, y);

  y += 5;
  const servicesList = quote.services.map(serviceName).join('   •   ');
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(16, y, pageWidth - 32, 12, 2, 2, 'F');
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 114, 254);
  doc.text('•  ' + servicesList, 20, y + 7.5);

  // Description du projet
  y += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(7, 15, 36);
  doc.text('DESCRIPTION DU BESOIN & PROJET', 16, y);

  y += 4;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const splitMessage = doc.splitTextToSize(quote.message || 'Aucune description fournie.', pageWidth - 42);
  const blockHeight = Math.max(splitMessage.length * 5 + 10, 24);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, y, pageWidth - 32, blockHeight, 2, 2, 'D');
  doc.text(splitMessage, 21, y + 7);

  // Notes internes (si existantes)
  y += blockHeight + 10;
  if (quote.notes && quote.notes.length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(7, 15, 36);
    doc.text('HISTORIQUE DES NOTES INTERNES', 16, y);

    y += 4;
    quote.notes.forEach((n) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(`[${fmtDate(n.createdAt)}]`, 18, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      const splitNote = doc.splitTextToSize(n.text, pageWidth - 60);
      doc.text(splitNote, 52, y + 4);
      y += splitNote.length * 4.5 + 4;
    });
  }

  // Pied de page
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Document confidentiel généré par UpesiTech App · www.upesitech.com', pageWidth / 2, pageHeight - 10, {
    align: 'center',
  });

  doc.save(`Devis_${quote.ref}_${quote.name.replace(/\s+/g, '_')}.pdf`);
}

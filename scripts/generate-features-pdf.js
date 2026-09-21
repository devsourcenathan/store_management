const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

function generatePDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;

  // Colors
  const primaryColor = [41, 128, 185];    // Blue
  const secondaryColor = [39, 174, 96];   // Green
  const accentColor = [192, 57, 43];      // Red
  const darkColor = [44, 62, 80];         // Dark blue
  const lightColor = [236, 240, 241];     // Light gray
  const white = [255, 255, 255];

  // Helper functions
  function setColor(color) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function setFillColor(color) {
    doc.setFillColor(color[0], color[1], color[2]);
  }

  function drawRect(x, y, w, h, color) {
    setFillColor(color);
    doc.rect(x, y, w, h, 'F');
  }

  // ============================================
  // PAGE 1: COVER
  // ============================================
  drawRect(0, 0, pageWidth, pageHeight, primaryColor);
  drawRect(0, 0, pageWidth, 80, darkColor);

  // Title
  doc.setFontSize(32);
  setColor(white);
  doc.text('Guide des Fonctionnalites', pageWidth / 2, 40, { align: 'center' });

  doc.setFontSize(18);
  doc.text('Ecart de Caisse & Mouvements Divers', pageWidth / 2, 55, { align: 'center' });

  // Subtitle box
  drawRect(30, 100, pageWidth - 60, 60, white);
  doc.setFontSize(14);
  setColor(darkColor);
  doc.text('Application de Gestion de Stock', pageWidth / 2, 120, { align: 'center' });
  doc.setFontSize(12);
  doc.text('Version 1.0', pageWidth / 2, 135, { align: 'center' });

  // Date
  doc.setFontSize(11);
  setColor(white);
  const today = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text(`Date : ${today}`, pageWidth / 2, 180, { align: 'center' });

  // Footer
  doc.setFontSize(10);
  doc.text('Document confidentiel', pageWidth / 2, 270, { align: 'center' });

  // ============================================
  // PAGE 2: ECARTS DE CAISSE
  // ============================================
  doc.addPage();

  // Header bar
  drawRect(0, 0, pageWidth, 25, primaryColor);
  doc.setFontSize(18);
  setColor(white);
  doc.text('ECARTS DE CAISSE', margin, 17);

  let y = 40;

  // Definition box
  drawRect(margin, y, contentWidth, 35, lightColor);
  doc.setFontSize(11);
  setColor(darkColor);
  doc.text('Definition', margin + 5, y + 8);
  doc.setFontSize(10);
  setColor(darkColor);
  doc.text('Les ecarts de caisse permettent de faire le comptage physique', margin + 5, y + 18);
  doc.text("d'une caisse et d'enregistrer la difference entre le solde", margin + 5, y + 25);
  doc.text('calcule par le systeme et le montant reellement compte.', margin + 5, y + 32);

  y += 45;

  // How it works
  doc.setFontSize(13);
  setColor(primaryColor);
  doc.text('Comment ca marche ?', margin, y);
  y += 10;

  drawRect(margin, y, contentWidth, 45, white);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 45, 'S');

  doc.setFontSize(10);
  setColor(darkColor);
  doc.text('Formule de calcul :', margin + 5, y + 10);
  doc.setFontSize(11);
  doc.text('Solde attendu = Dernier solde compte + Ventes en especes', margin + 10, y + 22);
  doc.text('                      + Entrees diverses - Sorties diverses', margin + 10, y + 30);

  doc.setFontSize(10);
  setColor(accentColor);
  doc.text('Difference = Solde compte - Solde attendu', margin + 10, y + 42);

  y += 55;

  // Example
  doc.setFontSize(13);
  setColor(primaryColor);
  doc.text('Exemple concret', margin, y);
  y += 10;

  const exampleData = [
    ['Dernier comptage', '100 000 FCFA'],
    ['Ventes depuis', '+ 500 000 FCFA'],
    ['Entrees diverses', '+ 20 000 FCFA'],
    ['Sorties diverses', '- 10 000 FCFA'],
    ['Solde attendu', '= 560 000 FCFA'],
    ['Solde physique compte', '555 000 FCFA'],
    ['ECART', '- 5 000 FCFA']
  ];

  exampleData.forEach((row, i) => {
    const rowY = y + i * 8;
    if (i === exampleData.length - 1) {
      drawRect(margin, rowY - 4, contentWidth, 10, accentColor);
      doc.setTextColor(white[0], white[1], white[2]);
    } else if (i === 4) {
      drawRect(margin, rowY - 4, contentWidth, 10, secondaryColor);
      doc.setTextColor(white[0], white[1], white[2]);
    } else {
      setColor(darkColor);
    }
    doc.setFontSize(10);
    doc.text(row[0], margin + 5, rowY + 2);
    doc.text(row[1], margin + contentWidth - 5, rowY + 2, { align: 'right' });
  });

  y += exampleData.length * 8 + 15;

  // Recorded data
  doc.setFontSize(13);
  setColor(primaryColor);
  doc.text('Donnees enregistrees', margin, y);
  y += 10;

  const fields = [
    ['Solde attendu', 'Calcule automatiquement par le systeme'],
    ['Solde compte', 'Entre par l\'utilisateur'],
    ['Difference', 'Calculee automatiquement (compte - attendu)'],
    ['Raison', 'Obligatoire si ecart different de 0'],
    ['Date/Heure', 'Enregistree automatiquement'],
    ['Utilisateur', 'Qui a fait le comptage']
  ];

  fields.forEach((field, i) => {
    const rowY = y + i * 8;
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(field[0], margin + 5, rowY);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(field[1], margin + 60, rowY);
  });

  y += fields.length * 8 + 15;

  // Use cases
  doc.setFontSize(13);
  setColor(primaryColor);
  doc.text("Cas d'usage", margin, y);
  y += 10;

  const useCases = [
    'Comptage de fin de journee',
    'Comptage de fin de semaine',
    'Verification en cours de journee',
    'Inventaire ponctuel'
  ];

  useCases.forEach((uc, i) => {
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(`• ${uc}`, margin + 5, y + i * 8);
  });

  // ============================================
  // PAGE 3: MOUVEMENTS DIVERS
  // ============================================
  doc.addPage();

  // Header bar
  drawRect(0, 0, pageWidth, 25, secondaryColor);
  doc.setFontSize(18);
  setColor(white);
  doc.text('MOUVEMENTS DIVERS', margin, 17);

  y = 40;

  // Definition
  drawRect(margin, y, contentWidth, 30, lightColor);
  doc.setFontSize(11);
  setColor(darkColor);
  doc.text('Definition', margin + 5, y + 8);
  doc.setFontSize(10);
  doc.text("Les mouvements divers permettent d'enregistrer des", margin + 5, y + 18);
  doc.text("mouvements d'argent qui ne sont pas des ventes.", margin + 5, y + 25);

  y += 40;

  // Types
  doc.setFontSize(13);
  setColor(secondaryColor);
  doc.text('Types de mouvements', margin, y);
  y += 10;

  // IN box
  drawRect(margin, y, contentWidth / 2 - 5, 50, [232, 245, 233]);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth / 2 - 5, 50, 'S');

  doc.setFontSize(12);
  setColor(secondaryColor);
  doc.text('ENTREE (IN)', margin + 5, y + 10);
  doc.setFontSize(9);
  setColor(darkColor);
  doc.text('Argent qui rentre', margin + 5, y + 18);
  doc.text('• Remboursement fournisseur', margin + 5, y + 26);
  doc.text('• Avance du proprietaire', margin + 5, y + 33);
  doc.text('• Remboursement client', margin + 5, y + 40);

  // OUT box
  const outX = margin + contentWidth / 2 + 5;
  drawRect(outX, y, contentWidth / 2 - 5, 50, [253, 237, 236]);
  doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.rect(outX, y, contentWidth / 2 - 5, 50, 'S');

  doc.setFontSize(12);
  setColor(accentColor);
  doc.text('SORTIE (OUT)', outX + 5, y + 10);
  doc.setFontSize(9);
  setColor(darkColor);
  doc.text("Argent qui sort", outX + 5, y + 18);
  doc.text('• Paiement fournisseur', outX + 5, y + 26);
  doc.text('• Frais de livraison', outX + 5, y + 33);
  doc.text('• Achat petit materiel', outX + 5, y + 40);

  y += 60;

  // Recorded data
  doc.setFontSize(13);
  setColor(secondaryColor);
  doc.text('Donnees enregistrees', margin, y);
  y += 10;

  const miscFields = [
    ['Type', 'ENTREE ou SORTIE'],
    ['Montant', 'En FCFA'],
    ['Description', 'Obligatoire - explique le motif'],
    ['Date', 'Peut etre modifiee'],
    ['Utilisateur', 'Qui a enregistre']
  ];

  miscFields.forEach((field, i) => {
    const rowY = y + i * 8;
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(field[0], margin + 5, rowY);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(field[1], margin + 50, rowY);
  });

  y += miscFields.length * 8 + 15;

  // Use cases
  doc.setFontSize(13);
  setColor(secondaryColor);
  doc.text("Cas d'usage", margin, y);
  y += 10;

  const miscUseCases = [
    'Le proprietaire met 200 000 FCFA de sa poche -> ENTREE',
    'On paie un fournisseur en especes -> SORTIE',
    'Le client rembourse une dette -> ENTREE',
    'On achete du papier pour l\'imprimante -> SORTIE'
  ];

  miscUseCases.forEach((uc, i) => {
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(`• ${uc}`, margin + 5, y + i * 8);
  });

  // ============================================
  // PAGE 4: INTERACTION
  // ============================================
  doc.addPage();

  // Header bar
  drawRect(0, 0, pageWidth, 25, darkColor);
  doc.setFontSize(18);
  setColor(white);
  doc.text('INTERACTION ENTRE LES FEATURES', margin, 17);

  y = 40;

  // Flow diagram
  doc.setFontSize(13);
  setColor(darkColor);
  doc.text('Flux de calcul', margin, y);
  y += 10;

  // Misc Transactions box
  drawRect(margin, y, contentWidth, 40, lightColor);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.5);
  doc.rect(margin, y, contentWidth, 40, 'S');

  doc.setFontSize(11);
  setColor(secondaryColor);
  doc.text('MOUVEMENTS DIVERS', margin + 5, y + 10);
  doc.setFontSize(10);
  setColor(darkColor);
  doc.text('ENTREE (+) : Argent qui rentre dans la caisse', margin + 5, y + 22);
  doc.text('SORTIE (-) : Argent qui sort de la caisse', margin + 5, y + 32);

  y += 45;

  // Arrow
  drawRect(margin + contentWidth / 2 - 1, y, 2, 15, primaryColor);
  drawRect(margin + contentWidth / 2 - 5, y + 10, 10, 5, primaryColor);
  y += 20;

  // Cash Adjustment box
  drawRect(margin, y, contentWidth, 55, lightColor);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 55, 'S');

  doc.setFontSize(11);
  setColor(primaryColor);
  doc.text('CALCUL DU SOLDE ATTENDU', margin + 5, y + 10);
  doc.setFontSize(10);
  setColor(darkColor);
  doc.text('= Dernier solde compté', margin + 10, y + 22);
  doc.text('+ Ventes en especes', margin + 10, y + 30);
  doc.text('+ Entrees diverses (Mouvements IN)', margin + 10, y + 38);
  doc.text('- Sorties diverses (Mouvements OUT)', margin + 10, y + 46);

  y += 60;

  // Arrow
  drawRect(margin + contentWidth / 2 - 1, y, 2, 15, primaryColor);
  drawRect(margin + contentWidth / 2 - 5, y + 10, 10, 5, primaryColor);
  y += 20;

  // Result box
  drawRect(margin, y, contentWidth, 30, primaryColor);
  doc.setFontSize(12);
  setColor(white);
  doc.text('ECART DE CAISSE = Solde compte - Solde attendu', margin + 5, y + 12);
  doc.setFontSize(10);
  doc.text('Difference enregistree avec raison obligatoire', margin + 5, y + 22);

  y += 45;

  // Impact on reports
  doc.setFontSize(13);
  setColor(darkColor);
  doc.text('Impact sur les rapports et analytics', margin, y);
  y += 10;

  const impacts = [
    ['Entrees diverses', 'Ajoutees au chiffre d\'affaires'],
    ['Sorties diverses', 'Soustraites des depenses'],
    ['Ecart de caisse', 'Ajoute/soustrait du benefice net']
  ];

  impacts.forEach((impact, i) => {
    const rowY = y + i * 10;
    drawRect(margin, rowY - 3, contentWidth, 10, i % 2 === 0 ? lightColor : white);
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(impact[0], margin + 5, rowY + 3);
    doc.text(impact[1], margin + 70, rowY + 3);
  });

  y += impacts.length * 10 + 15;

  // Final formula
  drawRect(margin, y, contentWidth, 20, darkColor);
  doc.setFontSize(11);
  setColor(white);
  doc.text('Benefice net = Ventes + Maintenances + Entrees - Sorties + Ecart caisse', margin + 5, y + 13);

  // ============================================
  // PAGE 5: SUMMARY
  // ============================================
  doc.addPage();

  // Header bar
  drawRect(0, 0, pageWidth, 25, primaryColor);
  doc.setFontSize(18);
  setColor(white);
  doc.text('RESUME', margin, 17);

  y = 40;

  // Comparison table
  doc.setFontSize(13);
  setColor(darkColor);
  doc.text('Tableau comparatif', margin, y);
  y += 10;

  // Table header
  drawRect(margin, y, contentWidth, 10, primaryColor);
  doc.setFontSize(10);
  setColor(white);
  doc.text('Aspect', margin + 5, y + 7);
  doc.text('Ecart de Caisse', margin + 60, y + 7);
  doc.text('Mouvements Divers', margin + 130, y + 7);

  y += 10;

  const tableData = [
    ['Objectif', 'Compter la caisse', 'Enregistrer DE/ENTREE'],
    ['Donnee cle', 'Solde compte', 'Type (IN/OUT)'],
    ['Calcule par', 'Systeme + Utilisateur', 'Utilisateur'],
    ['Interaction', 'Utilise les mouvements', 'Impacte le solde'],
    ['Rapports', 'Impacte le benefice', 'Impacte CA et depenses']
  ];

  tableData.forEach((row, i) => {
    const rowY = y + i * 10;
    drawRect(margin, rowY, contentWidth, 10, i % 2 === 0 ? lightColor : white);
    setColor(darkColor);
    doc.setFontSize(9);
    doc.text(row[0], margin + 5, rowY + 7);
    doc.text(row[1], margin + 60, rowY + 7);
    doc.text(row[2], margin + 130, rowY + 7);
  });

  y += tableData.length * 10 + 15;

  // Key points
  doc.setFontSize(13);
  setColor(darkColor);
  doc.text('Points cles a retenir', margin, y);
  y += 10;

  const keyPoints = [
    'Les ecarts de caisse sont essentiels pour le controle interne',
    'Les mouvements divers permettent de suivre tout cash flow',
    'Les deux features sont liees et se complètent',
    'Toutes les donnees sont tracees (utilisateur, date)',
    'Les rapports integrent automatiquement ces donnees'
  ];

  keyPoints.forEach((point, i) => {
    setColor(darkColor);
    doc.setFontSize(10);
    doc.text(`✓  ${point}`, margin + 5, y + i * 10);
  });

  y += keyPoints.length * 10 + 20;

  // Footer
  drawRect(margin, y, contentWidth, 25, lightColor);
  doc.setFontSize(10);
  setColor(darkColor);
  doc.text('Pour plus d\'informations, consultez la documentation technique', margin + 5, y + 10);
  doc.text('ou contactez l\'equipe de developpement.', margin + 5, y + 18);

  // Save
  const outputPath = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  const outputFile = path.join(outputPath, 'guide-ecarts-mouvements.pdf');
  doc.save(outputFile);
  console.log(`PDF genere avec succes: ${outputFile}`);
}

// Install jspdf if not present
try {
  require.resolve('jspdf');
} catch (e) {
  console.log('Installation de jspdf...');
  const { execSync } = require('child_process');
  execSync('npm install jspdf', { cwd: __dirname, stdio: 'inherit' });
}

generatePDF();

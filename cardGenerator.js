// cardGenerator.js - Módulo para geração de carteirinhas

const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const PDFDocument = require("pdfkit");

// Configurações gerais
const CONFIG = {
  frontTemplate: "templates/Frente.png",
  backTemplate: "templates/Verso.png",
  photoFolder: "fotos",
  outputFolder: "carteirinhas",
  cardWidth: 1748,
  cardHeight: 1240,
};

// Verifica e cria diretórios necessários
function setupDirectories() {
  const directories = ["templates", CONFIG.photoFolder, CONFIG.outputFolder];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Diretório criado: ${dir}`);
    }
  });
}

// Gera a imagem da frente da carteirinha para um membro
async function generateCardFront(member) {
  try {
    const template = await loadImage(CONFIG.frontTemplate);
    const canvas = createCanvas(CONFIG.cardWidth, CONFIG.cardHeight);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(template, 0, 0, CONFIG.cardWidth, CONFIG.cardHeight);

    try {
      const photoPath = path.join(CONFIG.photoFolder, member.Foto || `${member.Nome}.jpg`);
      const photo = await loadImage(photoPath);
      ctx.drawImage(photo, 58, 40, 220, 280);
    } catch {
      ctx.fillStyle = "#CCCCCC";
      ctx.fillRect(58, 40, 220, 280);
      ctx.fillStyle = "#333";
      ctx.font = "20px Arial";
      ctx.fillText("Sem Foto", 90, 180);
    }

    ctx.fillStyle = "#000000";

    ctx.font = "bold 50px Arial";
    ctx.fillText(member.Nome, 320, 880);//não mexer

    ctx.font = "bold 50px Arial";
    ctx.fillText(`${member.Funcao || 'Membro'}`, 320, 1130);//não mexer

    return canvas.toBuffer("image/png");
  } catch (error) {
    console.error(`Erro ao gerar frente da carteirinha para ${member.Nome}:`, error.message);
    throw error;
  }
}

// Gera a imagem do verso da carteirinha
async function generateCardBack(member) {
  try {
    const template = await loadImage(CONFIG.backTemplate);
    const canvas = createCanvas(CONFIG.cardWidth, CONFIG.cardHeight);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(template, 0, 0, CONFIG.cardWidth, CONFIG.cardHeight);

    // Configurações da fonte (ajuste conforme o necessário)
    ctx.font = "40px Arial";
    ctx.fillStyle = "#000"; // cor do texto
    ctx.textAlign = "left";

    // Gerar os dados no verso
    const cpf = member.CPF
      ? `${member.CPF.toString().padStart(11, "0").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}`
      : "Não informado";
    ctx.fillText(cpf, 1099, 200); //não mexer

    const nascimento = formatDate(member.DataNascimento);
    ctx.fillText(nascimento, 250, 200);

    const batismo = formatDate(member.DataBatismo);
    ctx.fillText(batismo, 250, 425);

    ctx.fillText(member.Congregacao, 1099, 425);

    const validade = formatDate(member.Validade) || "31/12/2025";
    ctx.fillText(validade, 250, 650); //não mexer

    return canvas.toBuffer("image/png");

  } catch (error) {
    console.error(`Erro ao gerar verso da carteirinha para ${member.Nome}:`, error.message);
    throw error;
  }
}


// Gera o PDF individual para um membro
async function generatePDF(member, frontBuffer, backBuffer) {
  return new Promise((resolve, reject) => {
    try {
      const outputFilename = path.join(
        CONFIG.outputFolder,
        `${member.Nome.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`
      );

      const doc = new PDFDocument({
        size: [CONFIG.cardWidth, CONFIG.cardHeight],
        margin: 0,
      });

      const stream = fs.createWriteStream(outputFilename);
      stream.on("finish", () => resolve(outputFilename));
      stream.on("error", reject);

      doc.pipe(stream);

      doc.image(frontBuffer, 0, 0, {
        width: CONFIG.cardWidth,
        height: CONFIG.cardHeight,
      });

      doc.addPage({
        size: [CONFIG.cardWidth, CONFIG.cardHeight],
        margin: 0,
      });

      doc.image(backBuffer, 0, 0, {
        width: CONFIG.cardWidth,
        height: CONFIG.cardHeight,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// Gera todas as carteirinhas individuais
async function generateAllCards(members) {
  setupDirectories();

  if (!members || members.length === 0) {
    console.log("Nenhum membro disponível para gerar carteirinhas.");
    return;
  }

  console.log(`Iniciando geração de ${members.length} carteirinhas...`);

  for (const member of members) {
    try {
      console.log(`Processando: ${member.Nome}`);
      const frontBuffer = await generateCardFront(member);
      const backBuffer = await generateCardBack(member);
      const pdfPath = await generatePDF(member, frontBuffer, backBuffer);
      console.log(`Carteirinha gerada: ${pdfPath}`);
    } catch (error) {
      console.error(`Erro ao processar ${member.Nome}:`, error.message);
    }
  }

  console.log("Processo de geração finalizado!");
  return true;
}

// Gera um único PDF com todas as carteirinhas
async function generateBatchPDF(members) {
  setupDirectories();

  if (!members || members.length === 0) {
    console.log("Nenhum membro disponível para gerar PDF em lote.");
    return null;
  }

  console.log(`Iniciando geração de PDF em lote com ${members.length} carteirinhas...`);

  const outputFilename = path.join(CONFIG.outputFolder, "todas_carteirinhas.pdf");

  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [CONFIG.cardWidth, CONFIG.cardHeight],
        margin: 0,
        autoFirstPage: false,
      });

      const stream = fs.createWriteStream(outputFilename);
      stream.on("finish", () => {
        console.log(`PDF em lote gerado: ${outputFilename}`);
        resolve(outputFilename);
      });
      stream.on("error", reject);

      doc.pipe(stream);

      for (const [index, member] of members.entries()) {
        try {
          console.log(`Processando membro ${index + 1}/${members.length}: ${member.Nome}`);
          const frontBuffer = await generateCardFront(member);
          const backBuffer = await generateCardBack(member);

          doc.addPage({ size: [CONFIG.cardWidth, CONFIG.cardHeight], margin: 0 });
          doc.image(frontBuffer, 0, 0, { width: CONFIG.cardWidth, height: CONFIG.cardHeight });

          doc.addPage({ size: [CONFIG.cardWidth, CONFIG.cardHeight], margin: 0 });
          doc.image(backBuffer, 0, 0, { width: CONFIG.cardWidth, height: CONFIG.cardHeight });
        } catch (error) {
          console.error(`Erro ao processar ${member.Nome}:`, error.message);
        }
      }

      doc.end();
    } catch (error) {
      console.error("Erro ao gerar PDF em lote:", error.message);
      reject(error);
    }
  });
}

// Funções auxiliares

function formatDate(excelDate) {
  if (!excelDate) return "Não informado";
  if (typeof excelDate === "string") return excelDate;

  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return date.toLocaleDateString("pt-BR");
}

// Exporta para uso no app.js
module.exports = {
  generateAllCards,
  generateBatchPDF,
};

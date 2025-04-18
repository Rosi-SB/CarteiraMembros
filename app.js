// app.js - Servidor Express para interface web

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const XLSX = require("xlsx");
const { generateAllCards, generateBatchPDF } = require("./cardGenerator");

const app = express();
const port = 3000;

// Variável global para armazenar membros
let members = [];

// Configurações do Express
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads";

    if (file.fieldname === "excel") {
      uploadPath = "./";
    } else if (file.fieldname === "template") {
      uploadPath = "./templates";
    } else if (file.fieldname === "photos") {
      uploadPath = "./fotos";
    }

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    if (file.fieldname === "excel") {
      cb(null, "SEDE-Cadastro-Membros.xlsx");
    } else if (
      file.fieldname === "template" &&
      file.originalname.includes("Frente")
    ) {
      cb(null, "Frente.png");
    } else if (
      file.fieldname === "template" &&
      file.originalname.includes("Verso")
    ) {
      cb(null, "Verso.png");
    } else {
      cb(null, file.originalname);
    }
  },
});

const upload = multer({ storage });

// Rota principal - página inicial
app.get("/", (req, res) => {
  const templatesExist = {
    front: fs.existsSync("./templates/Frente.png"),
    back: fs.existsSync("./templates/Verso.png"),
  };

  const photosExist =
    fs.existsSync("./fotos") && fs.readdirSync("./fotos").length > 0;

  const cardsExist =
    fs.existsSync("./carteirinhas") &&
    fs.readdirSync("./carteirinhas").length > 0;
  const cardsCount = cardsExist ? fs.readdirSync("./carteirinhas").length : 0;

  const batchPdfExists = fs.existsSync("./carteirinhas/todas_carteirinhas.pdf");

  res.render("index", {
    members,
    templatesExist,
    photosExist,
    cardsExist,
    cardsCount,
    batchPdfExists,
  });
});

// Upload da planilha Excel
app.post("/upload-excel", upload.single("excel"), (req, res) => {
  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);

    members = data.map((m) => ({
      Nome: m["Nome"]?.trim(),
      CPF: m["CPF"]?.toString().trim(),
      Funcao: m["Funcao"]?.trim() || "Membro",
      DataNascimento: m["DataNascimento"]?.trim(),
      Congregacao: m["Congregacao"]?.trim(),
      Batismo: m["DataBatismo"]?.trim(),
      Validade: m["Validade"]?.trim(),
    }));

    console.log(`✅ ${members.length} membros carregados com sucesso!`);
    res.redirect("/");
  } catch (error) {
    console.error("Erro ao carregar dados da planilha:", error.message);
    res.send("Erro ao processar a planilha.");
  }
});

// Upload de templates
app.post("/upload-templates", upload.array("template", 2), (req, res) => {
  res.redirect("/");
});

// Upload de fotos
app.post("/upload-photos", upload.array("photos", 100), (req, res) => {
  res.redirect("/");
});

// Gerar carteirinhas individuais
app.post("/generate-cards", async (req, res) => {
  try {
    await generateAllCards(members); // Passe os membros para a função
    res.redirect("/");
  } catch (error) {
    console.error("Erro ao gerar carteirinhas:", error.message);
    res.status(500).send(`Erro ao gerar carteirinhas: ${error.message}`);
  }
});

// Gerar PDF em lote
app.post("/generate-batch", async (req, res) => {
  try {
    await generateBatchPDF(members);
    res.redirect("/");
  } catch (error) {
    console.error("Erro ao gerar PDF em lote:", error.message);
    res.status(500).send(`Erro ao gerar PDF em lote: ${error.message}`);
  }
});

// Download do PDF em lote
app.get("/download-batch", (req, res) => {
  const batchFilePath = path.join(
    __dirname,
    "carteirinhas",
    "todas_carteirinhas.pdf"
  );
  res.download(batchFilePath);
});

// Resetar arquivos
app.post("/reset", (req, res) => {
  const pathsToClean = [
    "./SEDE-Cadastro-Membros.xlsx",
    "./templates/Frente.png",
    "./templates/Verso.png",
    "./fotos",
    "./carteirinhas",
  ];

  members = []; // Limpar a lista de membros também

  pathsToClean.forEach((p) => {
    if (fs.existsSync(p)) {
      const stat = fs.lstatSync(p);
      if (stat.isDirectory()) {
        fs.readdirSync(p).forEach((file) => {
          fs.unlinkSync(path.join(p, file));
        });
        console.log(`Limpou o diretório: ${p}`);
      } else {
        fs.unlinkSync(p);
        console.log(`Removeu o arquivo: ${p}`);
      }
    }
  });

  res.redirect("/");
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

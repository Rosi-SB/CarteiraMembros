# Usa imagem base com Node.js 18
FROM node:18

# Instala as dependências de sistema necessárias para o canvas
RUN apt-get update && apt-get install -y \
  libcairo2-dev \
  libjpeg-dev \
  libpango1.0-dev \
  libgif-dev \
  librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

# Cria pasta de trabalho
WORKDIR /app

# Copia os arquivos do projeto
COPY . .

# Instala dependências do projeto
RUN npm install

# Expõe a porta (opcional, o Railway detecta sozinho)
EXPOSE 3000

# Comando para rodar a aplicação
CMD ["npm", "start"]

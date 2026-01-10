# 🎮 Prognóstico

Um jogo de cartas multiplayer estratégico desenvolvido com React, TypeScript e Firebase, inspirado em jogos de previsão de vazas.

## 🎯 Sobre o Jogo

Prognóstico é um jogo de cartas onde os jogadores devem prever quantas rodadas irão vencer em cada partida. A habilidade está em fazer previsões precisas e jogar estrategicamente para alcançá-las!

### Características

- 🌐 **Multiplayer Online** - Jogue com amigos em tempo real
- 🎨 **Interface Moderna** - Design inspirado em cartas clássicas
- 🔥 **Tempo Real** - Sincronização instantânea via Firebase
- 🎯 **Sistema de Pontuação** - Ganhe pontos por previsões corretas
- 🏆 **Ranking** - Acompanhe a pontuação de todos os jogadores
- 🎭 **Salas Privadas** - Crie salas com senha para jogar com amigos

## 🛠️ Tecnologias

- **React 19** - Framework UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Firebase Realtime Database** - Sincronização em tempo real
- **Tailwind CSS** - Estilização via CDN
- **Lucide React** - Ícones

## 💻 Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta Firebase (para configurar backend)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/Prognostico.git
cd Prognostico

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Firebase

# Inicie o servidor de desenvolvimento
npm run dev
```

O jogo estará disponível em `http://localhost:3000`

### Configuração do Firebase

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)
2. Ative o Realtime Database
3. Copie as credenciais e configure no arquivo `.env`
4. Configure as regras de segurança do banco de dados conforme necessário

### Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Gera build de produção
npm run preview  # Preview do build de produção
npm run deploy   # Deploy para GitHub Pages
```

## 📦 Deploy

O projeto está configurado para deploy automático no GitHub Pages via GitHub Actions.

1. Configure os Secrets do GitHub com suas variáveis Firebase
2. Faça push para a branch `main`
3. O deploy será automático

Veja [DEPLOY.md](DEPLOY.md) para instruções detalhadas.

## 🎮 Como Jogar

1. **Menu Principal** - Escolha criar uma sala ou entrar em uma existente
2. **Sala de Espera** - Aguarde outros jogadores entrarem
3. **Fazer Previsões** - Aposte quantas rodadas você irá ganhar
4. **Jogar Cartas** - Jogue suas cartas estrategicamente
5. **Pontuação** - Ganhe pontos por previsões corretas!

## 📄 Licença

Este projeto é de código aberto e está disponível sob a licença MIT.

## 🤝 Contribuições

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.

---

Desenvolvido com ❤️ usando React e Firebase

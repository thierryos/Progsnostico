# Prognostico

A multiplayer card game built with React, TypeScript, and Firebase Realtime Database.

## About

Prognostico is an engaging multiplayer card prediction game where players compete in real-time. Built with modern web technologies, it features a retro-inspired interface and smooth multiplayer gameplay.

## Features

- **Real-time Multiplayer**: Connect and play with friends using Firebase Realtime Database
- **Room System**: Create or join game rooms with customizable settings
- **Interactive Gameplay**: Dynamic card mechanics and strategic gameplay
- **Responsive Design**: Optimized for desktop and mobile devices
- **Retro Aesthetic**: Classic pixel art style with modern animations

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Build Tool**: Vite
- **Database**: Firebase Realtime Database
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd Progsnostico
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a `.env` file in the root directory
   - Add your Firebase configuration:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_DATABASE_URL=your_database_url
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Build

To create a production build:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

## Project Structure

```
Progsnostico/
├── components/         # React components
├── services/          # Firebase and game services
├── App.tsx           # Main application component
├── types.ts          # TypeScript type definitions
├── constants.ts      # Game constants and configuration
└── index.tsx         # Application entry point
```

## License

This project is private and proprietary.

## Contributing

This is a private project. If you have suggestions or find issues, please contact the maintainers.

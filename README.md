# Habits Build Tracker 🚀

A modern, science-backed habit and skill tracker built as a Progressive Web Application (PWA).

**Live App:** [https://habits-tracker-app-1fd6d.web.app](https://habits-tracker-app-1fd6d.web.app)

## 🌟 Features

- **Activity Tracking**: Manage daily habits and skills.
- **Focus Timer**: Includes Pomodoro, Stopwatch, and Manual entry modes.
- **Progress Insights**: Visualize your progress with interactive heatmaps and charts.
- **Offline First**: Fully functional offline, utilizing IndexedDB for local data storage.
- **Installable PWA**: Install directly to your home screen on mobile or desktop.
- **Auto-Updating**: Automatically detects and updates to the latest version when deployed.
- **Routine Tasks**: A simple, prioritized to-do list for one-off tasks.
- **Smart Notifications**: In-app reminders if you haven't logged activity for the day.

## 🛠️ Technology Stack

- **Frontend**: Angular 19+ (Standalone Components, Signals, new Control Flow)
- **Styling**: SCSS, Angular Material, Custom CSS Variables (`--ht-*`), Glassmorphism UI
- **Local Storage**: Dexie.js (IndexedDB wrapper)
- **Backend / Cloud**: Firebase Cloud Functions (Node.js) & Firebase Hosting
- **Architecture**: Monorepo structure with separated `@habits-tracker/web`, `@habits-tracker/api`, and `@habits-tracker/shared` packages.

## 💻 Local Development

### Prerequisites
- Node.js (v20 or higher)
- npm (v10 or higher)
- Firebase CLI (`npm install -g firebase-tools`)

### Setup & Run

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start the Application**
   This command automatically builds the shared package, starts the Firebase Functions emulator, and runs the Angular development server concurrently.
   ```bash
   npm start
   ```

3. **View the App**
   Open your browser and navigate to: `http://localhost:4200`

### Build for Production
To build both the shared package and the web application:
```bash
npm run build:all
```

### Deploy
To deploy the application and cloud functions to Firebase:
```bash
npm run deploy
```

## 📄 License
This project is private and intended for personal use.

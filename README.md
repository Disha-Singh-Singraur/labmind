# LabMind — AI Lab Partner

> AI-powered laboratory assistant that guides students through physical experiments step by step.

## What it does

LabMind is a mobile app that:
- Guides students through lab experiments step by step
- Verifies experimental setup using GPT-4o Vision
- Provides context-aware AI assistance during experiments
- Allows instructors to create lab sessions with a join code for their class
- Monitors all students in real time
- Handles checkpoint verification with instructor override system

## Tech Stack

- React Native + Expo (Mobile)
- FastAPI + Python (Backend)
- SQLite (Database)
- OpenAI GPT-4o + GPT-4o Vision (AI)
- JWT Authentication

## Demo

[Insert demo video link here]

## How to run locally

### Backend
```bash
cd labmind-backend
pip install -r requirements.txt
uvicorn main:app --reload
```
API runs at http://localhost:8000

### Frontend
```bash
cd labmind
npm install
npx expo start
```
Scan QR code with Expo Go

### Environment Variables

**Backend (`.env`):**
```
SECRET_KEY=your-secret-key
OPENAI_API_KEY=your-openai-key
USE_REAL_AI=false
DATABASE_URL=sqlite:///./labmind.db
UPLOAD_DIR=./uploads
```

**Frontend (`.env`):**
```
EXPO_PUBLIC_API_URL=http://your-local-ip:8000
```

## Team
Team BitX · Capgemini Buildathon

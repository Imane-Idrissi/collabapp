# CollabApp

Teams waste time turning discussions into tasks. CollabApp flips that — your team chats freely about a project, and when you're ready, AI reads the conversation and drafts the tasks for you. Review, adjust, and add them to your board.

**Live:** [collabapp-rho.vercel.app](https://collabapp-rho.vercel.app)

---

## Features

- Real-time team chat with file attachments (WebSockets)
- AI-powered task extraction from conversations (Google Gemini)
- Kanban board with drag-and-drop
- Project workspaces with invite links
- JWT cookie authentication with email verification

## Tech Stack

**Frontend:** React, TypeScript, Tailwind CSS, Vite
**Backend:** Django, Django REST Framework, Django Channels, Daphne
**Database:** PostgreSQL, Redis
**Services:** Google Gemini, Resend, AWS S3
**Deployment:** Railway (backend) + Vercel (frontend)
**Testing:** pytest, Vitest, React Testing Library, MSW

## Local Setup

```bash
# Backend
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your values
python manage.py migrate
daphne -b 0.0.0.0 -p 8000 config.asgi:application

# Frontend
cd frontend
npm install
npm run dev  # http://localhost:5173
```

## Tests

```bash
cd backend && pytest
cd frontend && npm run test
```

# 🤖 AI Content Engine — Setup Guide for Friends

Transform any document, PDF, image, or text into professional content
(LinkedIn posts, exec summaries, video scripts, and more) using AI.

---

## What You Will Need

Before starting, make sure you have:

| Requirement         | Download / Link                                                  |
|---------------------|------------------------------------------------------------------|
| Python 3.9+         | https://www.python.org/downloads/                               |
| Tesseract OCR       | https://github.com/UB-Mannheim/tesseract/wiki                   |
| Groq API Key (free) | https://console.groq.com/                                       |
| Gmail App Password  | https://myaccount.google.com/apppasswords                        |

---

## Step 1 — Install Python

Download Python 3.9 or higher from https://www.python.org/downloads/

> Windows: tick "Add Python to PATH" during installation.

---

## Step 2 — Install Tesseract OCR

Tesseract lets the app read text from images and PDFs.

**Windows:**
1. Download the installer from https://github.com/UB-Mannheim/tesseract/wiki
2. Run it — tick "Add Tesseract to PATH" during setup
3. Restart your terminal after installing

**Mac:**
```
brew install tesseract
```

**Linux:**
```
sudo apt update && sudo apt install tesseract-ocr
```

Verify it works: open a terminal and run `tesseract --version`

---

## Step 3 — Get a Free Groq API Key

1. Go to https://console.groq.com/ and sign up (free)
2. Click API Keys → Create API Key
3. Copy it — you will need it in Step 5

---

## Step 4 — Get a Gmail App Password

This allows the app to send OTP verification emails from your Gmail.

1. Enable 2-Step Verification: https://myaccount.google.com/security
2. Go to App Passwords: https://myaccount.google.com/apppasswords
3. Select Mail → Windows Computer → Generate
4. Copy the 16-character code shown (e.g. abcd efgh ijkl mnop)

---

## Step 5 — Set Up Your Credentials

Open the file called `.env` in the root of this project folder.
Replace the placeholder values with your real ones:

```
GROQ_API_KEY=paste_your_groq_key_here
SMTP_EMAIL=your_gmail@gmail.com
SMTP_APP_PASSWORD=abcd efgh ijkl mnop
```

> Do NOT add quotes around the values.
> Never share this file or upload it to GitHub.

---

## Step 6 — Install Dependencies

Open a terminal in the `gen-ai-content-engine` folder and run:

**Windows (PowerShell):**
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install fastapi uvicorn groq pypdf pytesseract pillow python-multipart python-dotenv
```

**Mac / Linux:**
```
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn groq pypdf pytesseract pillow python-multipart python-dotenv
```

---

## Step 7 — Start the Backend Server

In the terminal (with .venv activated), go into the backend folder:

**Windows:**
```
cd backend
uvicorn main:app --port 8000 --reload
```

**Mac / Linux:**
```
cd backend
uvicorn main:app --port 8000 --reload
```

You should see this in the terminal:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

Leave this terminal open and running.

---

## Step 8 — Open the Frontend UI

Open a NEW terminal in the `gen-ai-content-engine` folder and run:

**Windows:**
```
python -m http.server 3000 --directory frontend
```

**Mac / Linux:**
```
python3 -m http.server 3000 --directory frontend
```

Then open your browser and go to: http://localhost:3000

---

## How to Use the App

1. Enter your email and click "Send Verification Code"
2. Check your inbox for the 6-digit OTP
3. Enter the OTP to log in
4. Paste any text, or upload a PDF / image / Word doc
5. Choose your output formats:
   - Executive Summary
   - Advisory
   - LinkedIn Post
   - Video Script
   - Presentation
   - Twitter/X Thread
   - FAQ List
6. Set your tone and target audience
7. Click "Transform Content" — wait about 10-20 seconds
8. Copy any result using the copy button on each card

---

## Common Issues

**"Tesseract not found" error**
- Reinstall Tesseract and tick "Add to PATH"
- Restart your terminal after installing
- Run `tesseract --version` to confirm it works

**"Failed to send OTP" error**
- Check SMTP_EMAIL and SMTP_APP_PASSWORD in .env
- Make sure 2-Step Verification is ON for your Gmail
- Use the App Password from Google, not your regular Gmail password

**"AI generation failed" error**
- Check your GROQ_API_KEY in .env is correct
- Try again — Groq occasionally has brief rate limits on the free tier

**Backend port already in use**
```
# Windows — find what is using port 8000 and kill it
netstat -ano | findstr :8000
taskkill /PID <the_PID_shown> /F
```

---

## Project Structure

```
gen-ai-content-engine/
├── backend/
│   └── main.py       (FastAPI backend — AI + email logic)
├── frontend/
│   └── index.html    (Entire frontend UI)
└── README.md         (This file)
```

---

## API Keys Reference

| Service      | Where to get it                             | Cost |
|--------------|---------------------------------------------|------|
| Groq (AI)    | https://console.groq.com/                  | Free |
| Gmail SMTP   | https://myaccount.google.com/apppasswords  | Free |

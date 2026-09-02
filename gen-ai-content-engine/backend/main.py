import os
import re
import secrets
import hashlib
import hmac
import base64
import smtplib
import json
import time
from email.message import EmailMessage
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the workspace root (two levels up from backend/)
_env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=_env_path)
load_dotenv()  # also try local as fallback

from fastapi import FastAPI, UploadFile, Form, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
import pytesseract
from PIL import Image
import io
from groq import Groq

app = FastAPI()
AUTH_SECRET = os.environ.get("AUTH_SECRET")
DEV_AUTH_FALLBACK = os.environ.get("DEV_AUTH_FALLBACK", "false").lower() == "true"
FRONTEND_ORIGINS = [x.strip() for x in os.environ.get("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",") if x.strip()]
if not AUTH_SECRET and not DEV_AUTH_FALLBACK:
    raise RuntimeError("AUTH_SECRET must be configured")

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Development-only store. Replace this repository with Redis for multi-worker production deployments.
otp_store = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 5
RESEND_COOLDOWN_SECONDS = 60
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
SUPPORTED_OUTPUTS = {"Exec Summary", "Advisory", "LinkedIn Post", "Video Script", "Presentation", "Twitter/X Thread", "Infographic"}

# Note: Ensure groq is installed. Tesseract OS binaries must also be installed (e.g., apt-get install tesseract-ocr)
groq_key = os.environ.get("GROQ_API_KEY")
if not groq_key:
    raise RuntimeError("GROQ_API_KEY must be configured")
groq_client = Groq(api_key=groq_key, timeout=30.0, max_retries=2)

def _otp_hash(email, code):
    return hmac.new((AUTH_SECRET or "dev-secret").encode(), f"{email}:{code}".encode(), hashlib.sha256).hexdigest()

def _session_token(email):
    payload = f"{email}:{int(time.time()) + 3600}".encode()
    encoded = base64.urlsafe_b64encode(payload).decode().rstrip("=")
    sig = hmac.new((AUTH_SECRET or "dev-secret").encode(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{sig}"

def _authenticated(request: Request):
    token = request.cookies.get("session")
    if not token or "." not in token: return False
    encoded, signature = token.rsplit(".", 1)
    if not hmac.compare_digest(signature, hmac.new((AUTH_SECRET or "dev-secret").encode(), encoded.encode(), hashlib.sha256).hexdigest()): return False
    try:
        email, expiry = base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)).decode().rsplit(":", 1)
        return bool(email and time.time() < int(expiry))
    except (ValueError, TypeError): return False

# Configure Resend if key exists
resend_api_key = os.environ.get("RESEND_API_KEY")
if resend_api_key:
    try:
        import resend
        resend.api_key = resend_api_key
    except Exception as e:
        print("Resend import error:", e)

class AuthReq(BaseModel):
    email: str
    password: Optional[str] = None
    code: Optional[str] = None

def dispatch_email(recipient_email: str, otp_code: str) -> dict:
    """Dispatches the OTP email via Resend API, Gmail SMTP, or logs to terminal."""
    delivery_method = "terminal_fallback"
    
    # 1. Try Resend API (Recommended for production)
    if os.environ.get("RESEND_API_KEY"):
        try:
            import resend
            from_sender = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
            resend.Emails.send({
                "from": f"Gen AI Engine <{from_sender}>",
                "to": [recipient_email],
                "subject": f"Your Verification Code: {otp_code}",
                "text": f"Your verification code is: {otp_code}\nThis code will expire in 5 minutes.",
                "html": f"""
                <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2>Gen AI Transformation Engine</h2>
                    <p>Your one-time login verification code is:</p>
                    <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #005C4B; padding: 12px 0;">
                        {otp_code}
                    </div>
                    <p style="color: #666; font-size: 13px;">This code is valid for 5 minutes. If you didn't request this, you can ignore this email.</p>
                </div>
                """
            })
            delivery_method = "resend"
            print(f"[EMAIL] Successfully sent OTP via Resend to {recipient_email}")
            return {"status": "sent", "channel": "resend"}
        except Exception as e:
            print("[EMAIL] Resend delivery failed:", e)

    # 2. Try Gmail SMTP
    smtp_email = os.environ.get("SMTP_EMAIL")
    smtp_password = os.environ.get("SMTP_APP_PASSWORD")
    if smtp_email and smtp_password:
        try:
            msg = EmailMessage()
            msg.set_content(f"Your verification code is: {otp_code}\nValid for 5 minutes.")
            msg["Subject"] = f"Your Verification Code: {otp_code}"
            msg["From"] = smtp_email
            msg["To"] = recipient_email
            
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.send_message(msg)
            server.quit()
            delivery_method = "smtp"
            print(f"[EMAIL] Successfully sent OTP via Gmail SMTP to {recipient_email}")
            return {"status": "sent", "channel": "smtp"}
        except Exception as e:
            print("[EMAIL] SMTP delivery failed:", e)
    
    if not DEV_AUTH_FALLBACK:
        return {"status": "unavailable", "channel": "email"}
    # 3. Explicit development-only console fallback
    print(f"\n=======================================================")
    print(f" [LOCAL OTP] Code for {recipient_email} : {otp_code}")
    print(f" (Copy this code to log in immediately)")
    print(f"=======================================================\n")
    return {"status": "sent", "channel": "console"}

@app.post("/auth/send")
@app.post("/api/auth/send")
def send_otp(req: AuthReq, request: Request):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        
    email = req.email.lower().strip()
    now = time.time()
    for key in list(otp_store):
        if otp_store[key].get("expires_at", 0) <= now: del otp_store[key]
    ip_key = f"ip:{request.client.host if request.client else 'unknown'}"
    previous = otp_store.get(email)
    ip_previous = otp_store.get(ip_key)
    if ((previous and now - previous.get("sent_at", 0) < RESEND_COOLDOWN_SECONDS) or
            (ip_previous and now - ip_previous.get("sent_at", 0) < RESEND_COOLDOWN_SECONDS)):
        raise HTTPException(status_code=429, detail="Please wait before requesting another code.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_store[email] = {
        "hash": _otp_hash(email, otp),
        "expires_at": time.time() + OTP_EXPIRY_SECONDS
        , "attempts": 0, "sent_at": now
    }
    otp_store[ip_key] = {"sent_at": now, "expires_at": now + RESEND_COOLDOWN_SECONDS}
    dispatch_email(email, otp)
    return {"status": "sent", "message": "If the address is eligible, a verification code has been sent."}

@app.post("/auth/verify")
@app.post("/api/auth/verify")
def verify_otp(req: AuthReq, response: Response):
    email = req.email.lower().strip() if req.email else ""
    user_entry = otp_store.get(email)
    
    if not user_entry:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        
    # Check expiry (5 min)
    if time.time() > user_entry["expires_at"]:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        
    user_entry["attempts"] += 1
    valid = hmac.compare_digest(user_entry["hash"], _otp_hash(email, str(req.code or "").strip()))
    if valid:
        del otp_store[email]
        response.set_cookie("session", _session_token(email), httponly=True, secure=not DEV_AUTH_FALLBACK, samesite="lax", max_age=3600)
        return {"authenticated": True, "email": email}
    if user_entry["attempts"] >= OTP_MAX_ATTEMPTS: del otp_store[email]
    raise HTTPException(status_code=400, detail="Invalid or expired verification code.")

@app.post("/auth/logout")
@app.post("/api/auth/logout")
def logout(response: Response):
    response.delete_cookie("session")
    return {"authenticated": False}

@app.post("/transform")
@app.post("/api/transform")
async def transform_content(
    request: Request,
    file: Optional[UploadFile] = None,
    text: Optional[str] = Form(""),
    outputs: Optional[str] = Form("[]"),
    tone: Optional[str] = Form("Professional"),
    audience: Optional[str] = Form("General")
):
    if not _authenticated(request): raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        out_list = json.loads(outputs or "")
    except (TypeError, json.JSONDecodeError):
        raise HTTPException(status_code=400, detail="outputs must be valid JSON.")
    if not isinstance(out_list, list) or not out_list: raise HTTPException(status_code=400, detail="outputs must be a non-empty JSON array.")
    if any(not isinstance(item, str) or item not in SUPPORTED_OUTPUTS for item in out_list): raise HTTPException(status_code=400, detail="Unsupported output format.")
    extracted_text = ""
    if file:
        content = await file.read()
        if len(content) > MAX_UPLOAD_BYTES: raise HTTPException(status_code=400, detail="File exceeds the 10 MB limit.")
        filename = (file.filename or "").lower()
        if not filename: raise HTTPException(status_code=400, detail="A filename is required.")
        if filename.endswith(".txt"):
            extracted_text = content.decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            try:
                pdf = pypdf.PdfReader(io.BytesIO(content))
                extracted_text = "\n".join(filter(None, [page.extract_text() for page in pdf.pages]))
            except (ValueError, pypdf.errors.PdfReadError, OSError): raise HTTPException(status_code=400, detail="The PDF could not be read.")
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            try:
                img = Image.open(io.BytesIO(content)); img.verify(); img = Image.open(io.BytesIO(content))
                extracted_text = pytesseract.image_to_string(img)
            except (OSError, ValueError): raise HTTPException(status_code=400, detail="The image could not be read.")
        else: raise HTTPException(status_code=400, detail="Unsupported file type.")
            
    combined_text = f"{text}\n\n{extracted_text}".strip()
    
    if not combined_text:
        raise HTTPException(status_code=400, detail="No input text or document provided.")
        
    combined_text = combined_text[:100_000]
    
    system_prompt = """You are an elite, world-class Content Strategist and Executive Communications Specialist.
Your objective is to transform the user's input text into comprehensive, highly detailed, production-grade content for each requested format.

CRITICAL CONTENT QUALITY RULES:
1. PRODUCE RICH, SUBSTANTIAL CONTENT: Never return brief summaries or superficial outlines. Provide full context, background, granular points, tactical takeaways, and detailed explanations.
2. TAILOR ACCORDING TO FORMAT:
   - 'Exec Summary': Comprehensive executive briefing (Context & Background, Core Findings & Metrics, Strategic Implications, Risk Assessment, and 4-6 Detailed Actionable Recommendations).
   - 'Advisory': Formal strategic advisory bulletin (Executive Summary, Threat/Opportunity Matrix, Core Strategic Imperatives, Governance/Tech Guidance, and Step-by-Step Implementation Roadmap).
   - 'LinkedIn Post': High-engagement viral structure (Hook with spacing, storytelling context, bulleted insights with relevant emojis, key lessons, thought-provoking closing question, and relevant industry hashtags).
   - 'Video Script': Full production-ready script with Scene-by-Scene breakdown, Visual Staging & B-roll cues [Visual: ...], On-screen text cues [Text on screen: ...], and verbatim voiceover audio [Narrator: ...], ending with a strong Call to Action.
   - 'Presentation': Slide-by-slide deck outline (Slide Number, Slide Title, Key Bullet Points, Visual/Graphic Concept, and Verbatim Speaker Script).
   - 'Twitter/X Thread': 5-8 tweet thread numbered (1/X), hook tweet, body breakdown, and recap CTA tweet.
   - 'Infographic': A structured visual-first content breakdown — a punchy Title, 5-7 bold Headline Stats or Key Facts (each with a short 1-sentence explanation), 3-4 visual Section Panels (panel title + 2-3 bullet insights), and a concise Takeaway footer. Format clearly with labels like [TITLE], [STAT], [PANEL], [TAKEAWAY] so it can be handed to a designer.
3. OUTPUT STRICTLY AS A VALID JSON OBJECT where keys are the exact requested format names and values are strings containing the complete, formatted text."""

    user_prompt = f"""Target Formats: {out_list}
Tone: {tone}
Target Audience: {audience}

Source Content to Transform:
{combined_text}

Generate the detailed JSON response now:"""
    
    def extract_json(text: str) -> dict:
        """Try to parse JSON even if the model returned markdown wrappers or extra text."""
        text = text.strip()
        # Strip markdown code fences
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        try:
            return json.loads(text)
        except Exception:
            # Try to extract the outermost {...} block
            match = re.search(r'(\{[\s\S]*\})', text)
            if match:
                return json.loads(match.group(1))
            raise

    # Model cascade: try each in order, with and without json_object mode
    model_attempts = [
        ("openai/gpt-oss-120b", True),
        ("openai/gpt-oss-20b",  True),
        ("openai/gpt-oss-120b", False),  # plain text fallback — extract JSON manually
        ("openai/gpt-oss-20b",  False),
    ]

    last_error = None
    for model_name, use_json_mode in model_attempts:
        try:
            print(f"[Transform] Trying model={model_name}, json_mode={use_json_mode}")
            kwargs = dict(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": user_prompt}
                ],
                model=model_name,
                temperature=0.7,
            )
            if use_json_mode:
                kwargs["response_format"] = {"type": "json_object"}

            completion = groq_client.chat.completions.create(**kwargs)
            result = extract_json(completion.choices[0].message.content)
            # Validate it has at least one requested key
            if any(k in result for k in out_list):
                print(f"[Transform] Success on model={model_name}")
                return result
            else:
                raise ValueError(f"Model returned JSON but with unexpected keys: {list(result.keys())}")
        except Exception as exc:
            print(f"[Transform] Failed model={model_name}, json_mode={use_json_mode}: {exc}")
            last_error = exc
            continue

    raise HTTPException(status_code=502, detail="AI generation is temporarily unavailable.")

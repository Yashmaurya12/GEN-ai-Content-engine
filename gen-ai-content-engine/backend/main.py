import os
import re
import random
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

from fastapi import FastAPI, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
import pytesseract
from PIL import Image
import io
from groq import Groq

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store format: { email: {"code": "123456", "expires_at": timestamp} }
otp_store = {}
OTP_EXPIRY_SECONDS = 300  # 5 minutes

# Note: Ensure groq is installed. Tesseract OS binaries must also be installed (e.g., apt-get install tesseract-ocr)
groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

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
    
    # 3. Development / Local Console Fallback
    print(f"\n=======================================================")
    print(f" [LOCAL OTP] Code for {recipient_email} : {otp_code}")
    print(f" (Copy this code to log in immediately)")
    print(f"=======================================================\n")
    return {"status": "sent", "channel": "console"}

@app.post("/auth/send")
@app.post("/api/auth/send")
def send_otp(req: AuthReq):
    if not req.email or "@" not in req.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
        
    otp = str(random.randint(100000, 999999))
    otp_store[req.email.lower().strip()] = {
        "code": otp,
        "expires_at": time.time() + OTP_EXPIRY_SECONDS
    }
    
    result = dispatch_email(req.email.lower().strip(), otp)
    return result

@app.post("/auth/verify")
@app.post("/api/auth/verify")
def verify_otp(req: AuthReq):
    email = req.email.lower().strip() if req.email else ""
    user_entry = otp_store.get(email)
    
    if not user_entry:
        return False
        
    # Check expiry (5 min)
    if time.time() > user_entry["expires_at"]:
        del otp_store[email]
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    if str(user_entry["code"]) == str(req.code).strip():
        del otp_store[email]
        return True
        
    return False

@app.post("/transform")
@app.post("/api/transform")
async def transform_content(
    file: Optional[UploadFile] = None,
    text: Optional[str] = Form(""),
    outputs: Optional[str] = Form("[]"),
    tone: Optional[str] = Form("Professional"),
    audience: Optional[str] = Form("General")
):
    extracted_text = ""
    if file:
        content = await file.read()
        filename = file.filename.lower()
        if filename.endswith(".txt"):
            extracted_text = content.decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            pdf = pypdf.PdfReader(io.BytesIO(content))
            extracted_text = "\n".join([page.extract_text() for page in pdf.pages if page.extract_text()])
        elif filename.endswith((".png", ".jpg", ".jpeg")):
            img = Image.open(io.BytesIO(content))
            extracted_text = pytesseract.image_to_string(img)
            
    combined_text = f"{text}\n\n{extracted_text}".strip()
    
    if not combined_text:
        raise HTTPException(status_code=400, detail="No input text or document provided.")
        
    out_list = json.loads(outputs)
    if not out_list:
        raise HTTPException(status_code=400, detail="No output formats selected.")
    
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

    raise HTTPException(status_code=500, detail=f"AI generation failed after all retries: {str(last_error)}")

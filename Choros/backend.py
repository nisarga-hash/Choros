print("🔥 BACKEND FILE LOADED")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import random
import smtplib
import os
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formatdate

from dotenv import load_dotenv
load_dotenv()

# ================= EMAIL =================
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")

if not SMTP_EMAIL or not SMTP_PASSWORD:
    print("⚠️ SMTP not configured")

# ================= AI =================
try:
    from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
    HAS_TRANSFORMERS = True     
except Exception as e:
    HAS_TRANSFORMERS = False
    print(f"⚠️ Transformers not available: {e}")

from deep_translator import GoogleTranslator
import database as db

# ================= APP =================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= LANGUAGE =================
LANGUAGE_CODES = {
    "English": "en", "Spanish": "es", "French": "fr", "German": "de",
    "Italian": "it", "Portuguese": "pt", "Japanese": "ja", "Chinese": "zh-CN",
    "Korean": "ko", "Russian": "ru", "Arabic": "ar",
    "Hindi": "hi", "Kannada": "kn", "Tamil": "ta", "Telugu": "te",
    "Malayalam": "ml", "Bengali": "bn", "Punjabi": "pa", "Odia": "or", "Urdu": "ur",
}

# ================= SUMMARIZER =================
summarizer = None
summarizer_model = None
summarizer_tokenizer = None

if HAS_TRANSFORMERS:
    try:
        # Load model and tokenizer directly
        MODEL_NAME = "sshleifer/distilbart-cnn-6-6"
        print(f"📥 Downloading {MODEL_NAME}...")
        summarizer_model = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
        summarizer_tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        print("✅ Summarizer loaded successfully")
    except Exception as e:
        print(f"❌ Summarizer failed: {e}")
else:
    print("⚠️ transformers not installed")

# ================= MODELS =================
class SummarizeRequest(BaseModel):
    content: str

class TranslateRequest(BaseModel):
    content: str
    target_lang: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    createdAt: str

class LoginRequest(BaseModel):
    email: str
    password: str

class OtpEmailRequest(BaseModel):
    email: str

class VerifySignupOtpRequest(BaseModel):
    email: str
    otp: str
    password: str
    name: str
    createdAt: str

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    newPassword: str

# ================= TRANSLATE =================
@app.post("/translate")
async def translate(req: TranslateRequest):
    try:
        if not req.content.strip():
            return {"translated": ""}

        lang = LANGUAGE_CODES.get(req.target_lang)
        if not lang:
            return {"error": "Unsupported language"}

        result = GoogleTranslator(source="auto", target=lang).translate(req.content)
        return {"translated": result}

    except Exception as e:
        return {"error": str(e)}

# ================= SUMMARIZE =================
@app.post("/summarize")
async def summarize(req: SummarizeRequest):
    try:
        if not req.content.strip():
            return {"summary": ""}

        if not summarizer_model or not summarizer_tokenizer:
            return {"error": "Summarizer not available"}

        content = req.content[:1000]
        
        # Tokenize input
        inputs = summarizer_tokenizer.encode(content, return_tensors="pt", max_length=1024, truncation=True)
        
        # Calculate lengths
        max_length = max(30, min(150, len(content) // 3))
        max_length = min(max_length, len(content))
        min_length = min(20, max_length - 5)
        
        # Generate summary
        summary_ids = summarizer_model.generate(
            inputs,
            max_length=max_length,
            min_length=min_length,
            do_sample=False,
            num_beams=4,
            length_penalty=2.0
        )
        
        # Decode summary
        summary = summarizer_tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        return {"summary": summary}

    except Exception as e:
        return {"error": str(e)}

# ================= OTP =================
def generate_otp():
    return str(random.randint(100000, 999999))

def send_email(email: str, otp: str):
    if not SMTP_EMAIL:
        print(f"⚠️ DEV OTP for {email}: {otp}")
        return

    # Unique subject per send so Gmail doesn't thread multiple OTPs together
    subject = f"Your Choros Verification Code – {datetime.now().strftime('%H:%M:%S')}"

    # Spaced OTP digits for the big display (e.g. "2 7 6 8 3 6")
    spaced_otp = "  ".join(list(otp))

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Choros Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

          <!-- HEADER GRADIENT BANNER -->
          <tr>
            <td style="background:linear-gradient(135deg,#6c47ff 0%,#a855f7 50%,#ec4899 100%);padding:36px 40px 28px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 18px;margin-bottom:14px;">
                <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px;">✦ Choros</span>
              </div>
              <p style="margin:0;color:rgba(255,255,255,0.85);font-size:15px;font-weight:400;">Your AI-powered productivity companion</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 44px 32px;">
              <h2 style="margin:0 0 8px;color:#f0f0ff;font-size:22px;font-weight:700;">Verify your email address</h2>
              <p style="margin:0 0 28px;color:#8888aa;font-size:15px;line-height:1.6;">
                Use the code below to complete your Choros account setup.
                This code expires in <strong style="color:#a78bfa;">5 minutes</strong>.
              </p>

              <!-- OTP BOX -->
              <div style="background:linear-gradient(135deg,rgba(108,71,255,0.15),rgba(168,85,247,0.12));border:1px solid rgba(108,71,255,0.35);border-radius:16px;padding:30px 20px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;color:#8888aa;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Verification Code</p>
                <p style="margin:0;font-size:42px;font-weight:800;letter-spacing:10px;color:#ffffff;font-family:'Courier New',monospace;">{otp}</p>
              </div>

              <!-- DIVIDER -->
              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 24px;" />

              <!-- SECURITY NOTE -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 18px;">
                    <p style="margin:0;color:#f87171;font-size:13px;line-height:1.5;">
                      🔒 <strong>Never share this code.</strong> Choros will never ask for your OTP via chat, phone, or email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#13131f;padding:20px 44px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;color:#55556a;font-size:12px;line-height:1.6;">
                This email was sent to <strong style="color:#7777aa;">{email}</strong>.<br />
                If you didn't request this, you can safely ignore it.<br />
                &copy; {datetime.now().year} Choros. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Choros <{SMTP_EMAIL}>"
    msg["To"] = email
    msg["Date"] = formatdate(localtime=True)
    # Plain-text fallback
    msg.attach(MIMEText(f"Your Choros verification code is: {otp}\nIt expires in 5 minutes.", "plain"))
    # HTML version (email clients prefer last attachment)
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, email, msg.as_string())

# ================= AUTH =================
@app.post("/api/auth/signup-otp")
async def signup_otp(req: OtpEmailRequest):

    if db.user_exists(req.email):   # 🔥 ADD THIS
        return {"error": "Email already registered"}

    otp = generate_otp()
    db.create_otp(
        req.email,
        otp,
        (datetime.now() + timedelta(minutes=5)).isoformat(),
        "signup"
    )
    send_email(req.email, otp)
    return {"success": True}

@app.post("/api/auth/verify-signup-otp")
async def verify_signup(req: VerifySignupOtpRequest):
    valid, err = db.verify_otp(req.email, req.otp)
    if not valid:
        return {"error": err}

    user = db.signup(req.email, req.password, req.name, req.createdAt)

    if not user:   # 🔥 THIS IS YOUR BUG FIX
        return {"error": "Email already exists"}

    db.delete_otp(req.email)
    return {"success": True,"user": user}

@app.post("/api/auth/request-otp")
async def request_otp(req: OtpEmailRequest):
    otp = generate_otp()
    db.create_otp(req.email,otp,(datetime.now() + timedelta(minutes=5)).isoformat(),"password_reset")
    send_email(req.email, otp)
    return {"success": True}

@app.post("/api/auth/verify-otp")
async def verify_otp(req: VerifyOtpRequest):
    success = db.verify_and_change_password(req.email, req.otp, req.newPassword)
    return {"success": success}

@app.post("/api/signup")
async def signup(req: SignupRequest):
    user = db.signup(req.email, req.password, req.name, req.createdAt)
    return {"user": user} if user else {"error": "Email exists"}

@app.post("/api/login")
async def login(req: LoginRequest):
    user = db.login(req.email, req.password)
    return {"user": user} if user else {"error": "Invalid login"}

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, req: dict):
    return {"user": db.update_user(user_id, req)}

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    db.delete_user(user_id)
    return {"success": True}

# ================= NOTES =================
@app.get("/api/notes/{user_id}")
async def get_notes(user_id: str):
    return {"notes": db.get_notes(user_id)}

@app.post("/api/notes")
async def create_note(req: dict):
    return {"note": db.create_note(req)}

@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, req: dict):
    return {"note": db.update_note(note_id, req)}

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    db.delete_note(note_id)
    return {"success": True}

# ================= TASKS =================
@app.get("/api/tasks/{user_id}")
async def get_tasks(user_id: str):
    return {"tasks": db.get_tasks(user_id)}

@app.post("/api/tasks")
async def create_task(req: dict):
    return {"task": db.create_task(req)}

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: str, req: dict):
    return {"task": db.update_task(task_id, req)}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    db.delete_task(task_id)
    return {"success": True}

# ================= PLANNER =================
@app.get("/api/planner/{user_id}")
async def get_planner(user_id: str):
    return {"items": db.get_planner(user_id)}

@app.post("/api/planner")
async def create_planner(req: dict):
    return {"item": db.create_planner(req)}

@app.put("/api/planner/{item_id}")
async def update_planner(item_id: str, req: dict):
    return {"item": db.update_planner(item_id, req)}

@app.delete("/api/planner/{item_id}")
async def delete_planner(item_id: str):
    db.delete_planner(item_id)
    return {"success": True}

# ================= HEALTH =================
@app.get("/health")
async def health():
    return {"status": "ok"}

# ================= RUN =================
if __name__ == "__main__":
    print("🚀 Starting backend...")
    print(f"Transformers available: {HAS_TRANSFORMERS}")
    print(f"SMTP Enabled: {bool(SMTP_EMAIL)}")

    uvicorn.run(app, host="127.0.0.1", port=8000)
"""
Email service for UWoggle.

Primary provider: SendGrid (recommended - free tier: 100 emails/day)
Fallback: SMTP (Gmail, Outlook, or any SMTP server)

Setup:
  SendGrid: Sign up at https://sendgrid.com → Settings → API Keys → Create API Key (Mail Send)
  SMTP:     Use any SMTP credentials (Gmail app password, Outlook, etc.)
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider selection (set EMAIL_PROVIDER=sendgrid or EMAIL_PROVIDER=smtp)
# ---------------------------------------------------------------------------
EMAIL_PROVIDER = os.environ.get("EMAIL_PROVIDER", "sendgrid").lower()

SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@uwoggle.com")
SENDER_NAME = os.environ.get("SENDER_NAME", "UWoggle")
APP_BASE_URL = os.environ.get("APP_BASE_URL", "http://localhost:3000")


# ---------------------------------------------------------------------------
# HTML email template
# ---------------------------------------------------------------------------
def _build_verification_email(username: str, verification_url: str) -> tuple[str, str]:
    """
    Returns (subject, html_body) for the verification email.
    """
    subject = "Verify your UWoggle account"
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 40px auto; background: #ffffff;
                      border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: #c0392b; padding: 30px; text-align: center; }}
        .header h1 {{ color: #ffffff; margin: 0; font-size: 28px; }}
        .header p  {{ color: #f5b7b1; margin: 4px 0 0; font-size: 14px; }}
        .body {{ padding: 32px 40px; color: #333333; }}
        .body p {{ line-height: 1.6; }}
        .button-wrap {{ text-align: center; margin: 32px 0; }}
        .button {{ background: #c0392b; color: #ffffff; text-decoration: none;
                   padding: 14px 36px; border-radius: 6px; font-size: 16px;
                   font-weight: bold; display: inline-block; }}
        .footer {{ background: #f4f4f4; padding: 20px 40px; font-size: 12px;
                   color: #888888; text-align: center; }}
        .url-fallback {{ word-break: break-all; color: #c0392b; font-size: 13px; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>UWoggle</h1>
          <p>— Unleash Words! —</p>
        </div>
        <div class="body">
          <p>Hi <strong>{username}</strong>,</p>
          <p>Thanks for signing up! Please verify your email address to activate your account
             and start playing.</p>
          <div class="button-wrap">
            <a class="button" href="{verification_url}">Verify Email Address</a>
          </div>
          <p>This link expires in <strong>24 hours</strong>.</p>
          <p>If the button doesn't work, copy and paste this URL into your browser:</p>
          <p class="url-fallback">{verification_url}</p>
          <p>If you didn't create an account, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          &copy; 2025 UWoggle. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """
    return subject, html_body


# ---------------------------------------------------------------------------
# SendGrid sender
# ---------------------------------------------------------------------------
def _send_via_sendgrid(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send email using the SendGrid Web API v3.
    Requires: pip install sendgrid
    Env vars: SENDGRID_API_KEY
    """
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, From, To, Subject, HtmlContent

        api_key = os.environ.get("SENDGRID_API_KEY")
        if not api_key:
            raise EnvironmentError("SENDGRID_API_KEY is not set")

        message = Mail(
            from_email=From(SENDER_EMAIL, SENDER_NAME),
            to_emails=To(to_email),
            subject=Subject(subject),
            html_content=HtmlContent(html_body),
        )

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)

        if response.status_code in (200, 202):
            logger.info("Verification email sent via SendGrid to %s", to_email)
            return True

        logger.error("SendGrid returned status %s", response.status_code)
        return False

    except Exception:
        logger.exception("Failed to send email via SendGrid to %s", to_email)
        return False


# ---------------------------------------------------------------------------
# SMTP sender
# ---------------------------------------------------------------------------
def _send_via_smtp(to_email: str, subject: str, html_body: str) -> bool:
    """
    Send email using SMTP (Gmail, Outlook, or any SMTP provider).

    Env vars:
      SMTP_HOST     - e.g. smtp.gmail.com
      SMTP_PORT     - e.g. 587  (TLS)
      SMTP_USER     - your email / username
      SMTP_PASSWORD - your password or app password
    """
    try:
        smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", 587))
        smtp_user = os.environ.get("SMTP_USER")
        smtp_password = os.environ.get("SMTP_PASSWORD")

        if not smtp_user or not smtp_password:
            raise EnvironmentError("SMTP_USER and SMTP_PASSWORD must be set")

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())

        logger.info("Verification email sent via SMTP to %s", to_email)
        return True

    except Exception:
        logger.exception("Failed to send email via SMTP to %s", to_email)
        return False


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def send_verification_email(username: str, to_email: str, token: str) -> bool:
    """
    Send an account verification email.

    Args:
        username: The new user's display name (used in greeting).
        to_email: Recipient email address.
        token:    The secure verification token to embed in the link.

    Returns:
        True if the email was dispatched successfully, False otherwise.
    """
    verification_url = f"{APP_BASE_URL}/verify-email?token={token}"
    subject, html_body = _build_verification_email(username, verification_url)

    if EMAIL_PROVIDER == "smtp":
        return _send_via_smtp(to_email, subject, html_body)
    return _send_via_sendgrid(to_email, subject, html_body)

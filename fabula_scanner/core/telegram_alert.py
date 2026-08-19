"""Telegram alerting for Fabula Security Scanner.

This module supports:
- Detailed HTML-formatted Critical/High alerts.
- Multiple destinations via TELEGRAM_CHAT_IDS.
- Legacy TELEGRAM_CHAT_ID compatibility.
- JSON and HTML report attachments.
- Secret redaction in Telegram messages and temporary attachment copies.
- CLI use by the CI/CD deployment script without running another scan.
"""

from __future__ import annotations

import argparse
import html
import mimetypes
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Sequence

import requests
import yaml


class TelegramAlert:
    """Send Fabula security alerts and reports to one or more Telegram chats."""

    _secret_pattern = re.compile(
        r"(?ix)"
        r"((?:\"|\b)(?:password|passwd|pass|token|secret|api[_-]?key|"
        r"database[_-]?url|private[_-]?key|access[_-]?key|"
        r"wordpress_db_password|mysql_password|postgres_password)"
        r"(?:\"|\b)\s*[:=]\s*)"
        r"(\"[^\"]*\"|'[^']*'|[^,\s}\n]+)"
    )

    def __init__(self, config_path: str = "config/default.yaml") -> None:
        self.config = self._load_config(config_path)
        telegram_config = self.config.get("telegram", {}) or {}

        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN") or telegram_config.get("bot_token")

        legacy_chat_id = os.getenv("TELEGRAM_CHAT_ID") or telegram_config.get("chat_id")
        self.chat_id = str(legacy_chat_id).strip() if legacy_chat_id else None

        configured_chat_ids = (
            os.getenv("TELEGRAM_CHAT_IDS")
            or telegram_config.get("chat_ids")
        )
        self.chat_ids = self._normalise_chat_ids(configured_chat_ids)
        if not self.chat_ids and self.chat_id:
            self.chat_ids = [self.chat_id]

        thread_id = os.getenv("TELEGRAM_THREAD_ID") or telegram_config.get("thread_id")
        self.thread_id = str(thread_id).strip() if thread_id else None

        self.include_critical = bool(telegram_config.get("include_critical", True))
        self.include_high = bool(telegram_config.get("include_high", True))
        self.include_medium = bool(telegram_config.get("include_medium", False))
        self.include_low = bool(telegram_config.get("include_low", False))
        self.include_info = bool(telegram_config.get("include_info", False))
        self.max_findings = int(telegram_config.get("max_findings_per_message", 10))
        self.send_summary_always = bool(telegram_config.get("send_summary_always", True))
        self.truncate_desc = int(telegram_config.get("truncate_description", 700))
        self.max_message_length = 3900

        self.api_url = (
            f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            if self.bot_token
            else None
        )
        self.api_document = (
            f"https://api.telegram.org/bot{self.bot_token}/sendDocument"
            if self.bot_token
            else None
        )

    @staticmethod
    def _normalise_chat_ids(value: object) -> List[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, (list, tuple)):
            return [str(item).strip() for item in value if str(item).strip()]
        return []

    @staticmethod
    def _load_config(config_path: str) -> Dict:
        try:
            with open(config_path, "r", encoding="utf-8") as handle:
                return yaml.safe_load(handle) or {}
        except FileNotFoundError:
            print(f"⚠️ Config file {config_path} not found. Using defaults.")
            return {}
        except yaml.YAMLError as exc:
            print(f"❌ Error parsing {config_path}: {exc}")
            return {}

    @classmethod
    def redact_secrets(cls, value: object) -> str:
        """Redact common credential values before Telegram delivery."""
        text = str(value or "")
        return cls._secret_pattern.sub(r"\1[REDACTED]", text)

    @classmethod
    def _escape(cls, value: object) -> str:
        return html.escape(cls.redact_secrets(value), quote=False)

    @staticmethod
    def _severity_counts(findings: Sequence[Dict]) -> Dict[str, int]:
        counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "INFO": 0}
        for finding in findings:
            severity = str(finding.get("severity", "INFO")).upper()
            if severity in counts:
                counts[severity] += 1
        return counts

    def _allowed_severities(self) -> set[str]:
        allowed = set()
        if self.include_critical:
            allowed.add("CRITICAL")
        if self.include_high:
            allowed.add("HIGH")
        if self.include_medium:
            allowed.add("MEDIUM")
        if self.include_low:
            allowed.add("LOW")
        if self.include_info:
            allowed.add("INFO")
        return allowed

    def _message_payload(self, chat_id: str, message: str) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if self.thread_id:
            try:
                payload["message_thread_id"] = int(self.thread_id)
            except ValueError:
                print(f"⚠️ Invalid Telegram thread ID: {self.thread_id}")
        return payload

    def _document_payload(self, chat_id: str, caption: str) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "chat_id": chat_id,
            "caption": self._escape(caption),
        }
        if self.thread_id:
            try:
                payload["message_thread_id"] = int(self.thread_id)
            except ValueError:
                pass
        return payload

    def _send_message_to_all(self, message: str) -> bool:
        if not self.api_url or not self.chat_ids:
            print("⚠️ Telegram credentials or destinations are not configured.")
            return False

        success = True
        for chat_id in self.chat_ids:
            try:
                response = requests.post(
                    self.api_url,
                    data=self._message_payload(chat_id, message),
                    timeout=15,
                )
                if response.ok:
                    print(f"✅ Telegram alert sent to {chat_id}")
                else:
                    print(f"❌ Telegram alert failed for {chat_id}: {response.text}")
                    success = False
            except requests.RequestException as exc:
                print(f"❌ Telegram alert failed for {chat_id}: {exc}")
                success = False
        return success

    def _redacted_copy(self, path: Path) -> tuple[Path, str]:
        source = path.read_text(encoding="utf-8", errors="replace")
        redacted = self.redact_secrets(source)
        suffix = path.suffix or ".txt"
        handle = tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=suffix,
            prefix="fabula-telegram-",
            delete=False,
        )
        try:
            handle.write(redacted)
            temporary_path = Path(handle.name)
        finally:
            handle.close()
        return temporary_path, path.name

    def _send_document_to_all(self, path: Optional[str], caption: str) -> bool:
        if not path:
            return True
        report_path = Path(path)
        if not report_path.is_file() or not self.api_document:
            return True

        temporary_path, original_name = self._redacted_copy(report_path)
        success = True
        mime_type = mimetypes.guess_type(original_name)[0] or "application/octet-stream"

        try:
            for chat_id in self.chat_ids:
                try:
                    with temporary_path.open("rb") as handle:
                        response = requests.post(
                            self.api_document,
                            data=self._document_payload(chat_id, caption),
                            files={
                                "document": (
                                    original_name,
                                    handle,
                                    mime_type,
                                )
                            },
                            timeout=45,
                        )
                    if response.ok:
                        print(f"✅ Telegram document sent to {chat_id}: {original_name}")
                    else:
                        print(
                            f"❌ Telegram document failed for {chat_id}: "
                            f"{response.text}"
                        )
                        success = False
                except requests.RequestException as exc:
                    print(f"❌ Telegram document failed for {chat_id}: {exc}")
                    success = False
        finally:
            temporary_path.unlink(missing_ok=True)

        return success

    def _build_message(
        self,
        findings: Sequence[Dict],
        target: str,
        detail_findings: Optional[Sequence[Dict]] = None,
    ) -> str:
        all_findings = list(findings)
        displayed_findings = list(detail_findings or all_findings)
        counts = self._severity_counts(all_findings)
        total = len(all_findings)
        scanned_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        header_icon = "🔴" if counts["CRITICAL"] else ("🟠" if counts["HIGH"] else "🟡")
        thick_line = "━━━━━━━━━━━━━━━━━"
        thin_line = "────────────"

        message = (
            f"{header_icon} <b>FABULA SECURITY SCANNER ALERT</b>\n"
            f"{thick_line}\n"
            f"🎯 <b>Target:</b> <code>{self._escape(target)}</code>\n"
            f"🕒 <b>Scanned At:</b> {scanned_at}\n\n"
            f"📊 <b>Vulnerability Summary:</b>\n"
            f"• 🔴 CRITICAL: {counts['CRITICAL']}\n"
            f"• 🟠 HIGH:     {counts['HIGH']}\n"
            f"• 🟡 MEDIUM:   {counts['MEDIUM']}\n"
            f"• 🔵 LOW:      {counts['LOW']}\n"
            f"• ℹ️ INFO:     {counts['INFO']}\n"
            f"• <b>TOTAL:</b> {total}\n"
            f"{thick_line}\n"
        )

        visible_findings = displayed_findings[: self.max_findings]
        for index, finding in enumerate(visible_findings, 1):
            severity = str(finding.get("severity", "INFO")).upper()
            icon = {
                "CRITICAL": "🔴",
                "HIGH": "🟠",
                "MEDIUM": "🟡",
                "LOW": "🔵",
            }.get(severity, "ℹ️")
            title = self._escape(finding.get("title", "Unknown"))
            module = self._escape(finding.get("module", "Unknown"))
            details = (
                finding.get("description")
                or finding.get("details")
                or finding.get("evidence")
                or "Not provided."
            )
            details = self.redact_secrets(details)
            if self.truncate_desc and len(details) > self.truncate_desc:
                details = details[: self.truncate_desc] + "\n… (truncated; see attached report)"
            remediation = self._escape(
                finding.get("remediation", "Remediation not specified.")
            )
            details_markup = html.escape(str(details), quote=False)
            evidence = finding.get("evidence")
            if evidence:
                evidence_text = self.redact_secrets(evidence)[:2800]
                details_markup += (
                    "\n\n<pre>"
                    + html.escape(evidence_text, quote=False)
                    + "</pre>"
                )

            message += (
                f"{icon} <b>#{index} - {self._escape(severity)}</b>\n"
                f"<b>Title:</b> {title}\n"
                f"<b>Module:</b> {module}\n"
                f"<b>Details:</b> {details_markup}\n"
                f"<b>Remediation:</b> {remediation}\n"
            )
            if index < len(visible_findings):
                message += f"{thin_line}\n"

        if len(displayed_findings) > self.max_findings:
            message += (
                f"… and {len(displayed_findings) - self.max_findings} more findings. "
                "See the attached JSON/HTML reports.\n"
            )

        message += f"{thick_line}\n⚠️ <b>ACTION REQUIRED:</b> Investigate vulnerabilities immediately!"

        if len(message) > self.max_message_length:
            message = message[: self.max_message_length - 70]
            message += "\n… Message shortened; see attached JSON/HTML reports."
        return message

    def send_alert(
        self,
        findings: List[Dict],
        target: str,
        json_path: Optional[str] = None,
        html_path: Optional[str] = None,
    ) -> bool:
        """Send a detailed alert and optional redacted report attachments."""
        if not self.bot_token or not self.chat_ids:
            print("⚠️ Telegram credentials not configured. Skipping alerts.")
            return False

        allowed = self._allowed_severities()
        detail_findings = [
            finding
            for finding in findings
            if str(finding.get("severity", "INFO")).upper() in allowed
        ]
        if not detail_findings:
            if self.send_summary_always:
                return self.send_summary(findings, target)
            return True

        message = self._build_message(findings, target, detail_findings)
        success = self._send_message_to_all(message)
        success = self._send_document_to_all(
            json_path,
            "Fabula JSON security report — sensitive values redacted",
        ) and success
        success = self._send_document_to_all(
            html_path,
            "Fabula HTML security report — sensitive values redacted",
        ) and success
        return success

    def send_summary(self, findings: List[Dict], target: str) -> bool:
        """Send a summary for scans without configured alert-level findings."""
        if not self.bot_token or not self.chat_ids:
            return False

        counts = self._severity_counts(findings)
        total = len(findings)
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        thick_line = "━━━━━━━━━━━━━━━━━"
        message = (
            f"✅ <b>FABULA SECURITY SCANNER SUMMARY</b>\n"
            f"{thick_line}\n"
            f"🎯 <b>Target:</b> <code>{self._escape(target)}</code>\n"
            f"🕒 <b>Scanned At:</b> {timestamp}\n\n"
            f"📊 <b>Vulnerability Summary:</b>\n"
            f"• 🔴 CRITICAL: {counts['CRITICAL']}\n"
            f"• 🟠 HIGH:     {counts['HIGH']}\n"
            f"• 🟡 MEDIUM:   {counts['MEDIUM']}\n"
            f"• 🔵 LOW:      {counts['LOW']}\n"
            f"• ℹ️ INFO:     {counts['INFO']}\n"
            f"• <b>TOTAL:</b> {total}\n"
            f"{thick_line}\n"
            "✅ No Critical or High findings detected."
        )
        return self._send_message_to_all(message)


def send_report_from_file(
    report_path: str,
    html_report_path: Optional[str],
    target: Optional[str],
    config_path: str,
) -> int:
    """Send a saved JSON report without running another scan."""
    with open(report_path, "r", encoding="utf-8") as handle:
        report = yaml.safe_load(handle) if report_path.endswith((".yaml", ".yml")) else None
    if report is None:
        import json

        with open(report_path, "r", encoding="utf-8") as handle:
            report = json.load(handle)

    findings = report.get("findings", [])
    destination = target or report.get("target", "Unknown")
    alert = TelegramAlert(config_path)
    blocking = any(
        str(finding.get("severity", "")).upper() in {"CRITICAL", "HIGH"}
        for finding in findings
    )

    if blocking:
        delivered = alert.send_alert(
            findings,
            destination,
            json_path=report_path,
            html_path=html_report_path,
        )
    else:
        delivered = alert.send_summary(findings, destination)

    return 0 if delivered else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Send a saved Fabula report to Telegram")
    parser.add_argument("--report", required=True, help="Saved JSON report path")
    parser.add_argument("--html-report", help="Saved HTML report path")
    parser.add_argument("--target", help="Target URL override")
    parser.add_argument("--config", default="config/default.yaml")
    args = parser.parse_args()
    return send_report_from_file(args.report, args.html_report, args.target, args.config)


if __name__ == "__main__":
    raise SystemExit(main())

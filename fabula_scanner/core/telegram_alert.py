import requests
import os
import yaml
from datetime import datetime
from typing import List, Dict, Optional
import json

class TelegramAlert:
    def __init__(self, config_path: str = "config/default.yaml"):
        """Initialize Telegram alert with credentials from config file"""
        
        # Load config from YAML
        self.config = self._load_config(config_path)
        
        # Get credentials from config (with fallback to environment variables)
        telegram_config = self.config.get('telegram', {})
        
        self.bot_token = (
            os.getenv('TELEGRAM_BOT_TOKEN') or 
            telegram_config.get('bot_token')
        )
        
        chat_id = (
            os.getenv('TELEGRAM_CHAT_ID') or 
            telegram_config.get('chat_id')
        )
        self.chat_id = str(chat_id).strip() if chat_id else None
        
        thread_id = (
            os.getenv('TELEGRAM_THREAD_ID') or 
            telegram_config.get('thread_id')
        )
        self.thread_id = str(thread_id).strip() if thread_id else None
        
        # Alert settings from config
        self.alert_threshold = telegram_config.get('alert_threshold', 'HIGH')
        self.include_critical = telegram_config.get('include_critical', True)
        self.include_high = telegram_config.get('include_high', True)
        self.include_medium = telegram_config.get('include_medium', False)
        self.include_low = telegram_config.get('include_low', False)
        self.include_info = telegram_config.get('include_info', False)
        self.max_findings = telegram_config.get('max_findings_per_message', 10)
        self.send_summary_always = telegram_config.get('send_summary_always', True)
        self.show_description = telegram_config.get('show_description', True)
        self.show_remediation = telegram_config.get('show_remediation', True)
        self.show_module = telegram_config.get('show_module', True)
        self.truncate_desc = telegram_config.get('truncate_description', 120)
        
        # Build API URL
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage" if self.bot_token else None
        self.api_photo = f"https://api.telegram.org/bot{self.bot_token}/sendPhoto" if self.bot_token else None
        
        # Multiple chat IDs support
        chat_ids = telegram_config.get('chat_ids') or os.getenv('TELEGRAM_CHAT_IDS')
        if chat_ids:
            if isinstance(chat_ids, str):
                self.chat_ids = [cid.strip() for cid in chat_ids.split(',')]
            elif isinstance(chat_ids, list):
                self.chat_ids = chat_ids
            else:
                self.chat_ids = [self.chat_id] if self.chat_id else []
        else:
            self.chat_ids = [self.chat_id] if self.chat_id else []
    
    def _load_config(self, config_path: str) -> Dict:
        """Load YAML configuration file"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            print(f"⚠️ Config file {config_path} not found. Using defaults.")
            return {}
        except yaml.YAMLError as e:
            print(f"❌ Error parsing {config_path}: {e}")
            return {}
    
    def _should_send_alert(self, findings: List[Dict]) -> bool:
        """Check if findings meet alert threshold"""
        if not findings:
            return False
        
        allowed_severities = []
        if self.include_critical:
            allowed_severities.append('CRITICAL')
        if self.include_high:
            allowed_severities.append('HIGH')
        if self.include_medium:
            allowed_severities.append('MEDIUM')
        if self.include_low:
            allowed_severities.append('LOW')
        if self.include_info:
            allowed_severities.append('INFO')
        
        for f in findings:
            sev = f.get('severity', '').upper()
            if sev in allowed_severities:
                return True
        return False

    def send_alert(self, findings: List[Dict], target: str):
        """Send formatted alert to Telegram"""
        
        if not self.bot_token or not self.chat_ids:
            print("⚠️ Telegram credentials not configured. Skipping alerts.")
            return
        
        # Filter findings based on config
        allowed_severities = []
        if self.include_critical: allowed_severities.append('CRITICAL')
        if self.include_high: allowed_severities.append('HIGH')
        if self.include_medium: allowed_severities.append('MEDIUM')
        if self.include_low: allowed_severities.append('LOW')
        if self.include_info: allowed_severities.append('INFO')
        
        filtered = [f for f in findings if f.get('severity', '').upper() in allowed_severities]
        
        if not filtered:
            # Still send summary if configured
            if self.send_summary_always:
                self.send_summary(findings, target)
            return
        
        # Build message
        message = self._build_message(filtered, target)
        
        # Send to all chat IDs
        for chat_id in self.chat_ids:
            if not chat_id:
                continue
            
            payload = {
                'chat_id': chat_id.strip(),
                'text': message,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True
            }
            
            if self.thread_id:
                try:
                    payload['message_thread_id'] = int(self.thread_id)
                except ValueError:
                    print(f"⚠️ Invalid thread_id: {self.thread_id}")
            
            try:
                response = requests.post(self.api_url, data=payload, timeout=10)
                if response.status_code == 200:
                    print(f"✅ Telegram alert sent to {chat_id}")
                else:
                    print(f"❌ Failed to send Telegram alert to {chat_id}: {response.text}")
            except Exception as e:
                print(f"❌ Telegram send failed: {e}")

    def _build_message(self, findings: List[Dict], target: str) -> str:
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        severity_counts = {
            'CRITICAL': len([f for f in findings if f.get('severity', '').upper() == 'CRITICAL']),
            'HIGH': len([f for f in findings if f.get('severity', '').upper() == 'HIGH']),
            'MEDIUM': len([f for f in findings if f.get('severity', '').upper() == 'MEDIUM']),
            'LOW': len([f for f in findings if f.get('severity', '').upper() == 'LOW']),
            'INFO': len([f for f in findings if f.get('severity', '').upper() == 'INFO'])
        }
        total = len(findings)

        thick_line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        thin_line  = "───────────────────────────"

        has_critical = severity_counts['CRITICAL'] > 0
        has_high = severity_counts['HIGH'] > 0

        header_icon = '🔴' if has_critical else ('🟠' if has_high else '🟡')

        message = f"""{header_icon} <b>FABULA SECURITY SCANNER ALERT</b>
 {thick_line}

 🎯 <b>Target:</b> <code>{target}</code>
 🕒 <b>Scanned At:</b> {timestamp}

 📊 <b>Vulnerability Summary:</b>
 • 🔴 CRITICAL: {severity_counts['CRITICAL']}
 • 🟠 HIGH:     {severity_counts['HIGH']}
 • 🟡 MEDIUM:   {severity_counts['MEDIUM']}
 • 🔵 LOW:      {severity_counts['LOW']}
 • ℹ️ INFO:     {severity_counts['INFO']}
 • <b>TOTAL:</b> {total}
 {thick_line}
"""

        for idx, f in enumerate(findings[:self.max_findings], 1):
            severity = f.get('severity', 'INFO').upper()
            severity_icon = '🔴' if severity == 'CRITICAL' else ('🟠' if severity == 'HIGH' else ('🟡' if severity == 'MEDIUM' else ('🔵' if severity == 'LOW' else 'ℹ️')))

            title = f.get('title', 'Unknown')
            module = f.get('module', 'Unknown')

            details_raw = f.get('description', '') or f.get('details', '') or f.get('evidence', '') or ''
            if self.truncate_desc and len(details_raw) > self.truncate_desc:
                details_raw = details_raw[:self.truncate_desc] + '\n... (truncated)'

            remediation_raw = f.get('remediation', 'Remediation not specified.')

            block = f"""
{severity_icon} <b>#{idx} - {severity}</b>
 <b>Title:</b> {title}
 <b>Module:</b> {module}
 <b>Details:</b>
 {details_raw}
 <b>Remediation:</b> {remediation_raw}
 {thin_line}
"""
            message += block

        if len(findings) > self.max_findings:
            message += f"\n... and {len(findings) - self.max_findings} more findings — see full JSON / HTML reports."

        message += f"""
 {thick_line}
 ⚠️ <b>ACTION REQUIRED:</b> Investigate vulnerabilities immediately!"""

        return message

    def _build_inline_keyboard(self) -> Dict:
        """Build inline buttons for quick actions"""
        return {
            'inline_keyboard': [
                [
                    {'text': '📊 View Full Report', 'url': 'https://your-vps-ip/reports/latest.html'},
                    {'text': '📥 Download JSON', 'url': 'https://your-vps-ip/reports/latest.json'}
                ],
                [
                    {'text': '🔄 Re-scan Now', 'callback_data': 'rescan'},
                    {'text': '✅ Acknowledge', 'callback_data': 'acknowledge'}
                ],
                [
                    {'text': '📋 View All Findings', 'callback_data': 'view_all'}
                ]
            ]
        }

    def send_summary(self, findings: List[Dict], target: str):
        """Send a quick summary (for low-severity scans)"""
        if not self.bot_token or not self.chat_ids:
            return

        total = len(findings)

        severity_counts = {
            'CRITICAL': 0,
            'HIGH': 0,
            'MEDIUM': 0,
            'LOW': 0,
            'INFO': 0
        }

        for f in findings:
            sev = f.get('severity', 'info').upper()
            if sev in severity_counts:
                severity_counts[sev] += 1

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        thick_line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

        if total == 0:
            message = f"""✅ <b>FABULA SCANNER — CLEAN</b>
 {thick_line}

 🎯 <b>Target:</b> <code>{target}</code>
 🕒 <b>Scanned At:</b> {timestamp}

 ✅ No vulnerabilities found.
 ✅ Happy scanning! 🎉
"""
        else:
            message = f"""📊 <b>FABULA SCANNER — SUMMARY</b>
 {thick_line}

 🎯 <b>Target:</b> <code>{target}</code>
 🕒 <b>Scanned At:</b> {timestamp}

 📊 <b>Vulnerability Summary:</b>
 • 🔴 CRITICAL: {severity_counts['CRITICAL']}
 • 🟠 HIGH:     {severity_counts['HIGH']}
 • 🟡 MEDIUM:   {severity_counts['MEDIUM']}
 • 🔵 LOW:      {severity_counts['LOW']}
 • ℹ️ INFO:     {severity_counts['INFO']}
 • <b>TOTAL:</b> {total}
"""

        for chat_id in self.chat_ids:
            if not chat_id:
                continue

            payload = {
                'chat_id': chat_id.strip(),
                'text': message,
                'parse_mode': 'HTML',
                'disable_web_page_preview': True,
            }

            if self.thread_id:
                try:
                    payload['message_thread_id'] = int(self.thread_id)
                except ValueError:
                    pass

            try:
                requests.post(self.api_url, data=payload, timeout=10)
                print(f"✅ Telegram summary sent to {chat_id}")
            except Exception as e:
                print(f"❌ Telegram summary failed: {e}")




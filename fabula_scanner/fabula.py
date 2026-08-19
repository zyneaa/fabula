#!/usr/bin/env python3
"""
Fabula Security Scanner – Clean CLI with Rich Dashboard + Telegram Alerts
"""
import sys
import argparse
import json
import yaml
import os
import time
import re
from datetime import datetime
from colorama import Fore, Style, init
init(autoreset=True)

from rich.console import Console
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn, TimeRemainingColumn, SpinnerColumn
from rich.panel import Panel
from rich.layout import Layout
from rich.live import Live
from rich.text import Text

from core.engine import ScanEngine
from core.telegram_alert import TelegramAlert

console = Console()

def load_config(path='config/default.yaml'):
    """Load YAML configuration with fallback"""
    try:
        with open(path, 'r') as f:
            content = f.read()
        
        # Expand environment variables in format ${VAR_NAME}
        def expand_env_vars(match):
            var_name = match.group(1)
            return os.environ.get(var_name, match.group(0))
        
        content = re.sub(r'\$\{([^}]+)\}', expand_env_vars, content)
        
        return yaml.safe_load(content)
    except FileNotFoundError:
        console.print(f"[yellow]⚠️ Config file {path} not found. Using defaults.[/yellow]")
        return {}
    except yaml.YAMLError as e:
        console.print(f"[red]❌ Error parsing {path}: {e}[/red]")
        return {}

def interactive():
    """Interactive mode for target input"""
    target = console.input("[cyan]Enter target URL (e.g., https://example.com): [/cyan]").strip()
    if not target:
        console.print("[red]❌ Target is required.[/red]")
        sys.exit(1)
    return target

def generate_html(results, output_path):
    """Generate HTML dashboard with severity distribution"""
    findings = results.get('findings', [])
    summary = results.get('summary', {})
    target = results.get('target', 'Unknown')
    scan_time = results.get('timestamp', datetime.now().isoformat())

    total = sum(summary.values())

    rows = ''
    for f in findings:
        sev = f.get('severity', 'info').capitalize()
        title = f.get('title', '')
        desc = f.get('description', '')
        rem = f.get('remediation', '')
        rows += f'''<tr>
            <td><span class="badge badge-{sev.lower()}">{sev}</span></td>
            <td><strong>{title}</strong></td>
            <td>{desc}</td>
            <td>{rem or '—'}</td>
        </tr>'''

    colours = {'critical': 'danger', 'high': 'warning', 'medium': 'info', 'low': 'secondary', 'info': 'primary'}
    cards = ''
    for sev, count in summary.items():
        if count == 0:
            continue
        colour = colours.get(sev, 'secondary')
        cards += f'''
        <div class="col-md-3">
            <div class="card text-center mb-3 border-{colour}">
                <div class="card-header bg-{colour} text-white">{sev.upper()}</div>
                <div class="card-body">
                    <h5 class="card-title display-4">{count}</h5>
                </div>
            </div>
        </div>
        '''

    chart_data = f'''
    const ctx = document.getElementById('severityChart').getContext('2d');
    new Chart(ctx, {{
        type: 'doughnut',
        data: {{
            labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
            datasets: [{{
                data: [{summary.get('critical',0)}, {summary.get('high',0)}, {summary.get('medium',0)}, {summary.get('low',0)}, {summary.get('info',0)}],
                backgroundColor: ['#dc3545', '#ffc107', '#17a2b8', '#6c757d', '#007bff'],
                borderWidth: 1
            }}]
        }},
        options: {{
            responsive: true,
            plugins: {{ legend: {{ position: 'bottom' }} }}
        }}
    }});
    '''

    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fabula Security Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {{ background: #f8f9fa; }}
        .badge-critical {{ background: #dc3545; color: white; }}
        .badge-high {{ background: #ffc107; color: black; }}
        .badge-medium {{ background: #17a2b8; color: white; }}
        .badge-low {{ background: #6c757d; color: white; }}
        .badge-info {{ background: #007bff; color: white; }}
        .table-responsive {{ max-height: 70vh; overflow-y: auto; }}
        .footer {{ margin-top: 30px; text-align: center; font-size: 0.9rem; color: #888; }}
        .dark-theme {{ background: #212529; color: #e0e0e0; }}
        .dark-theme .card {{ background: #2c3034; border-color: #444; }}
        .dark-theme .table {{ color: #e0e0e0; }}
        .dark-theme .table-striped > tbody > tr:nth-of-type(odd) > * {{ background-color: #343a40; }}
    </style>
</head>
<body>
<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center">
        <h1 class="display-5">🛡️ Fabula Security Report</h1>
        <div>
            <button class="btn btn-outline-secondary btn-sm" onclick="toggleTheme()">🌙 Toggle Theme</button>
            <button class="btn btn-outline-primary btn-sm" onclick="window.print()">🖨️ Print/PDF</button>
        </div>
    </div>
    <p class="text-muted">Target: <strong>{target}</strong> | Scanned: {scan_time}</p>
    <hr>

    <div class="row mb-4">
        <div class="col-md-3">
            <div class="card text-center border-primary">
                <div class="card-header bg-primary text-white">TOTAL</div>
                <div class="card-body"><h5 class="card-title display-4">{total}</h5></div>
            </div>
        </div>
        {cards}
    </div>

    <div class="row mb-4">
        <div class="col-md-4">
            <div class="card">
                <div class="card-header">Severity Distribution</div>
                <div class="card-body"><canvas id="severityChart" width="200" height="200"></canvas></div>
            </div>
        </div>
        <div class="col-md-8">
            <div class="card">
                <div class="card-header">Findings Overview</div>
                <div class="card-body">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Critical <span class="badge bg-danger rounded-pill">{summary.get('critical',0)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            High <span class="badge bg-warning text-dark rounded-pill">{summary.get('high',0)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Medium <span class="badge bg-info rounded-pill">{summary.get('medium',0)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Low <span class="badge bg-secondary rounded-pill">{summary.get('low',0)}</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Info <span class="badge bg-primary rounded-pill">{summary.get('info',0)}</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="card-header">📋 Vulnerability Details</div>
        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-striped table-hover" id="findingsTable">
                    <thead><tr><th>Severity</th><th>Title</th><th>Description</th><th>Remediation</th></tr></thead>
                    <tbody>{rows}</tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="footer">Generated by Fabula Security Scanner • {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
</div>

<script>
    function toggleTheme() {{
        document.body.classList.toggle('dark-theme');
    }}
    {chart_data}
</script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>'''

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    console.print(f"[green]✅ HTML report saved to: {output_path}[/green]")

def send_telegram_alerts(
    findings: list,
    target: str,
    config_path: str = "config/default.yaml",
    json_path: str | None = None,
    html_path: str | None = None,
):
    """Send a detailed alert or summary after reports have been saved."""
    try:
        telegram = TelegramAlert(config_path)
        config = load_config(config_path)
        telegram_enabled = config.get("telegram", {}).get("enabled", True)

        if not telegram_enabled:
            console.print("[yellow]ℹ️ Telegram alerts disabled in config.[/yellow]")
            return False

        has_high_or_critical = any(
            str(finding.get("severity", "")).upper() in {"HIGH", "CRITICAL"}
            for finding in findings
        )

        if has_high_or_critical:
            delivered = telegram.send_alert(
                findings,
                target,
                json_path=json_path,
                html_path=html_path,
            )
            if delivered:
                console.print(
                    "[red]🚨 HIGH/CRITICAL findings! Telegram alert and reports sent.[/red]"
                )
            else:
                console.print(
                    "[yellow]⚠️ Findings detected, but Telegram delivery was incomplete.[/yellow]"
                )
            return True

        delivered = telegram.send_summary(findings, target)
        if delivered:
            console.print("[green]✅ No HIGH/CRITICAL findings. Telegram summary sent.[/green]")
        else:
            console.print("[yellow]⚠️ Telegram summary delivery was incomplete.[/yellow]")
        return False

    except ImportError:
        console.print("[yellow]⚠️ Telegram module not found. Skipping Telegram alerts.[/yellow]")
    except Exception as exc:
        console.print(f"[yellow]⚠️ Telegram alert failed: {exc}[/yellow]")

    return False

def main():
    parser = argparse.ArgumentParser(description="Fabula Security Scanner")
    parser.add_argument("--target", help="Target URL")
    parser.add_argument("--config", default="config/default.yaml", help="Config file")
    parser.add_argument("--output", default="reports/report", help="Output file base name")
    parser.add_argument("--format", choices=["json", "html", "both"], default="both")
    parser.add_argument("--no-telegram", action="store_true", help="Disable Telegram alerts")
    args = parser.parse_args()

    target = args.target if args.target else interactive()
    os.makedirs(os.path.dirname(args.output) or '.', exist_ok=True)

    config = load_config(args.config)
    config['target_url'] = target

    engine = ScanEngine(target, config)
    results = engine.results
    modules = engine.modules

    # ─── Clean Progress with Rich ──────────────────────────────
    console.print(Panel.fit(
        f"[bold cyan]🛡️ Fabula Security Scanner[/bold cyan]\n"
        f"[white]Target: {target}[/white]",
        border_style="cyan"
    ))

    # Progress bar with clean layout
    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(bar_width=40),
        TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
        TimeRemainingColumn(),
        console=console,
        transient=False,
    ) as progress:
        task = progress.add_task("Initializing...", total=len(modules))

        for module in modules:
            progress.update(task, description=f"▶ {module.name}")
            try:
                findings = module.scan()
                results["findings"].extend(findings)
                for f in findings:
                    sev = f.get("severity", "info")
                    if sev in results["summary"]:
                        results["summary"][sev] += 1
                # Print findings live (without breaking bar)
                for f in findings:
                    sev = f.get('severity', 'info').upper()
                    title = f.get('title', '')
                    desc = f.get('description', '')[:50]
                    console.print(f"  [{sev}] {title} - {desc}...")
            except Exception as e:
                console.print(f"[red]❌ Module {module.name} failed: {e}[/red]")
            progress.advance(task)

    results['timestamp'] = datetime.now().isoformat()
    results['target'] = target

    # ─── Save reports before Telegram delivery ────────────────────
    json_path = None
    html_path = None

    if args.format in ('json', 'both'):
        json_path = f"{args.output}.json"
        with open(json_path, 'w', encoding='utf-8') as handle:
            json.dump(results, handle, indent=2)
        console.print(f"[green]✅ JSON report saved to: {json_path}[/green]")

    if args.format in ('html', 'both'):
        html_path = f"{args.output}.html"
        generate_html(results, html_path)

    # ─── Telegram Alerts after reports exist ───────────────────────
    if not args.no_telegram:
        has_critical = send_telegram_alerts(
            results.get('findings', []),
            target,
            args.config,
            json_path=json_path,
            html_path=html_path,
        )

        if has_critical:
            console.print("[red]❌ Scan contains HIGH/CRITICAL findings.[/red]")
    else:
        console.print("[yellow]ℹ️ Telegram alerts disabled via --no-telegram[/yellow]")

    # ─── Final Summary ────────────────────────────────────────────
    summary = results['summary']
    total = sum(summary.values())
    critical = summary.get('critical', 0)
    high = summary.get('high', 0)

    console.print(f"\n[bold green]✅ Scan complete![/bold green]")
    console.print(f"[yellow]📊 Summary: {total} total findings[/yellow]")
    console.print(f"   🔴 Critical: {critical}")
    console.print(f"   🟠 High: {high}")
    console.print(f"   🟡 Medium: {summary.get('medium', 0)}")
    console.print(f"   🔵 Low: {summary.get('low', 0)}")
    console.print(f"   ℹ️ Info: {summary.get('info', 0)}")

    # Exit with error code if CRITICAL found (for CI/CD)
    # Only CRITICAL vulnerabilities block deployment now
    if critical > 0:
        console.print("[red]🚨 CRITICAL vulnerabilities found! Exiting with error code 1.[/red]")
        console.print("[yellow]⚠️ Review findings and fix before deploying to production.[/yellow]")
        sys.exit(1)
    else:
        console.print("[green]✅ No CRITICAL vulnerabilities. All clear![/green]")
        console.print("[yellow]ℹ️ High/Medium/Low/Info findings are for awareness only - they won't block deployment.[/yellow]")
        sys.exit(0)

if __name__ == "__main__":
    main()




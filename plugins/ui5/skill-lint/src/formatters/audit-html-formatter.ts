/**
 * Audit HTML Formatter
 * Rich HTML reports with charts and styling
 */

import { AuditFormatterBase } from './audit-formatter-base.js';
import { getGradeColor } from './audit-formatter-utils.js';
import type { AuditResult } from '../types/audit-types.js';

export class AuditHtmlFormatter extends AuditFormatterBase {
  readonly name = 'audit-html';
  readonly extension = 'html';

  format(result: AuditResult): string {
    const gradeColor = getGradeColor(result.assessment.grade);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Harness Audit Report: ${this.escapeHtml(result.skill)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5em; margin-bottom: 10px; }
    .header .timestamp { opacity: 0.9; font-size: 0.9em; }
    .content { padding: 40px; }
    .section { margin-bottom: 40px; }
    .section h2 {
      font-size: 1.8em;
      margin-bottom: 20px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .metric-card {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #667eea;
    }
    .metric-card .label {
      font-size: 0.85em;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .metric-card .value {
      font-size: 1.8em;
      font-weight: bold;
      color: #333;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    .stats-table th, .stats-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    .stats-table th {
      background: #f8f9fa;
      font-weight: 600;
      color: #555;
    }
    .stats-table tr:hover { background: #f8f9fa; }
    .grade-badge {
      display: inline-block;
      background: ${gradeColor};
      color: white;
      font-size: 3em;
      font-weight: bold;
      width: 100px;
      height: 100px;
      line-height: 100px;
      text-align: center;
      border-radius: 50%;
      margin: 20px auto;
      display: block;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.9em;
    }
    .status-passed { background: #d4edda; color: #155724; }
    .status-failed { background: #f8d7da; color: #721c24; }
    .issues-list, .recommendations-list {
      list-style: none;
      margin-top: 15px;
    }
    .issues-list li, .recommendations-list li {
      padding: 10px 15px;
      margin-bottom: 10px;
      border-radius: 4px;
      background: #f8f9fa;
    }
    .issues-list li { border-left: 4px solid #dc3545; }
    .recommendations-list li { border-left: 4px solid #17a2b8; }
    .baseline-comparison {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    .baseline-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #e0e0e0;
    }
    .baseline-item:last-child { border-bottom: none; }
    .delta-positive { color: #28a745; }
    .delta-negative { color: #dc3545; }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 Harness Audit Report</h1>
      <h2>${this.escapeHtml(result.skill)}</h2>
      <div class="timestamp">${result.timestamp}</div>
    </div>

    <div class="content">
      <div class="section">
        <h2>📊 Summary</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="label">Iterations</div>
            <div class="value">${result.iterations.length}</div>
          </div>
          <div class="metric-card">
            <div class="label">Total Duration</div>
            <div class="value">${(result.totalDuration / 1000).toFixed(2)}s</div>
          </div>
          <div class="metric-card">
            <div class="label">Total Tests</div>
            <div class="value">${result.aggregated.totalTests}</div>
          </div>
          <div class="metric-card">
            <div class="label">Overall Accuracy</div>
            <div class="value">${result.aggregated.overallAccuracy.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📈 Aggregated Metrics</h2>
        <table class="stats-table">
          <tr>
            <th>Metric</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Passed Tests</td>
            <td>${result.aggregated.totalPassed}</td>
          </tr>
          <tr>
            <td>Failed Tests</td>
            <td>${result.aggregated.totalFailed}</td>
          </tr>
          <tr>
            <td>Total Tokens</td>
            <td>${result.aggregated.totalTokens.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total Cost</td>
            <td>$${result.aggregated.totalCost.toFixed(4)}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>📊 Statistical Analysis</h2>

        <h3>Accuracy</h3>
        <table class="stats-table">
          <tr>
            <th>Statistic</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Mean</td>
            <td>${result.statistics.accuracy.mean.toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Median</td>
            <td>${result.statistics.accuracy.median.toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Std Dev</td>
            <td>${result.statistics.accuracy.stdDev.toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Range</td>
            <td>[${result.statistics.accuracy.min.toFixed(1)}%, ${result.statistics.accuracy.max.toFixed(1)}%]</td>
          </tr>
          ${result.statistics.accuracy.confidenceInterval ? `
          <tr>
            <td>95% CI</td>
            <td>[${result.statistics.accuracy.confidenceInterval[0].toFixed(1)}%, ${result.statistics.accuracy.confidenceInterval[1].toFixed(1)}%]</td>
          </tr>
          ` : ''}
        </table>

        <h3>Latency</h3>
        <table class="stats-table">
          <tr>
            <th>Statistic</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Mean</td>
            <td>${result.statistics.latency.mean.toFixed(0)}ms</td>
          </tr>
          <tr>
            <td>Median</td>
            <td>${result.statistics.latency.median.toFixed(0)}ms</td>
          </tr>
          <tr>
            <td>Std Dev</td>
            <td>${result.statistics.latency.stdDev.toFixed(0)}ms</td>
          </tr>
          <tr>
            <td>Range</td>
            <td>[${result.statistics.latency.min.toFixed(0)}ms, ${result.statistics.latency.max.toFixed(0)}ms]</td>
          </tr>
        </table>

        <h3>Token Usage</h3>
        <table class="stats-table">
          <tr>
            <th>Statistic</th>
            <th>Value</th>
          </tr>
          <tr>
            <td>Mean</td>
            <td>${result.statistics.tokenUsage.mean.toFixed(0)}</td>
          </tr>
          <tr>
            <td>Median</td>
            <td>${result.statistics.tokenUsage.median.toFixed(0)}</td>
          </tr>
          <tr>
            <td>Std Dev</td>
            <td>${result.statistics.tokenUsage.stdDev.toFixed(0)}</td>
          </tr>
          <tr>
            <td>Range</td>
            <td>[${result.statistics.tokenUsage.min.toFixed(0)}, ${result.statistics.tokenUsage.max.toFixed(0)}]</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Quality Assessment</h2>
        <div class="grade-badge">${result.assessment.grade}</div>
        <div style="text-align: center; margin: 20px 0;">
          <div style="font-size: 1.5em; margin-bottom: 10px;">Score: ${result.assessment.score}/100</div>
          <span class="status-badge ${result.assessment.passed ? 'status-passed' : 'status-failed'}">
            ${result.assessment.passed ? '✅ PASSED' : '❌ FAILED'}
          </span>
        </div>

        ${result.assessment.issues.length > 0 ? `
        <h3>❌ Issues</h3>
        <ul class="issues-list">
          ${result.assessment.issues.map(issue => `<li>${this.escapeHtml(issue)}</li>`).join('')}
        </ul>
        ` : ''}

        ${result.assessment.recommendations.length > 0 ? `
        <h3>💡 Recommendations</h3>
        <ul class="recommendations-list">
          ${result.assessment.recommendations.map(rec => `<li>${this.escapeHtml(rec)}</li>`).join('')}
        </ul>
        ` : ''}
      </div>

      ${result.baseline ? `
      <div class="section">
        <h2>📉 Baseline Comparison</h2>
        <div class="baseline-comparison">
          <div class="baseline-item">
            <span>Accuracy</span>
            <span class="${result.baseline.accuracyDelta > 0 ? 'delta-positive' : 'delta-negative'}">
              ${result.baseline.accuracyDelta > 0 ? '📈 +' : '📉 '}${result.baseline.accuracyDelta.toFixed(1)}%
            </span>
          </div>
          <div class="baseline-item">
            <span>Latency</span>
            <span class="${result.baseline.latencyDelta < 0 ? 'delta-positive' : 'delta-negative'}">
              ${result.baseline.latencyDelta < 0 ? '📈 ' : '📉 +'}${result.baseline.latencyDelta.toFixed(0)}ms
            </span>
          </div>
          <div class="baseline-item">
            <span>Tokens</span>
            <span class="${result.baseline.tokenDelta < 0 ? 'delta-positive' : 'delta-negative'}">
              ${result.baseline.tokenDelta < 0 ? '📈 ' : '📉 +'}${result.baseline.tokenDelta.toFixed(0)}
            </span>
          </div>
          <div class="baseline-item">
            <span><strong>Overall</strong></span>
            <span class="${result.baseline.improved ? 'delta-positive' : 'delta-negative'}">
              <strong>${result.baseline.improved ? '✅ IMPROVED' : '⚠️ REGRESSED'}</strong>
            </span>
          </div>
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      Generated by skill-lint audit command
    </div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

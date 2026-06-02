/**
 * Link Validator
 * Checks all links in SKILL.md for validity — relative paths, reference files, anchors,
 * and optionally external URLs.
 *
 * Extracted from StructureValidator.checkLinks() and enhanced with:
 * - broken-relative-link: Relative file path doesn't resolve
 * - broken-reference-link: references/*.md path in SKILL.md but file missing
 * - external-link-unreachable: HTTP HEAD on external URLs (opt-in)
 * - anchor-link-invalid: #heading anchor doesn't match any heading in target
 */

import { access, readFile, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { BaseValidator } from './base-validator.js';
import { REFERENCE_THRESHOLDS } from '../utils/constants.js';
import type { ValidationResult, Violation, Skill, LintConfig } from '../types/index.js';

export class LinkValidator extends BaseValidator {
  readonly name = 'links';
  readonly description = 'Validates relative links, reference file paths, anchors, and external URLs';

  async validate(skill: Skill, config: LintConfig): Promise<ValidationResult> {
    const start = Date.now();
    const violations: Violation[] = [];
    const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links = [...skill.content.matchAll(linkPattern)];

    const checkExternal = config.scenarios.links?.checkExternal ?? false;

    const relativeLinks: Array<{ text: string; url: string }> = [];
    const externalLinks: Array<{ text: string; url: string }> = [];
    const anchorLinks: Array<{ text: string; url: string }> = [];

    for (const [, text, url] of links) {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        externalLinks.push({ text, url });
      } else if (url.startsWith('#')) {
        anchorLinks.push({ text, url });
      } else {
        relativeLinks.push({ text, url });
      }
    }

    // ── Relative links ──
    const relativeResults = await Promise.all(
      relativeLinks.map(link => this.checkRelativeLink(skill, link.url)),
    );
    violations.push(...relativeResults.flat());

    // ── Anchor links ──
    for (const link of anchorLinks) {
      violations.push(...this.checkAnchorLink(skill, link.url));
    }

    // ── External links (opt-in) ──
    if (checkExternal && externalLinks.length > 0) {
      const externalResults = await Promise.all(
        externalLinks.map(link => this.checkExternalLink(link.url)),
      );
      violations.push(...externalResults.flat());
    }

    return this.buildResult(violations, start, {
      relativeLinks: relativeLinks.length,
      externalLinks: externalLinks.length,
      anchorLinks: anchorLinks.length,
    });
  }

  private async checkRelativeLink(skill: Skill, url: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    // Strip anchor from path if present (e.g., "file.md#section")
    const pathPart = url.split('#')[0];
    if (!pathPart) return violations; // Pure anchor link handled elsewhere

    const linkPath = join(dirname(skill.path), pathPart);
    try {
      await access(linkPath, constants.R_OK);
    } catch {
      // Determine if this is a reference file link
      const isRefLink = url.includes('references/') || url.match(/^[^/]+\.md$/);
      const rule = isRefLink ? 'broken-reference-link' : 'broken-relative-link';
      violations.push(this.createViolation('error', rule,
        `Broken ${isRefLink ? 'reference' : 'relative'} link: ${url}`,
        { file: skill.path }));
    }

    // If file resolved and URL has an anchor, validate the anchor
    if (url.includes('#')) {
      const anchor = url.split('#')[1];
      if (anchor) {
        try {
          const content = await readFile(linkPath, 'utf-8');
          violations.push(...this.validateAnchorInContent(content, anchor, url, skill.path));
        } catch {
          // File unreadable — already reported as broken link
        }
      }
    }

    return violations;
  }

  private checkAnchorLink(skill: Skill, url: string): Violation[] {
    const anchor = url.slice(1); // Remove leading #
    if (!anchor) return [];
    return this.validateAnchorInContent(skill.content, anchor, url, skill.path);
  }

  private validateAnchorInContent(content: string, anchor: string, url: string, filePath: string): Violation[] {
    const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)];
    const normalizedAnchor = anchor.toLowerCase();

    // GitHub-style heading anchor normalization:
    // lowercase, replace spaces with hyphens, strip non-alphanumeric (except hyphens)
    const headingAnchors = headings.map(([, text]) =>
      text.trim().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, ''),
    );

    if (!headingAnchors.includes(normalizedAnchor)) {
      return [this.createViolation('warning', 'anchor-link-invalid',
        `Anchor link "${url}" does not match any heading in target`,
        { file: filePath, suggestion: `Available anchors: ${headingAnchors.slice(0, 5).join(', ')}${headingAnchors.length > 5 ? '...' : ''}` })];
    }

    return [];
  }

  private async checkExternalLink(url: string): Promise<Violation[]> {
    const violations: Violation[] = [];
    const timeout = REFERENCE_THRESHOLDS.EXTERNAL_LINK_TIMEOUT_MS;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });
        if (!response.ok) {
          violations.push(this.createViolation('warning', 'external-link-unreachable',
            `External link returned HTTP ${response.status}: ${url}`,
            { suggestion: 'Verify the URL is correct and accessible' }));
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      violations.push(this.createViolation('warning', 'external-link-unreachable',
        `External link unreachable: ${url}`,
        { suggestion: 'Verify the URL is correct and accessible' }));
    }

    return violations;
  }
}

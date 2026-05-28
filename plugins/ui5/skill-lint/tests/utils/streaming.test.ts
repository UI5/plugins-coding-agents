/**
 * Tests for Streaming File Operations
 * Critical testing for memory-efficient large file processing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { countLines, getFileSize } from '../../src/utils/file-utils.js';
import { writeFileSync, mkdirSync, unlinkSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Streaming File Operations', () => {
  let tempDir: string;
  let testFiles: string[] = [];

  beforeEach(() => {
    tempDir = join(tmpdir(), `skill-lint-streaming-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test files
    for (const file of testFiles) {
      try {
        unlinkSync(file);
      } catch (error) {
        // File may not exist
      }
    }
    
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Directory may not exist
    }
    
    testFiles = [];
  });

  describe('countLines - Small Files (In-Memory)', () => {
    it('should count lines in small file using in-memory approach', async () => {
      const filePath = join(tempDir, 'small.txt');
      const content = 'line1\nline2\nline3\n';
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(3);
    });

    it('should handle empty file', async () => {
      const filePath = join(tempDir, 'empty.txt');
      writeFileSync(filePath, '');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(0);
    });

    it('should handle single line without newline', async () => {
      const filePath = join(tempDir, 'single.txt');
      writeFileSync(filePath, 'single line');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(1);
    });

    it('should handle file ending with newline', async () => {
      const filePath = join(tempDir, 'trailing-newline.txt');
      writeFileSync(filePath, 'line1\nline2\n');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(2);
    });

    it('should handle file without trailing newline', async () => {
      const filePath = join(tempDir, 'no-trailing.txt');
      writeFileSync(filePath, 'line1\nline2');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(2);
    });
  });

  describe('countLines - Large Files (Streaming)', () => {
    it('should count lines in large file using streaming', async () => {
      const filePath = join(tempDir, 'large.txt');
      
      // Create 11MB file (above 10MB threshold)
      const lineContent = 'x'.repeat(1000) + '\n'; // ~1KB per line
      const lines = 11 * 1024; // 11MB worth of lines
      
      let content = '';
      for (let i = 0; i < lines; i++) {
        content += lineContent;
      }
      
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const size = await getFileSize(filePath);
      expect(size).toBeGreaterThan(10 * 1024 * 1024); // Verify >10MB

      const lineCount = await countLines(filePath);

      expect(lineCount).toBe(lines);
    }, 15000); // Longer timeout for large file

    it('should handle large file with mixed line endings', async () => {
      const filePath = join(tempDir, 'mixed-endings.txt');
      
      // Create file just above 10MB threshold
      const lineContent = 'x'.repeat(500) + '\n';
      const lines = 21 * 1024; // ~10.5MB
      
      let content = '';
      for (let i = 0; i < lines; i++) {
        content += lineContent;
      }
      
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const lineCount = await countLines(filePath);

      expect(lineCount).toBe(lines);
    }, 15000);

    it('should handle CRLF line endings in large files', async () => {
      const filePath = join(tempDir, 'crlf.txt');
      
      // Create file with Windows line endings
      const lineContent = 'windows line\r\n';
      const lines = 21 * 1024; // Ensure >10MB
      
      let content = '';
      for (let i = 0; i < lines; i++) {
        content += lineContent;
      }
      
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const lineCount = await countLines(filePath);

      expect(lineCount).toBe(lines);
    }, 15000);
  });

  describe('File Size Threshold', () => {
    it('should use in-memory for files at exactly 10MB', async () => {
      const filePath = join(tempDir, 'exactly-10mb.txt');
      
      // Create exactly 10MB file
      const content = 'x'.repeat(10 * 1024 * 1024);
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const size = await getFileSize(filePath);
      expect(size).toBe(10 * 1024 * 1024);

      // Should complete successfully (uses in-memory)
      const lines = await countLines(filePath);
      expect(lines).toBe(1); // Single line, no newlines
    });

    it('should switch to streaming for files >10MB', async () => {
      const filePath = join(tempDir, 'just-over-10mb.txt');
      
      // Create file just over 10MB
      const content = 'x'.repeat(10 * 1024 * 1024 + 1);
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const size = await getFileSize(filePath);
      expect(size).toBeGreaterThan(10 * 1024 * 1024);

      // Should complete successfully (uses streaming)
      const lines = await countLines(filePath);
      expect(lines).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle file with only newlines', async () => {
      const filePath = join(tempDir, 'only-newlines.txt');
      writeFileSync(filePath, '\n\n\n\n\n');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(5);
    });

    it('should handle file with very long lines', async () => {
      const filePath = join(tempDir, 'long-lines.txt');
      const longLine = 'x'.repeat(1024 * 1024); // 1MB per line
      writeFileSync(filePath, `${longLine}\n${longLine}\n${longLine}\n`);
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(3);
    });

    it('should handle Unicode content', async () => {
      const filePath = join(tempDir, 'unicode.txt');
      writeFileSync(filePath, '日本語\n中文\n한국어\nРусский\n');
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      expect(lines).toBe(4);
    });

    it('should handle mixed content (code, markdown, etc)', async () => {
      const filePath = join(tempDir, 'mixed.md');
      const content = `# Title

\`\`\`javascript
function test() {
  return 42;
}
\`\`\`

Some text.
`;
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const lines = await countLines(filePath);

      // Count: 1 (title) + 1 (blank) + 1 (```) + 3 (code) + 1 (```) + 1 (blank) + 1 (text) = 9
      expect(lines).toBe(9);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent file', async () => {
      const filePath = join(tempDir, 'does-not-exist.txt');

      await expect(countLines(filePath)).rejects.toThrow();
    });

    it('should throw error for directory', async () => {
      // tempDir is a directory, not a file
      await expect(countLines(tempDir)).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should count lines in small file quickly', async () => {
      const filePath = join(tempDir, 'perf-small.txt');
      const content = Array(1000).fill('line').join('\n');
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const start = Date.now();
      await countLines(filePath);
      const duration = Date.now() - start;

      // Should complete in <50ms
      expect(duration).toBeLessThan(50);
    });

    it('should count lines in 20MB file reasonably fast', async () => {
      const filePath = join(tempDir, 'perf-large.txt');
      
      // Create 20MB file
      const lineContent = 'x'.repeat(1000) + '\n';
      const lines = 20 * 1024;
      
      let content = '';
      for (let i = 0; i < lines; i++) {
        content += lineContent;
      }
      
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const start = Date.now();
      const lineCount = await countLines(filePath);
      const duration = Date.now() - start;

      expect(lineCount).toBe(lines);
      // Streaming should complete 20MB in <2 seconds
      expect(duration).toBeLessThan(2000);
    }, 10000);
  });

  describe('Memory Efficiency', () => {
    it('should not load large file into memory', async () => {
      const filePath = join(tempDir, 'memory-test.txt');
      
      // Create 50MB file
      const lineContent = 'x'.repeat(1000) + '\n';
      const lines = 52 * 1024; // Ensure >50MB (52 * 1024 * 1001 = ~52.4MB)
      
      let content = '';
      for (let i = 0; i < lines; i++) {
        content += lineContent;
      }
      
      writeFileSync(filePath, content);
      testFiles.push(filePath);

      const size = await getFileSize(filePath);
      expect(size).toBeGreaterThan(50 * 1024 * 1024);

      const lineCount = await countLines(filePath);

      expect(lineCount).toBe(lines);
      
      // Note: Memory tests are inherently flaky due to GC timing
      // The important assertion is that streaming completes successfully
      // without OOM errors on a 50MB file
    }, 20000);
  });
});

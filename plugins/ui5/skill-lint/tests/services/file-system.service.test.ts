/**
 * File System Service Test Suite
 * 
 * Tests the file system abstraction layer used by validators.
 * 
 * Coverage:
 * - NodeFileSystemService real file operations
 * - MockFileSystemService in-memory operations
 * - File existence checking
 * - File reading and writing
 * - Error handling
 * - Path normalization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  NodeFileSystemService,
  MockFileSystemService,
  setGlobalFileSystemService,
  globalFileSystemService,
} from '../../src/services/file-system.service.js';

describe('NodeFileSystemService', () => {
  let tempDir: string;
  let service: NodeFileSystemService;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'fs-service-test-'));
    service = new NodeFileSystemService();
  });

  afterEach(() => {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('exists', () => {
    it('should return true for existing files', () => {
      const filePath = join(tempDir, 'test.txt');
      writeFileSync(filePath, 'test content');

      expect(service.exists(filePath)).toBe(true);
    });

    it('should return false for non-existent files', () => {
      const filePath = join(tempDir, 'nonexistent.txt');

      expect(service.exists(filePath)).toBe(false);
    });

    it('should return true for existing directories', () => {
      expect(service.exists(tempDir)).toBe(true);
    });

    it('should handle errors gracefully', () => {
      // Test with invalid path characters (if applicable to OS)
      expect(service.exists('')).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file contents as UTF-8 string', () => {
      const filePath = join(tempDir, 'test.txt');
      const content = 'Hello, World! 🌍';
      writeFileSync(filePath, content, 'utf-8');

      const result = service.readFile(filePath);

      expect(result).toBe(content);
    });

    it('should throw error for non-existent files', () => {
      const filePath = join(tempDir, 'nonexistent.txt');

      expect(() => service.readFile(filePath)).toThrow();
    });

    it('should read JSON files', () => {
      const filePath = join(tempDir, 'data.json');
      const data = { key: 'value', number: 42 };
      writeFileSync(filePath, JSON.stringify(data), 'utf-8');

      const result = service.readFile(filePath);
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it('should preserve line endings', () => {
      const filePath = join(tempDir, 'multiline.txt');
      const content = 'line1\nline2\r\nline3';
      writeFileSync(filePath, content, 'utf-8');

      const result = service.readFile(filePath);

      expect(result).toBe(content);
    });
  });
});

describe('MockFileSystemService', () => {
  let service: MockFileSystemService;

  beforeEach(() => {
    service = new MockFileSystemService();
  });

  describe('exists', () => {
    it('should return false for files not in mock', () => {
      expect(service.exists('/path/to/file.txt')).toBe(false);
    });

    it('should return true for files added to mock', () => {
      service.setFile('/path/to/file.txt', 'content');

      expect(service.exists('/path/to/file.txt')).toBe(true);
    });

    it('should normalize paths for consistent checks', () => {
      service.setFile('/Path/To/File.txt', 'content');

      // Different case, should still exist
      expect(service.exists('/path/to/file.txt')).toBe(true);
      expect(service.exists('/PATH/TO/FILE.TXT')).toBe(true);
    });

    it('should handle backslashes in paths', () => {
      service.setFile('C:\\Users\\test\\file.txt', 'content');

      // Forward slashes should also work
      expect(service.exists('c:/users/test/file.txt')).toBe(true);
    });
  });

  describe('readFile', () => {
    it('should return file content from mock', () => {
      service.setFile('/test.txt', 'Hello, World!');

      const result = service.readFile('/test.txt');

      expect(result).toBe('Hello, World!');
    });

    it('should throw error for non-existent files', () => {
      expect(() => service.readFile('/nonexistent.txt')).toThrow(/ENOENT/);
    });

    it('should handle JSON content', () => {
      const data = { key: 'value', arr: [1, 2, 3] };
      service.setFile('/data.json', JSON.stringify(data));

      const result = service.readFile('/data.json');
      const parsed = JSON.parse(result);

      expect(parsed).toEqual(data);
    });

    it('should normalize paths when reading', () => {
      service.setFile('/Path/File.txt', 'content');

      const result = service.readFile('/path/file.txt');

      expect(result).toBe('content');
    });
  });

  describe('setFile', () => {
    it('should create new file in mock', () => {
      service.setFile('/new-file.txt', 'new content');

      expect(service.exists('/new-file.txt')).toBe(true);
      expect(service.readFile('/new-file.txt')).toBe('new content');
    });

    it('should overwrite existing file', () => {
      service.setFile('/file.txt', 'old content');
      service.setFile('/file.txt', 'new content');

      expect(service.readFile('/file.txt')).toBe('new content');
    });

    it('should handle empty content', () => {
      service.setFile('/empty.txt', '');

      expect(service.exists('/empty.txt')).toBe(true);
      expect(service.readFile('/empty.txt')).toBe('');
    });
  });

  describe('deleteFile', () => {
    it('should remove file from mock', () => {
      service.setFile('/file.txt', 'content');

      const deleted = service.deleteFile('/file.txt');

      expect(deleted).toBe(true);
      expect(service.exists('/file.txt')).toBe(false);
    });

    it('should return false when deleting non-existent file', () => {
      const deleted = service.deleteFile('/nonexistent.txt');

      expect(deleted).toBe(false);
    });

    it('should normalize paths when deleting', () => {
      service.setFile('/Path/File.txt', 'content');

      const deleted = service.deleteFile('/path/file.txt');

      expect(deleted).toBe(true);
      expect(service.exists('/Path/File.txt')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all files from mock', () => {
      service.setFile('/file1.txt', 'content1');
      service.setFile('/file2.txt', 'content2');
      service.setFile('/file3.txt', 'content3');

      service.clear();

      expect(service.exists('/file1.txt')).toBe(false);
      expect(service.exists('/file2.txt')).toBe(false);
      expect(service.exists('/file3.txt')).toBe(false);
    });

    it('should allow adding files after clear', () => {
      service.setFile('/old.txt', 'old');
      service.clear();
      service.setFile('/new.txt', 'new');

      expect(service.exists('/old.txt')).toBe(false);
      expect(service.exists('/new.txt')).toBe(true);
    });
  });

  describe('listFiles', () => {
    it('should return empty array when no files', () => {
      expect(service.listFiles()).toEqual([]);
    });

    it('should return all file paths', () => {
      service.setFile('/file1.txt', 'content1');
      service.setFile('/dir/file2.txt', 'content2');
      service.setFile('/dir/subdir/file3.txt', 'content3');

      const files = service.listFiles();

      expect(files).toHaveLength(3);
      expect(files).toContain('/file1.txt');
      expect(files).toContain('/dir/file2.txt');
      expect(files).toContain('/dir/subdir/file3.txt');
    });

    it('should return normalized paths', () => {
      service.setFile('/Path/To/File.txt', 'content');

      const files = service.listFiles();

      expect(files[0]).toBe('/path/to/file.txt');
    });
  });
});

describe('Global File System Service', () => {
  let originalService: typeof globalFileSystemService;

  beforeEach(() => {
    originalService = globalFileSystemService;
  });

  afterEach(() => {
    setGlobalFileSystemService(originalService);
  });

  it('should use NodeFileSystemService by default', () => {
    expect(globalFileSystemService).toBeInstanceOf(NodeFileSystemService);
  });

  it('should allow setting a mock service', () => {
    const mockService = new MockFileSystemService();
    setGlobalFileSystemService(mockService);

    expect(globalFileSystemService).toBe(mockService);
  });

  it('should allow switching back to real service', () => {
    const mockService = new MockFileSystemService();
    setGlobalFileSystemService(mockService);

    const realService = new NodeFileSystemService();
    setGlobalFileSystemService(realService);

    expect(globalFileSystemService).toBe(realService);
  });
});

describe('Integration', () => {
  it('should work seamlessly in real and mock scenarios', () => {
    // Mock scenario
    const mockFs = new MockFileSystemService();
    mockFs.setFile('/config.json', '{"key": "value"}');

    expect(mockFs.exists('/config.json')).toBe(true);
    const mockContent = mockFs.readFile('/config.json');
    expect(JSON.parse(mockContent)).toEqual({ key: 'value' });

    // Real scenario
    const tempDir = mkdtempSync(join(tmpdir(), 'fs-integration-'));
    const filePath = join(tempDir, 'config.json');
    writeFileSync(filePath, '{"key": "value"}', 'utf-8');

    const realFs = new NodeFileSystemService();
    expect(realFs.exists(filePath)).toBe(true);
    const realContent = realFs.readFile(filePath);
    expect(JSON.parse(realContent)).toEqual({ key: 'value' });

    // Cleanup
    rmSync(tempDir, { recursive: true, force: true });
  });
});

/**
 * File System Service Abstraction
 * 
 * Provides a testable abstraction over file system operations used by validators.
 * Enables dependency injection and mocking for unit tests without touching the real file system.
 * 
 * @example
 * ```typescript
 * // Production usage
 * const fsService = new NodeFileSystemService();
 * const validator = new TriggeringValidator(fsService);
 * 
 * // Test usage
 * const mockFs = new MockFileSystemService();
 * mockFs.setFile('/test/file.json', '{"test": true}');
 * const validator = new TriggeringValidator(mockFs);
 * ```
 */

/**
 * File system operations interface.
 * 
 * All validators should depend on this interface rather than directly
 * importing from 'fs' module.
 */
export interface FileSystemService {
  /**
   * Check if a file or directory exists at the given path.
   * 
   * @param path - Absolute or relative file path
   * @returns True if file/directory exists, false otherwise
   * 
   * @example
   * ```typescript
   * if (fs.exists('/path/to/file.json')) {
   *   const content = fs.readFile('/path/to/file.json');
   * }
   * ```
   */
  exists(path: string): boolean;

  /**
   * Read file contents as UTF-8 string.
   * 
   * @param path - File path to read
   * @returns File contents as string
   * @throws If file doesn't exist or cannot be read
   * 
   * @example
   * ```typescript
   * try {
   *   const content = fs.readFile('/path/to/config.json');
   *   const config = JSON.parse(content);
   * } catch (error) {
   *   console.error('Failed to read file:', error);
   * }
   * ```
   */
  readFile(path: string): string;
}

/**
 * Real file system implementation using Node.js 'fs' module.
 * 
 * Use this in production code.
 */
export class NodeFileSystemService implements FileSystemService {
  exists(path: string): boolean {
    try {
      const { existsSync } = require('fs');
      return existsSync(path);
    } catch {
      return false;
    }
  }

  readFile(path: string): string {
    const { readFileSync } = require('fs');
    return readFileSync(path, 'utf-8');
  }
}

/**
 * Mock file system implementation for testing.
 * 
 * Simulates file system operations in-memory without touching the real disk.
 * Use this in unit tests to avoid file I/O and enable fast, deterministic tests.
 * 
 * @example
 * ```typescript
 * const mockFs = new MockFileSystemService();
 * mockFs.setFile('/test/data.json', '{"key": "value"}');
 * 
 * expect(mockFs.exists('/test/data.json')).toBe(true);
 * expect(mockFs.readFile('/test/data.json')).toBe('{"key": "value"}');
 * 
 * mockFs.deleteFile('/test/data.json');
 * expect(mockFs.exists('/test/data.json')).toBe(false);
 * ```
 */
export class MockFileSystemService implements FileSystemService {
  private readonly files = new Map<string, string>();

  exists(path: string): boolean {
    return this.files.has(this.normalizePath(path));
  }

  readFile(path: string): string {
    const normalizedPath = this.normalizePath(path);
    const content = this.files.get(normalizedPath);
    
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    }
    
    return content;
  }

  /**
   * Set file content in the mock file system.
   * Creates the file if it doesn't exist, overwrites if it does.
   * 
   * @param path - File path
   * @param content - File content as string
   * 
   * @example
   * ```typescript
   * mockFs.setFile('/test/config.json', '{"debug": true}');
   * ```
   */
  setFile(path: string, content: string): void {
    this.files.set(this.normalizePath(path), content);
  }

  /**
   * Delete a file from the mock file system.
   * 
   * @param path - File path to delete
   * @returns True if file was deleted, false if it didn't exist
   * 
   * @example
   * ```typescript
   * const deleted = mockFs.deleteFile('/test/old-file.json');
   * ```
   */
  deleteFile(path: string): boolean {
    return this.files.delete(this.normalizePath(path));
  }

  /**
   * Clear all files from the mock file system.
   * Useful for resetting state between tests.
   * 
   * @example
   * ```typescript
   * beforeEach(() => {
   *   mockFs.clear();
   * });
   * ```
   */
  clear(): void {
    this.files.clear();
  }

  /**
   * Get all file paths in the mock file system.
   * Useful for debugging tests.
   * 
   * @returns Array of file paths
   * 
   * @example
   * ```typescript
   * const files = mockFs.listFiles();
   * console.log('Mock FS contains:', files);
   * ```
   */
  listFiles(): string[] {
    return Array.from(this.files.keys());
  }

  /**
   * Normalize path for consistent storage (lowercase, forward slashes).
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').toLowerCase();
  }
}

/**
 * Global file system service instance.
 * 
 * By default, uses the real Node.js file system.
 * Can be overridden for testing or custom implementations.
 */
export let globalFileSystemService: FileSystemService = new NodeFileSystemService();

/**
 * Set the global file system service.
 * Use this to inject a mock implementation for testing.
 * 
 * @param service - File system service implementation
 * 
 * @example
 * ```typescript
 * // In test setup
 * const mockFs = new MockFileSystemService();
 * setGlobalFileSystemService(mockFs);
 * 
 * // Run tests...
 * 
 * // In test teardown
 * setGlobalFileSystemService(new NodeFileSystemService());
 * ```
 */
export function setGlobalFileSystemService(service: FileSystemService): void {
  globalFileSystemService = service;
}

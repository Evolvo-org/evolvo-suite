import { readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const providerSdkPackages = [
  'openai',
  'codex',
  '@openai/codex',
  '@anthropic-ai/sdk',
  '@ai-sdk/openai',
  '@ai-sdk/anthropic',
];

const providerImportPattern = new RegExp(
  String.raw`from\s+['\"](?:${providerSdkPackages
    .map((item) => item.replace('/', '\\/'))
    .join('|')})['\"]`,
  'i',
);

const collectSourceFiles = (directoryPath: string): string[] => {
  const entries = readdirSync(directoryPath, {
    recursive: true,
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((filePath) => ['.ts', '.tsx'].includes(extname(filePath)));
};

describe('Web runtime execution boundary', () => {
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
  const packageJson = JSON.parse(
    readFileSync(join(appRoot, 'package.json'), 'utf8'),
  ) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const sourceRoots = [
    join(appRoot, 'src'),
    join(appRoot, 'app'),
  ];
  const sourceFiles = sourceRoots.flatMap(collectSourceFiles);

  it('does not declare provider SDK dependencies in the web package', () => {
    const dependencyNames = new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ]);

    expect([...dependencyNames].filter((name) => providerSdkPackages.includes(name))).toEqual([]);
  });

  it('does not import provider SDKs from web source files', () => {
    const offendingFiles = sourceFiles.filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return providerImportPattern.test(source);
    });

    expect(offendingFiles).toEqual([]);
  });
});
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as ts from 'typescript';

const requireFromHere = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleCache = new Map();

function resolveModulePath(specifier, parentFile) {
  if (specifier.startsWith('@/')) {
    return resolveWithExtensions(path.join(projectRoot, specifier.slice(2)));
  }

  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    return resolveWithExtensions(path.resolve(path.dirname(parentFile), specifier));
  }

  return null;
}

function resolveWithExtensions(basePath) {
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve module path for ${basePath}`);
}

export function loadTsModule(filePath) {
  const absolutePath = path.resolve(projectRoot, filePath);
  return loadResolvedModule(absolutePath);
}

function loadResolvedModule(filePath) {
  if (moduleCache.has(filePath)) {
    return moduleCache.get(filePath).exports;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filePath,
  });

  const module = { exports: {} };
  moduleCache.set(filePath, module);

  const localRequire = (specifier) => {
    const resolvedPath = resolveModulePath(specifier, filePath);
    if (resolvedPath) {
      return loadResolvedModule(resolvedPath);
    }
    return requireFromHere(specifier);
  };

  const script = new vm.Script(
    `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
    { filename: filePath },
  );

  const compiledWrapper = script.runInThisContext();
  compiledWrapper(
    module.exports,
    localRequire,
    module,
    filePath,
    path.dirname(filePath),
  );

  return module.exports;
}

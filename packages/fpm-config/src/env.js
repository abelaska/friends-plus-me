import { basename, join } from 'path';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';

const isDir = fn => (existsSync(fn) && statSync(fn).isDirectory()) || false;
const isFile = (fn, { maxFileSize = -1 } = {}) => {
  if (!existsSync(fn)) {
    return false;
  }
  const stats = statSync(fn);
  if (!stats.isFile()) {
    return false;
  }
  if (maxFileSize > -1) {
    return stats.size <= maxFileSize;
  }
  return true;
};

export const processEnvDir = (fn, { maxDepth = 1, maxValueSize = 8192 } = {}, depth = 0) => {
  if (fn) {
    if (isDir(fn)) {
      if (depth <= maxDepth) {
        readdirSync(fn).forEach(d => processEnvDir(join(fn, d), { maxDepth, maxValueSize }, depth + 1));
      }
    } else if (isFile(fn, { maxFileSize: maxValueSize })) {
      console.log(`Loading env file "${fn}"`);
      process.env[basename(fn)] = readFileSync(fn, 'utf8');
    }
  }
  return process.env;
};

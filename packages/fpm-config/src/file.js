import toml from 'toml';
import { existsSync, readFileSync } from 'fs';

export const nconfFile = fn => (existsSync(fn) && toml.parse(readFileSync(fn, 'utf8'))) || {};

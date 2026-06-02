#!/usr/bin/env node

import { createCLI } from '../src/cli/index.js';

const program = createCLI();
program.parse();

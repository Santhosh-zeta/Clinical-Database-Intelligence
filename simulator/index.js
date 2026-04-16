'use strict';

require('dotenv').config();
const { execSync } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
    return new Promise((resolve) => rl.question(q, resolve));
}

async function main() {
    console.clear();
    console.log(chalk.bold.blue('╔════════════════════════════════════════════════╗'));
    console.log(chalk.bold.blue('║   🏥  Clinical Intelligence — Simulator Menu   ║'));
    console.log(chalk.bold.blue('╚════════════════════════════════════════════════╝'));
    console.log();
    console.log(chalk.white('  1.') + chalk.cyan(' Seed initial data (doctors, patients)'));
    console.log(chalk.white('  2.') + chalk.cyan(' Start vitals simulation (auto-detect admissions)'));
    console.log(chalk.white('  3.') + chalk.cyan(' Start simulation for specific admission IDs'));
    console.log(chalk.white('  4.') + chalk.red(' Exit'));
    console.log();

    const choice = await ask(chalk.yellow('  Choose an option (1-4): '));
    console.log();

    switch (choice.trim()) {
        case '1':
            console.log(chalk.cyan('  Running seeder...\n'));
            rl.close();
            execSync('node seed.js', { stdio: 'inherit' });
            break;

        case '2':
            console.log(chalk.cyan('  Launching simulator (auto-detect)...\n'));
            rl.close();
            execSync('node simulate.js', { stdio: 'inherit' });
            break;

        case '3': {
            const ids = await ask(chalk.yellow('  Enter admission IDs (space-separated, e.g. 1 2 3): '));
            rl.close();
            console.log(chalk.cyan(`  Launching simulator for admissions: ${ids}\n`));
            execSync(`node simulate.js ${ids}`, { stdio: 'inherit' });
            break;
        }

        case '4':
            console.log(chalk.gray('  Goodbye!\n'));
            rl.close();
            break;

        default:
            console.log(chalk.red('  Invalid option. Exiting.\n'));
            rl.close();
    }
}

main().catch(console.error);

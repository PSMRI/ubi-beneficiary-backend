#!/usr/bin/env node

/**
 * Simple Language Constants Unused Keys Checker
 * 
 * This script checks which translation keys are not being used in the codebase.
 * Focused on development needs - simple and fast.
 * 
 * Usage:
 *   npm run check-unused-constants
 *   npm run check-unused-constants -- --cleanup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    I18N_DIR: 'src/i18n',
    SRC_DIR: 'src',
    EXCLUDE_DIRS: ['i18n'],
    LANGUAGES: ['en', 'hi'],
    FILES: ['errors.json', 'success.json']
};

// Colors for console output
const COLORS = {
    RED: '\x1b[31m',
    GREEN: '\x1b[32m',
    YELLOW: '\x1b[33m',
    BLUE: '\x1b[34m',
    CYAN: '\x1b[36m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m'
};

class SimpleLanguageChecker {
    constructor() {
        this.allKeys = new Set();
        this.usedKeys = new Set();
        this.unusedKeys = new Set();
        this.keysByFile = {};
        this.keysByLanguageAndFile = {};
    }

    /**
     * Main execution method
     */
    async run(options = {}) {
        try {
            console.log(this.colorize('BOLD', '🔍 Language Constants Unused Keys Checker\n'));
            
            // Load translation keys from English files only (simpler)
            this.loadTranslationKeys();
            
            // Check usage of each key
            this.checkKeyUsage();
            
            // Show results
            this.showResults();
            
            // Handle cleanup if requested
            if (options.cleanup) {
                await this.performCleanup();
            } else if (this.unusedKeys.size > 0) {
                console.log(this.colorize('YELLOW', '\n💡 To remove unused keys, run: npm run check-unused-constants -- --cleanup'));
            }
            
        } catch (error) {
            console.error(this.colorize('RED', `❌ Error: ${error.message}`));
            process.exit(1);
        }
    }

    /**
     * Load translation keys from all language files
     */
    loadTranslationKeys() {
        console.log(this.colorize('BLUE', '📂 Loading translation keys from all languages...\n'));
        
        CONFIG.LANGUAGES.forEach(language => {
            this.keysByLanguageAndFile[language] = {};
            console.log(this.colorize('CYAN', `📁 Loading ${language.toUpperCase()} files:`));
            
            CONFIG.FILES.forEach(fileName => {
                const filePath = path.join(CONFIG.I18N_DIR, language, fileName);
                
                if (!fs.existsSync(filePath)) {
                    console.warn(this.colorize('YELLOW', `  ⚠️  File not found: ${filePath}`));
                    return;
                }
                
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const keys = Object.keys(content).filter(key => !key.startsWith('_comment'));
                    
                    this.keysByLanguageAndFile[language][fileName] = keys;
                    
                    // Collect all unique keys from all languages for usage checking
                    keys.forEach(key => this.allKeys.add(key));
                    
                    // Keep English as reference for file structure
                    if (language === 'en') {
                        this.keysByFile[fileName] = keys;
                    }
                    
                    console.log(`  📄 ${fileName}: ${keys.length} keys loaded`);
                    
                } catch (error) {
                    console.error(this.colorize('RED', `  ❌ Error reading ${filePath}: ${error.message}`));
                }
            });
            console.log('');
        });
        
        console.log(this.colorize('GREEN', `✅ Total keys loaded: ${this.allKeys.size}\n`));
    }

    /**
     * Check usage of each translation key in the codebase
     */
    checkKeyUsage() {
        console.log(this.colorize('BLUE', '🔎 Checking key usage in codebase...\n'));
        
        const excludePattern = CONFIG.EXCLUDE_DIRS.map(dir => `--exclude-dir=${dir}`).join(' ');
        
        for (const key of this.allKeys) {
            try {
                // Search for the key in the src directory (excluding i18n directory)
                // NOSONAR - Command injection is safe here: key comes from controlled JSON translation files, not user input
                const command = `grep -r "${key}" ${CONFIG.SRC_DIR} ${excludePattern} 2>/dev/null || true`;
                const result = execSync(command, { encoding: 'utf8' }); // NOSONAR
                
                if (result.trim()) {
                    this.usedKeys.add(key);
                } else {
                    this.unusedKeys.add(key);
                }
                
            } catch (error) {
                // If grep returns no results, it throws an error
                this.unusedKeys.add(key);
            }
        }
        
        console.log(this.colorize('GREEN', '✅ Usage check completed\n'));
    }

    /**
     * Show results
     */
    showResults() {
        // Show unused keys by file and language
        if (this.unusedKeys.size > 0) {
            console.log(this.colorize('RED', '🗑️  UNUSED KEYS:\n'));
            
            CONFIG.LANGUAGES.forEach(language => {
                let hasUnusedInLanguage = false;
                
                CONFIG.FILES.forEach(fileName => {
                    const fileKeys = this.keysByLanguageAndFile[language]?.[fileName] || [];
                    const unusedInFile = fileKeys.filter(key => this.unusedKeys.has(key));
                    
                    if (unusedInFile.length > 0) {
                        if (!hasUnusedInLanguage) {
                            console.log(this.colorize('CYAN', `🌐 ${language.toUpperCase()} files:`));
                            hasUnusedInLanguage = true;
                        }
                        console.log(this.colorize('YELLOW', `  📄 ${fileName} (${unusedInFile.length} unused):`));
                        unusedInFile.sort().forEach(key => {
                            console.log(`     - ${key}`);
                        });
                    }
                });
                
                if (hasUnusedInLanguage) {
                    console.log('');
                }
            });
        } else {
            console.log(this.colorize('GREEN', '✅ No unused keys found!\n'));
        }
        
        // Simple stats
        console.log(this.colorize('BOLD', '📊 SUMMARY:'));
        console.log(`Total Keys: ${this.allKeys.size}`);
        console.log(this.colorize('GREEN', `Used: ${this.usedKeys.size}`));
        console.log(this.colorize('RED', `Unused: ${this.unusedKeys.size}`));
        
        if (this.unusedKeys.size > 0) {
            const wastePercentage = ((this.unusedKeys.size / this.allKeys.size) * 100).toFixed(1);
            console.log(this.colorize('YELLOW', `Cleanup potential: ${wastePercentage}%`));
        }
    }

    /**
     * Perform cleanup by removing unused keys from all language files
     */
    async performCleanup() {
        if (this.unusedKeys.size === 0) {
            console.log(this.colorize('GREEN', '\n✅ No cleanup needed - all keys are used!'));
            return;
        }
        
        console.log(this.colorize('YELLOW', `\n🧹 Cleaning up ${this.unusedKeys.size} unused keys from all language files...\n`));
        
        CONFIG.LANGUAGES.forEach(lang => {
            CONFIG.FILES.forEach(fileName => {
                const filePath = path.join(CONFIG.I18N_DIR, lang, fileName);
                
                if (!fs.existsSync(filePath)) {
                    console.warn(this.colorize('YELLOW', `⚠️  File not found: ${filePath}`));
                    return;
                }
                
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    let removedCount = 0;
                    
                    // Remove unused keys
                    this.unusedKeys.forEach(key => {
                        if (content[key]) {
                            delete content[key];
                            removedCount++;
                        }
                    });
                    
                    // Write back the cleaned file
                    fs.writeFileSync(filePath, JSON.stringify(content, null, 4));
                    console.log(this.colorize('GREEN', `✓ ${lang}/${fileName}: ${removedCount} keys removed`));
                    
                } catch (error) {
                    console.error(this.colorize('RED', `❌ Error cleaning ${filePath}: ${error.message}`));
                }
            });
        });
        
        console.log(this.colorize('GREEN', `\n🎉 Cleanup completed! Removed ${this.unusedKeys.size} unused keys.`));
    }

    /**
     * Colorize console output
     */
    colorize(color, text) {
        return `${COLORS[color]}${text}${COLORS.RESET}`;
    }

    /**
     * Show help information
     */
    static showHelp() {
        console.log(`
${COLORS.BOLD}Simple Language Constants Unused Keys Checker${COLORS.RESET}

${COLORS.CYAN}DESCRIPTION:${COLORS.RESET}
  Simple tool to find unused translation keys in your codebase.
  Focused on development needs - fast and straightforward.

${COLORS.CYAN}USAGE:${COLORS.RESET}
  npm run check-unused-constants                    # Check for unused keys
  npm run check-unused-constants -- --cleanup      # Remove unused keys
  npm run check-unused-constants -- --help         # Show this help

${COLORS.CYAN}EXAMPLES:${COLORS.RESET}
  # Check for unused keys
  npm run check-unused-constants

  # Clean up unused keys from all language files
  npm run check-unused-constants -- --cleanup

${COLORS.YELLOW}⚠️  WARNING:${COLORS.RESET}
  The --cleanup option will permanently remove unused keys from ALL language files.
  Make sure to commit your changes before running cleanup.
`);
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.includes('-h')) {
        SimpleLanguageChecker.showHelp();
        process.exit(0);
    }
    
    const options = {
        cleanup: args.includes('--cleanup')
    };
    
    const checker = new SimpleLanguageChecker();
    checker.run(options).catch(error => {
        console.error(`${COLORS.RED}❌ Fatal error: ${error.message}${COLORS.RESET}`);
        process.exit(1);
    });
}

module.exports = SimpleLanguageChecker;
#!/usr/bin/env node

/**
 * Smart Commit Message Generator
 * ==============================
 * Analyzes git changes and suggests appropriate commit messages
 * following Conventional Commits specification.
 *
 * Usage:
 *   node scripts/smart-commit.js           # Analyze and suggest
 *   node scripts/smart-commit.js --commit  # Analyze and commit directly
 *   node scripts/smart-commit.js --staged  # Only analyze staged files
 */

const { execSync } = require('child_process');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Commit types with priorities (lower = higher priority)
  types: {
    feat: { priority: 1, emoji: '✨', description: 'New feature' },
    fix: { priority: 2, emoji: '🐛', description: 'Bug fix' },
    refactor: { priority: 3, emoji: '♻️', description: 'Code refactoring' },
    perf: { priority: 4, emoji: '⚡', description: 'Performance improvement' },
    docs: { priority: 5, emoji: '📚', description: 'Documentation' },
    style: { priority: 6, emoji: '💄', description: 'Code style/formatting' },
    test: { priority: 7, emoji: '✅', description: 'Tests' },
    build: { priority: 8, emoji: '📦', description: 'Build system' },
    ci: { priority: 9, emoji: '🔧', description: 'CI/CD' },
    chore: { priority: 10, emoji: '🔨', description: 'Maintenance' },
  },

  // File patterns to detect change types
  patterns: {
    // Features - new functionality
    feat: [
      /new\s+(class|function|method|interface|type|enum)/i,
      /export\s+(class|function|const|interface)/,
      /added?\s+new/i,
      /implement/i,
    ],
    // Bug fixes
    fix: [
      /fix(ed|es|ing)?/i,
      /bug/i,
      /patch/i,
      /correct(ed|ion)?/i,
      /resolv(e|ed|ing)/i,
    ],
    // Refactoring
    refactor: [
      /refactor/i,
      /restructur/i,
      /reorganiz/i,
      /clean(ed|ing|up)?/i,
      /simplif/i,
      /extract(ed|ing)?/i,
      /mov(e|ed|ing)/i,
      /renam(e|ed|ing)/i,
    ],
    // Performance
    perf: [
      /perf(ormance)?/i,
      /optimi[zs]/i,
      /speed/i,
      /fast(er)?/i,
      /cach(e|ing)/i,
      /memo(iz)?/i,
    ],
  },

  // Directory-based scope detection
  scopes: {
    'src/app/modules/': (path) => path.split('/')[3], // Extract module name
    'src/app/builder/': () => 'builder',
    'src/app/logging/': () => 'logging',
    'src/app/middlewares/': () => 'middleware',
    'src/helpers/': () => 'helpers',
    'scripts/': () => 'scripts',
    'tests/': () => 'test',
    'doc/': () => 'docs',
  },

  // File type significance
  fileTypes: {
    '.ts': { weight: 3, category: 'source' },
    '.tsx': { weight: 3, category: 'source' },
    '.js': { weight: 2, category: 'source' },
    '.json': { weight: 1, category: 'config' },
    '.md': { weight: 1, category: 'docs' },
    '.yml': { weight: 1, category: 'config' },
    '.yaml': { weight: 1, category: 'config' },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Git Operations
// ═══════════════════════════════════════════════════════════════════════════════

function runGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return '';
  }
}

function getChangedFiles(stagedOnly = false) {
  const diffCommand = stagedOnly
    ? 'diff --cached --name-status'
    : 'diff --name-status HEAD';

  const output = runGit(diffCommand);
  if (!output) return [];

  return output.split('\n').map(line => {
    const [status, ...pathParts] = line.split('\t');
    const path = pathParts.join('\t'); // Handle paths with tabs
    return {
      status: status[0], // M, A, D, R, etc.
      path,
      isNew: status === 'A',
      isDeleted: status === 'D',
      isModified: status === 'M',
      isRenamed: status.startsWith('R'),
    };
  }).filter(f => f.path);
}

function getFileDiff(filePath, stagedOnly = false) {
  const cached = stagedOnly ? '--cached' : '';
  return runGit(`diff ${cached} -- "${filePath}"`);
}

function getRecentCommits(count = 5) {
  const log = runGit(`log --oneline -${count}`);
  return log.split('\n').filter(Boolean);
}

function getUntrackedFiles() {
  const output = runGit('ls-files --others --exclude-standard');
  return output ? output.split('\n').filter(Boolean) : [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Analysis Functions
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeChanges(files, stagedOnly = false) {
  const analysis = {
    files: files,
    totalFiles: files.length,
    newFiles: files.filter(f => f.isNew).length,
    modifiedFiles: files.filter(f => f.isModified).length,
    deletedFiles: files.filter(f => f.isDeleted).length,
    scopes: new Set(),
    detectedTypes: new Map(),
    categories: new Map(),
    significantChanges: [],
    linesAdded: 0,
    linesRemoved: 0,
  };

  // Analyze each file
  for (const file of files) {
    // Detect scope
    const scope = detectScope(file.path);
    if (scope) analysis.scopes.add(scope);

    // Categorize file
    const ext = getExtension(file.path);
    const fileType = CONFIG.fileTypes[ext] || { weight: 1, category: 'other' };

    const currentCount = analysis.categories.get(fileType.category) || 0;
    analysis.categories.set(fileType.category, currentCount + 1);

    // Analyze diff content
    if (!file.isDeleted) {
      const diff = getFileDiff(file.path, stagedOnly);
      const diffAnalysis = analyzeDiff(diff, file.path);

      analysis.linesAdded += diffAnalysis.linesAdded;
      analysis.linesRemoved += diffAnalysis.linesRemoved;

      // Merge detected types
      for (const [type, score] of diffAnalysis.types) {
        const current = analysis.detectedTypes.get(type) || 0;
        analysis.detectedTypes.set(type, current + score * fileType.weight);
      }

      if (diffAnalysis.significantChanges.length > 0) {
        analysis.significantChanges.push({
          file: file.path,
          changes: diffAnalysis.significantChanges,
        });
      }
    }
  }

  return analysis;
}

function analyzeDiff(diff, filePath) {
  const result = {
    linesAdded: 0,
    linesRemoved: 0,
    types: new Map(),
    significantChanges: [],
  };

  if (!diff) return result;

  const lines = diff.split('\n');
  const addedLines = [];
  const removedLines = [];

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.linesAdded++;
      addedLines.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.linesRemoved++;
      removedLines.push(line.slice(1));
    }
  }

  // Detect significant patterns in added lines
  const addedContent = addedLines.join('\n');

  // Check for new exports/classes/functions
  if (/export\s+(class|function|const|interface|type)\s+(\w+)/g.test(addedContent)) {
    const matches = addedContent.match(/export\s+(class|function|const|interface|type)\s+(\w+)/g);
    if (matches) {
      result.significantChanges.push({
        type: 'new_export',
        items: matches.map(m => m.replace(/export\s+/, '')),
      });
      result.types.set('feat', (result.types.get('feat') || 0) + matches.length);
    }
  }

  // Check for new methods in classes
  if (/^\s+(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/gm.test(addedContent)) {
    const matches = addedContent.match(/^\s+(async\s+)?(\w+)\s*\([^)]*\)\s*[:{]/gm);
    if (matches && matches.length > 2) {
      result.significantChanges.push({
        type: 'new_methods',
        count: matches.length,
      });
      result.types.set('feat', (result.types.get('feat') || 0) + 1);
    }
  }

  // Check patterns
  for (const [type, patterns] of Object.entries(CONFIG.patterns)) {
    for (const pattern of patterns) {
      if (pattern.test(addedContent)) {
        result.types.set(type, (result.types.get(type) || 0) + 1);
      }
    }
  }

  // If mostly removing code, might be refactor
  if (result.linesRemoved > result.linesAdded * 2) {
    result.types.set('refactor', (result.types.get('refactor') || 0) + 1);
  }

  return result;
}

function detectScope(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');

  for (const [pattern, extractor] of Object.entries(CONFIG.scopes)) {
    if (normalizedPath.includes(pattern)) {
      return extractor(normalizedPath);
    }
  }

  // Fallback: use first directory
  const parts = normalizedPath.split('/');
  if (parts.length > 1) {
    return parts[0];
  }

  return null;
}

function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// Message Generation
// ═══════════════════════════════════════════════════════════════════════════════

function generateCommitSuggestions(analysis) {
  const suggestions = [];

  // Determine primary type
  let primaryType = 'chore';
  let highestScore = 0;

  for (const [type, score] of analysis.detectedTypes) {
    if (score > highestScore) {
      highestScore = score;
      primaryType = type;
    }
  }

  // Special cases
  if (analysis.newFiles > 0 && analysis.modifiedFiles === 0 && analysis.deletedFiles === 0) {
    primaryType = 'feat';
  }

  if (analysis.categories.get('docs') === analysis.totalFiles) {
    primaryType = 'docs';
  }

  if (analysis.categories.get('config') === analysis.totalFiles) {
    primaryType = 'chore';
  }

  // Determine scope
  const scopes = Array.from(analysis.scopes);
  let scope = '';

  if (scopes.length === 1) {
    scope = scopes[0];
  } else if (scopes.length > 1 && scopes.length <= 3) {
    scope = scopes.join(',');
  }

  // Generate subject line
  const subject = generateSubject(analysis, primaryType);

  // Build commit message
  const typeConfig = CONFIG.types[primaryType];
  const scopePart = scope ? `(${scope})` : '';

  // Primary suggestion
  suggestions.push({
    type: primaryType,
    scope,
    subject,
    fullMessage: `${primaryType}${scopePart}: ${subject}`,
    emoji: typeConfig.emoji,
    confidence: calculateConfidence(analysis, primaryType),
    body: generateBody(analysis),
  });

  // Alternative suggestions
  const alternativeTypes = getAlternativeTypes(analysis, primaryType);
  for (const altType of alternativeTypes.slice(0, 2)) {
    const altConfig = CONFIG.types[altType];
    const altSubject = generateSubject(analysis, altType);
    suggestions.push({
      type: altType,
      scope,
      subject: altSubject,
      fullMessage: `${altType}${scopePart}: ${altSubject}`,
      emoji: altConfig.emoji,
      confidence: calculateConfidence(analysis, altType) * 0.7,
      body: generateBody(analysis),
    });
  }

  return suggestions;
}

function generateSubject(analysis, type) {
  const actions = {
    feat: ['add', 'implement', 'create', 'introduce'],
    fix: ['fix', 'resolve', 'correct', 'patch'],
    refactor: ['refactor', 'restructure', 'reorganize', 'clean up'],
    perf: ['optimize', 'improve performance of', 'speed up'],
    docs: ['update', 'add', 'improve'],
    style: ['format', 'style', 'clean up'],
    test: ['add tests for', 'update tests for', 'fix tests for'],
    build: ['update', 'configure', 'modify'],
    ci: ['update', 'configure', 'fix'],
    chore: ['update', 'maintain', 'clean up'],
  };

  const action = actions[type][0];
  const scopes = Array.from(analysis.scopes);

  // Smart subject generation based on file patterns
  const fileGroups = groupFilesByPurpose(analysis.files);

  // Check for builder changes
  if (fileGroups.builders.length > 0) {
    const builderNames = fileGroups.builders.map(f => {
      const match = f.path.match(/(\w+)Builder/i);
      return match ? match[1] : null;
    }).filter(Boolean);

    if (builderNames.length === 1) {
      return `${action} ${builderNames[0]}Builder functionality`;
    }
    if (builderNames.length > 1) {
      return `${action} multiple builders (${builderNames.slice(0, 3).join(', ')})`;
    }
  }

  // Check for module changes
  if (fileGroups.modules.length > 0) {
    const moduleNames = [...new Set(fileGroups.modules.map(f => {
      const match = f.path.match(/modules\/(\w+)\//);
      return match ? match[1] : null;
    }).filter(Boolean))];

    if (moduleNames.length === 1) {
      return `${action} ${moduleNames[0]} module`;
    }
    if (moduleNames.length > 1 && moduleNames.length <= 3) {
      return `${action} ${moduleNames.join(', ')} modules`;
    }
  }

  // Check for logging/observability changes
  if (fileGroups.logging.length > 0) {
    return `${action} logging and observability`;
  }

  // Check for test changes
  if (fileGroups.tests.length > 0 && fileGroups.tests.length === analysis.files.length) {
    return `${action} tests`;
  }

  // Check for script changes
  if (fileGroups.scripts.length > 0) {
    const scriptTypes = fileGroups.scripts.map(f => {
      if (f.path.includes('generate-module')) return 'module generator';
      if (f.path.includes('code-review')) return 'code review';
      if (f.path.includes('diagram')) return 'diagram generator';
      if (f.path.includes('postman')) return 'postman';
      if (f.path.includes('commit')) return 'commit helper';
      return 'scripts';
    });
    const uniqueTypes = [...new Set(scriptTypes)];
    if (uniqueTypes.length === 1) {
      return `${action} ${uniqueTypes[0]} script`;
    }
  }

  // Check for doc changes
  if (fileGroups.docs.length > 0 && fileGroups.docs.length === analysis.files.length) {
    return `${action} documentation`;
  }

  // Generate based on what changed
  if (analysis.significantChanges.length > 0) {
    const change = analysis.significantChanges[0];
    if (change.changes[0]?.type === 'new_export') {
      const items = change.changes[0].items;
      if (items.length === 1) {
        return `${action} ${items[0]}`;
      }
      return `${action} ${items.length} new exports in ${getShortPath(change.file)}`;
    }
  }

  // Generic based on scope
  if (scopes.length === 1) {
    return `${action} ${scopes[0]} module`;
  }

  // Based on file count
  if (analysis.totalFiles === 1) {
    return `${action} ${getShortPath(analysis.files[0].path)}`;
  }

  // Based on categories
  const primaryCategory = Array.from(analysis.categories.entries())
    .sort((a, b) => b[1] - a[1])[0];

  if (primaryCategory) {
    return `${action} ${primaryCategory[0]} files`;
  }

  return `${action} codebase`;
}

function groupFilesByPurpose(files) {
  return {
    builders: files.filter(f => f.path.includes('builder') || f.path.includes('Builder')),
    modules: files.filter(f => f.path.includes('modules/')),
    logging: files.filter(f => f.path.includes('logging/')),
    tests: files.filter(f => f.path.includes('test') || f.path.includes('spec')),
    scripts: files.filter(f => f.path.includes('scripts/')),
    docs: files.filter(f => f.path.endsWith('.md') || f.path.includes('doc/')),
    config: files.filter(f => f.path.endsWith('.json') || f.path.endsWith('.yml')),
  };
}

function generateBody(analysis) {
  const lines = [];

  // Summary
  lines.push(`Changes: +${analysis.linesAdded} -${analysis.linesRemoved} lines across ${analysis.totalFiles} file(s)`);
  lines.push('');

  // File breakdown
  if (analysis.newFiles > 0) {
    lines.push(`- ${analysis.newFiles} new file(s)`);
  }
  if (analysis.modifiedFiles > 0) {
    lines.push(`- ${analysis.modifiedFiles} modified file(s)`);
  }
  if (analysis.deletedFiles > 0) {
    lines.push(`- ${analysis.deletedFiles} deleted file(s)`);
  }

  // Affected scopes
  if (analysis.scopes.size > 0) {
    lines.push('');
    lines.push(`Affected areas: ${Array.from(analysis.scopes).join(', ')}`);
  }

  // File list (if not too many)
  if (analysis.totalFiles <= 10) {
    lines.push('');
    lines.push('Files:');
    for (const file of analysis.files) {
      const status = file.isNew ? '[NEW]' : file.isDeleted ? '[DEL]' : '[MOD]';
      lines.push(`  ${status} ${file.path}`);
    }
  }

  return lines.join('\n');
}

function getAlternativeTypes(analysis, primaryType) {
  const types = Object.entries(CONFIG.types)
    .filter(([type]) => type !== primaryType)
    .sort((a, b) => {
      const scoreA = analysis.detectedTypes.get(a[0]) || 0;
      const scoreB = analysis.detectedTypes.get(b[0]) || 0;
      return scoreB - scoreA;
    })
    .map(([type]) => type);

  return types;
}

function calculateConfidence(analysis, type) {
  const typeScore = analysis.detectedTypes.get(type) || 0;
  const totalScore = Array.from(analysis.detectedTypes.values()).reduce((a, b) => a + b, 0);

  if (totalScore === 0) return 0.5;
  return Math.min(0.95, typeScore / totalScore + 0.3);
}

function getShortPath(filePath) {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          🧠 Smart Commit Message Generator                      ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

function printAnalysis(analysis) {
  console.log('📊 Change Analysis:');
  console.log('─'.repeat(50));
  console.log(`   Total files:    ${analysis.totalFiles}`);
  console.log(`   New:            ${analysis.newFiles}`);
  console.log(`   Modified:       ${analysis.modifiedFiles}`);
  console.log(`   Deleted:        ${analysis.deletedFiles}`);
  console.log(`   Lines:          +${analysis.linesAdded} / -${analysis.linesRemoved}`);

  if (analysis.scopes.size > 0) {
    console.log(`   Scopes:         ${Array.from(analysis.scopes).join(', ')}`);
  }
  console.log('');
}

function printSuggestions(suggestions) {
  console.log('💡 Suggested Commit Messages:');
  console.log('─'.repeat(50));

  suggestions.forEach((suggestion, index) => {
    const confidence = Math.round(suggestion.confidence * 100);
    const bar = '█'.repeat(Math.round(confidence / 10)) + '░'.repeat(10 - Math.round(confidence / 10));

    console.log(`\n  ${index + 1}. ${suggestion.emoji} ${suggestion.fullMessage}`);
    console.log(`     Confidence: ${bar} ${confidence}%`);
    console.log(`     Type: ${CONFIG.types[suggestion.type].description}`);
  });
}

function printRecentCommits(commits) {
  console.log('\n📜 Recent Commits (for style reference):');
  console.log('─'.repeat(50));
  commits.forEach(commit => console.log(`   ${commit}`));
}

async function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const stagedOnly = args.includes('--staged');
  const autoCommit = args.includes('--commit');
  const withEmoji = args.includes('--emoji');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
Smart Commit Message Generator
==============================

Usage:
  node scripts/smart-commit.js [options]

Options:
  --staged    Only analyze staged files (git add)
  --commit    Automatically commit with selected message
  --emoji     Include emoji in commit message
  --help, -h  Show this help message

Examples:
  node scripts/smart-commit.js                # Analyze all changes
  node scripts/smart-commit.js --staged       # Analyze staged only
  node scripts/smart-commit.js --commit       # Commit directly
  node scripts/smart-commit.js --emoji        # Include emoji
`);
    process.exit(0);
  }

  printHeader();

  // Get changed files
  let files = getChangedFiles(stagedOnly);

  // Include untracked files if not staged-only
  if (!stagedOnly) {
    const untracked = getUntrackedFiles();
    files = files.concat(untracked.map(path => ({
      status: 'A',
      path,
      isNew: true,
      isDeleted: false,
      isModified: false,
      isRenamed: false,
    })));
  }

  if (files.length === 0) {
    console.log('❌ No changes detected!');
    console.log('   Make sure you have uncommitted changes or use --staged flag.\n');
    process.exit(1);
  }

  // Analyze changes
  const analysis = analyzeChanges(files, stagedOnly);
  printAnalysis(analysis);

  // Generate suggestions
  const suggestions = generateCommitSuggestions(analysis);
  printSuggestions(suggestions);

  // Show recent commits
  const recentCommits = getRecentCommits(5);
  if (recentCommits.length > 0) {
    printRecentCommits(recentCommits);
  }

  console.log('\n');

  // Interactive selection
  if (autoCommit) {
    const choice = await promptUser('Select message (1-3) or enter custom, or q to quit: ');

    if (choice.toLowerCase() === 'q') {
      console.log('Cancelled.');
      process.exit(0);
    }

    let commitMessage;
    const choiceNum = parseInt(choice);

    if (choiceNum >= 1 && choiceNum <= suggestions.length) {
      const selected = suggestions[choiceNum - 1];
      commitMessage = withEmoji
        ? `${selected.emoji} ${selected.fullMessage}`
        : selected.fullMessage;
    } else if (choice.trim()) {
      commitMessage = choice.trim();
    } else {
      console.log('Invalid choice.');
      process.exit(1);
    }

    // Stage all files if not staged-only
    if (!stagedOnly) {
      console.log('\n📦 Staging all changes...');
      execSync('git add -A', { stdio: 'inherit' });
    }

    // Create commit
    console.log(`\n✅ Creating commit: ${commitMessage}`);
    try {
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });
      console.log('\n🎉 Commit created successfully!\n');
    } catch (error) {
      console.error('\n❌ Commit failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('💡 Tip: Use --commit flag to commit directly');
    console.log('        Use --emoji flag to include emoji\n');

    // Print copy-paste ready commands
    console.log('📋 Copy-paste commands:');
    console.log('─'.repeat(50));
    suggestions.forEach((s, i) => {
      const msg = withEmoji ? `${s.emoji} ${s.fullMessage}` : s.fullMessage;
      console.log(`\n${i + 1}. git add -A && git commit -m "${msg}"`);
    });
    console.log('');
  }
}

// Run
main().catch(console.error);
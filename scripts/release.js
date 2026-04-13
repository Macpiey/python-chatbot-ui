/**
 * Release Script for Commodities AI
 * 
 * One-command release pipeline:
 * 1. Prompts for new version and release notes
 * 2. Bumps version in package.json
 * 3. Builds, packages, and creates Inno Setup installer
 * 4. Creates a git tag
 * 5. Pushes tag to GitHub
 * 6. Creates a GitHub Release with the .exe attached
 * 
 * Usage:
 *   npm run release                    (interactive - prompts for version & notes)
 *   npm run release -- --version 1.1.0 (skip version prompt)
 *   npm run release -- --patch         (auto-bump patch: 1.0.0 → 1.0.1)
 *   npm run release -- --minor         (auto-bump minor: 1.0.0 → 1.1.0)
 *   npm run release -- --major         (auto-bump major: 1.0.0 → 2.0.0)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const INSTALLER_DIR = path.join(ROOT, 'out', 'windows-installer');
const INSTALLER_NAME = 'Commodities_AI_Setup.exe';

// Parse command-line arguments
const args = process.argv.slice(2);
const argMap = {};
args.forEach((arg) => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    argMap[key] = value || true;
  }
});

function readPackageJson() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
}

function writePackageJson(pkg) {
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
}

function bumpVersion(current, type) {
  const parts = current.split('.').map(Number);
  switch (type) {
    case 'major':
      return `${parts[0] + 1}.0.0`;
    case 'minor':
      return `${parts[0]}.${parts[1] + 1}.0`;
    case 'patch':
      return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
    default:
      return current;
  }
}

function askQuestion(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function askMultiline(rl, prompt) {
  return new Promise((resolve) => {
    console.log(prompt);
    console.log('  (Enter each note on a new line. Type "done" when finished)');
    const lines = [];
    const handler = (line) => {
      if (line.trim().toLowerCase() === 'done') {
        rl.removeListener('line', handler);
        resolve(lines.join('\n'));
      } else if (line.trim()) {
        lines.push(`- ${line.trim()}`);
      }
    };
    rl.on('line', handler);
  });
}

function exec(cmd, options = {}) {
  console.log(`\n  > ${cmd}`);
  return execSync(cmd, { cwd: ROOT, stdio: 'inherit', ...options });
}

function execSilent(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function checkGhCli() {
  try {
    execSync('gh auth status', { cwd: ROOT, stdio: 'pipe' });
    return true;
  } catch {
    // Try with full path on Windows
    try {
      execSync('"C:\\Program Files\\GitHub CLI\\gh.exe" auth status', { cwd: ROOT, stdio: 'pipe' });
      return 'C:\\Program Files\\GitHub CLI\\gh.exe';
    } catch {
      return false;
    }
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  Commodities AI - Release Pipeline');
  console.log('========================================\n');

  // 0. Pre-flight checks
  console.log('[1/7] Pre-flight checks...');

  const ghPath = checkGhCli();
  if (!ghPath) {
    console.error('ERROR: GitHub CLI (gh) is not installed or not authenticated.');
    console.error('Install it from https://cli.github.com/ and run: gh auth login');
    process.exit(1);
  }
  const ghCmd = typeof ghPath === 'string' ? `"${ghPath}"` : 'gh';
  console.log('  - GitHub CLI: authenticated');

  // Check for clean git state (warn but don't block)
  try {
    const status = execSilent('git status --porcelain');
    if (status) {
      console.log('  - WARNING: You have uncommitted changes. They will be included in the release commit.');
    } else {
      console.log('  - Git: clean working tree');
    }
  } catch {
    console.log('  - WARNING: Could not check git status');
  }

  const pkg = readPackageJson();
  const currentVersion = pkg.version;
  console.log(`  - Current version: ${currentVersion}`);

  // 1. Determine new version
  let newVersion;
  if (argMap.version) {
    newVersion = argMap.version;
  } else if (argMap.patch) {
    newVersion = bumpVersion(currentVersion, 'patch');
  } else if (argMap.minor) {
    newVersion = bumpVersion(currentVersion, 'minor');
  } else if (argMap.major) {
    newVersion = bumpVersion(currentVersion, 'major');
  } else {
    // Interactive mode
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    console.log(`\n  Current version: ${currentVersion}`);
    console.log(`  Suggestions: patch=${bumpVersion(currentVersion, 'patch')}, minor=${bumpVersion(currentVersion, 'minor')}, major=${bumpVersion(currentVersion, 'major')}`);
    newVersion = await askQuestion(rl, `\n  Enter new version [${bumpVersion(currentVersion, 'patch')}]: `);

    if (!newVersion) {
      newVersion = bumpVersion(currentVersion, 'patch');
    }

    // Get release notes
    var releaseNotes = await askMultiline(rl, '\n  Enter release notes:');

    rl.close();
  }

  // Validate version format
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error(`ERROR: Invalid version format "${newVersion}". Use semver (e.g., 1.2.3)`);
    process.exit(1);
  }

  if (!releaseNotes) {
    releaseNotes = `Release v${newVersion}`;
  }

  console.log(`\n  New version: ${newVersion}`);
  console.log(`  Release notes:\n${releaseNotes.split('\n').map(l => '    ' + l).join('\n')}`);

  // 2. Bump version in package.json
  console.log('\n[2/7] Bumping version...');
  pkg.version = newVersion;
  writePackageJson(pkg);
  console.log(`  - package.json updated to ${newVersion}`);

  // 3. Build, package, and create installer
  console.log('\n[3/7] Building production bundle...');
  exec('npm run build:prod');

  console.log('\n[4/7] Packaging Electron app...');
  exec('npx electron-forge package');

  console.log('\n[5/7] Creating Inno Setup installer...');
  exec('node scripts/build-inno-installer.js');

  // Verify installer was created
  const installerPath = path.join(INSTALLER_DIR, INSTALLER_NAME);
  if (!fs.existsSync(installerPath)) {
    console.error(`ERROR: Installer not found at ${installerPath}`);
    process.exit(1);
  }

  const installerStats = fs.statSync(installerPath);
  const sizeMB = (installerStats.size / (1024 * 1024)).toFixed(1);
  console.log(`  - Installer created: ${INSTALLER_NAME} (${sizeMB} MB)`);

  // 6. Git tag and push
  console.log('\n[6/7] Creating git tag and pushing...');
  try {
    exec(`git add package.json`);
    exec(`git commit -m "release: v${newVersion}"`);
  } catch {
    console.log('  - No changes to commit (version may already be updated)');
  }
  
  try {
    exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
  } catch {
    console.log(`  - Tag v${newVersion} may already exist, continuing...`);
  }

  try {
    exec(`git push origin main --tags`);
  } catch {
    try {
      exec(`git push origin master --tags`);
    } catch {
      console.log('  - WARNING: Could not push to remote. Push manually later.');
    }
  }

  // 7. Create GitHub Release
  console.log('\n[7/7] Creating GitHub Release...');
  
  // Write release notes to a temp file to avoid shell escaping issues
  const notesFile = path.join(ROOT, 'out', '.release-notes-tmp.md');
  const fullNotes = `## Commodities AI v${newVersion}\n\n${releaseNotes}\n\n---\n*Released on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*`;
  fs.writeFileSync(notesFile, fullNotes, 'utf8');

  try {
    exec(`${ghCmd} release create v${newVersion} "${installerPath}" --title "Commodities AI v${newVersion}" --notes-file "${notesFile}"`);
    console.log(`\n  GitHub Release created successfully!`);
  } catch (error) {
    console.error('  ERROR: Failed to create GitHub Release.');
    console.error('  You can create it manually at:');
    console.error(`  https://github.com/Macpiey/python-chatbot-ui/releases/new?tag=v${newVersion}`);
  }

  // Cleanup temp file
  try { fs.unlinkSync(notesFile); } catch {}

  // Done!
  console.log('\n========================================');
  console.log('  Release v' + newVersion + ' complete!');
  console.log('========================================');
  console.log(`\n  Installer: ${installerPath}`);
  console.log(`  GitHub:    https://github.com/Macpiey/python-chatbot-ui/releases/tag/v${newVersion}`);
  console.log(`\n  Clients will see the update automatically on next app launch.\n`);
}

main().catch((error) => {
  console.error('\nRelease failed:', error.message);
  process.exit(1);
});

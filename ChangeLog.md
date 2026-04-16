# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.10] - 2025-04-04

### Added

- **Git Version Selection**: Install skills from specific git tags or commits
  - Use `@ref` syntax: `skillman install repo@v1.0.0` or `skillman install repo@abc1234`
  - Supports tags, commits, and branch names
  - Works with all URL formats (GitHub shorthand, full URL, SSH)

- **Hash-Based Versioning**: Automatic version for skills without explicit version
  - Computes MD5 hash of SKILL.md content when `metadata.version` is missing
  - Stores full 32-character hash in `installed.json`
  - Displays truncated 8-character hash in UI (e.g., `skill-name@a1b2c3d4`)
  - Adds `isHash` flag to distinguish hash versions from SemVer

- **Enhanced URL Parsing**: `downloader.js` now extracts git ref from URLs
  - Parses `@tag`, `@commit`, `@branch` suffixes
  - Returns `{ type, url, subPath, ref }` structure

### Changed

- **Simplified Install Command**: Removed `version` subcommand
  - Git version control via `@ref` syntax is sufficient
  - CLI is cleaner without redundant version filtering options

### Tests

- **URL Parsing Tests**: Added 6 new tests for git ref support
  - GitHub shorthand with tag/commit
  - Full URL with tag
  - SSH URL with tag
  - Subpath with tag

- **Hash Utilities Tests**: Added `test/hash.test.js` with 6 tests
  - MD5 computation
  - Version formatting (truncation for display)
  - Edge cases (null, empty, short hashes)

- **Scanner Tests**: Updated to verify `isHash` flag behavior

## [1.0.9] - 2025-04-04

### Added

- **YAML Multiline Description Support**: Parse YAML multiline format for skill descriptions
  - Supports `|`, `>`, `|-`, `>-` indicators
  - Automatically extracts actual content from indented lines

- **parseArgs Unit Tests**: Added comprehensive tests for CLI argument parsing
  - 6 test cases covering install, init, and option parsing
  - Exported `parseArgs` function for testability

### Fixed

- **Install Command URL Parsing**: Fixed bug where `skillman i <url>` incorrectly scanned local directory
  - URL was parsed as `subcommand` but code expected `positional`
  - Now correctly uses `subcommand || positional[0]` for URL

## [1.0.8] - 2025-04-04

### Added

- **Version Comparison Display**: Enhanced version display when skill already exists
  - Shows `Current: v1.0.0 → Installing: v1.2.0` format
  - Easy visual comparison of versions before overwrite

## [1.0.7] - 2025-04-04

### Added

- **Version Management**: Added comprehensive version management capabilities for skills
  - Parse `version` field from SKILL.md metadata (under `metadata:` section)
  - Store installed skill metadata in `~/.config/skillman/installed.json`
  - New CLI command: `skillman list` - List all installed skills with versions
  - New CLI command: `skillman update <skill>` (alias: `u`) - Update a skill by reinstalling from source
  - New CLI command: `skillman uninstall <skill>` - Uninstall a skill and remove from registry
  - Support `@version` syntax in install command: `skillman install <path>@<version>`

- **Version Display**: Show version in skill selection UI
  - Format: `skill-name@1.0.0 (description...)` when version is available
  - Format: `skill-name (description...)` when version is not available

- **Multi-select for Interactive Install**: Unified skill selection behavior
  - Both `skillman` (interactive) and `skillman install <path>` now support multi-select
  - Use checkbox interface with space to select, enter to confirm

- **Init Command**: Added `skillman init` command to create skill templates
  - Quick template generation: `skillman init [skill-name]`
  - Options: `--version`, `--description`, `--author`, `--dir`
  - Generates SKILL.md with version metadata for version management
  - Default name: `my-skill`, default version: `1.0.0`

- **ASCII Logo**: Added modern ASCII art logo on startup
  - Displays "Skillman" in block characters with cyan color
  - Shown in both interactive and install-from-URL modes

### Changed

- **Refactored CLI Code**: Extracted `selectSkills()` helper function
  - Eliminated code duplication between `interactiveInstall()` and `installFromUrl()`
  - Improved maintainability and consistency

- **Enhanced Install Tracking**: Installer now records metadata after installation
  - Records: name, version, agent, scope, source path, target path, timestamp
  - Enables update and uninstall operations

- **scanner.js Refactoring**: Extracted `parseSkillFile` function
  - Eliminated duplicate parsing logic between `scanSingleDir` and `parseSkillFile`
  - Unified version parsing with quote normalization

### Fixed

- **Function Not Defined**: Fixed `continueInstall is not defined` error
  - Replaced undefined `continueInstall()` call with `continueInstallMultiple([skill])`

- **Unified Selection Interface**: Fixed inconsistency between interactive modes
  - Both entry points now use multi-select checkbox for skill selection

- **Version Quote Normalization**: Support both quoted and unquoted version in SKILL.md
  - `version: 1.0.0`, `version: "1.0.0"`, `version: '1.0.0'` all work correctly
  - Display always shows version without quotes

### Tests

- **Unit Tests**: Added comprehensive test suite
  - 50 total tests covering all functionality
  - Tests for init command, parseArgs, scanner, version management

## [1.0.6] - 2025-04-04

### Added

- Initial release with core functionality
- Interactive skill installation wizard
- Multi-agent support (Claude Code, OpenClaw, Qoder, etc.)
- Remote URL installation from GitHub/GitLab
- Workspace history tracking
- Dry-run mode for previewing installations
- Bilingual support (English/Chinese)

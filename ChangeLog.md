# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

### Changed

- **Refactored CLI Code**: Extracted `selectSkills()` helper function
  - Eliminated code duplication between `interactiveInstall()` and `installFromUrl()`
  - Improved maintainability and consistency

- **Enhanced Install Tracking**: Installer now records metadata after installation
  - Records: name, version, agent, scope, source path, target path, timestamp
  - Enables update and uninstall operations

### Fixed

- **Function Not Defined**: Fixed `continueInstall is not defined` error
  - Replaced undefined `continueInstall()` call with `continueInstallMultiple([skill])`

- **Unified Selection Interface**: Fixed inconsistency between interactive modes
  - Both entry points now use multi-select checkbox for skill selection

## [1.0.6] - 2025-04-04

### Added

- Initial release with core functionality
- Interactive skill installation wizard
- Multi-agent support (Claude Code, OpenClaw, Qoder, etc.)
- Remote URL installation from GitHub/GitLab
- Workspace history tracking
- Dry-run mode for previewing installations
- Bilingual support (English/Chinese)

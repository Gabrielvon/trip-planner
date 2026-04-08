# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1.0] - 2026-04-08

### Added
- Intelligent geolocation-based map provider selection with IP detection
- Map service manager with health monitoring and fallback logic
- 7 Chinese sample trip presets for structured drafts
- Configuration validator for API key validation and startup logging
- Comprehensive unit tests for all new modules
- AMap testing utilities and scripts

### Changed
- Enhanced IP detection to extract user IP from request headers
- Updated server.ts to pass request objects for proper IP extraction
- Improved AMap key validation in trip-map component
- Added startup configuration logging to layout.tsx

### Fixed
- IP detection logic to correctly identify user location
- API key validation and error handling
- Test coverage for all new functionality
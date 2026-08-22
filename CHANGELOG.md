# Changelog

## [1.2.0](https://github.com/sinhong2011/volume-hero/compare/v1.1.1...v1.2.0) (2026-08-22)


### ✨ Features

* **audio:** ship the equalizer and rebuild the gain chain ([4e39dc8](https://github.com/sinhong2011/volume-hero/commit/4e39dc8be9d9262d52201e7a8549a5fca3ff92cc))
* **background:** inject into existing tabs and sync badge with OSD gating ([5ea2dd7](https://github.com/sinhong2011/volume-hero/commit/5ea2dd7b3bd2c0ccfea0c17a75be4fe9e593ce2f))
* **content:** run in every frame so embedded players can be controlled ([5c42b8c](https://github.com/sinhong2011/volume-hero/commit/5c42b8cf631414248ea9f93434a74fba76f0fdad))
* **icon:** redesign extension icon with amber boost mark ([1d5ea97](https://github.com/sinhong2011/volume-hero/commit/1d5ea97432726f37cacafaff8bcae282584a47b1))
* **security:** seal sync credentials with AES-GCM instead of XOR ([a176525](https://github.com/sinhong2011/volume-hero/commit/a1765256f56bf582b9c62996670a9e4188b0ef3e))
* **settings:** mirror global preferences through chrome.storage.sync ([34d124c](https://github.com/sinhong2011/volume-hero/commit/34d124c2c279cb0958dcb35fb7062f75a6badd08))
* **solid:** adopt Solid 2.0 with the Ark UI compatibility layer ([807ef54](https://github.com/sinhong2011/volume-hero/commit/807ef54d3e737cd34deead3d4b0c844c23692a44))
* **solid:** migrate to Solid 2.0.0-rc.0 behind a compatibility layer ([6b0555f](https://github.com/sinhong2011/volume-hero/commit/6b0555ff1a6aed0f5a493ba53b0061529a4ce308))


### 🐛 Bug Fixes

* address multiple correctness and security issues ([9d7b21c](https://github.com/sinhong2011/volume-hero/commit/9d7b21c9e460df5de74cbd324c9eb8f005983fc2))
* **audio:** stop the limiter clipping at high boost ([72b822a](https://github.com/sinhong2011/volume-hero/commit/72b822a00536bb8ebdcd0ac71c4ad7c72791924a))
* **background:** keep mute state and badge setting across worker restarts ([e4770bd](https://github.com/sinhong2011/volume-hero/commit/e4770bd214d88838909b7097562ff5269d85b967))
* **i18n:** generate Paraglide output before typecheck, and finish the v2 move ([2969f95](https://github.com/sinhong2011/volume-hero/commit/2969f95a0602dcbbdf68a465d933f693578c68fc))
* **popup:** stop logging an error when a tab has no content script ([e60c53b](https://github.com/sinhong2011/volume-hero/commit/e60c53bed56ef26cd813a843dadd5ffb3f29fa15))
* **sync:** detect S3 404 and 403 by status code instead of message text ([72107ea](https://github.com/sinhong2011/volume-hero/commit/72107eab507137f3203bd8a62f919dc57d0d48c6))


### ♻️ Refactoring

* **sync:** rename WebDAV exports and scope SyncResult types ([734feb2](https://github.com/sinhong2011/volume-hero/commit/734feb21c96b9ad0259bf16fb6f0ecef8a3f12af))
* **ui:** streamline popup/options styling with macOS theme tokens ([bc04073](https://github.com/sinhong2011/volume-hero/commit/bc04073b85da591b6cd74bef141c296f6e2eb181))


### ✅ Tests

* **compat:** cover the Solid 1 shims that carry reactivity risk ([deb344c](https://github.com/sinhong2011/volume-hero/commit/deb344c42377b8dbb85548a7527fde8aa7a58561))


### 👷 CI/CD

* run the test suite in CI and before push ([30ae377](https://github.com/sinhong2011/volume-hero/commit/30ae3778c8684592650e4e98c2d1c6584eec066f))

## [1.1.1](https://github.com/sinhong2011/volume-hero/compare/v1.1.0...v1.1.1) (2025-12-22)


### 🐛 Bug Fixes

* **ci:** use WXT-generated zip file names directly ([76b3647](https://github.com/sinhong2011/volume-hero/commit/76b3647a5ad7d3143c2669f6c23ac9c590d2f11c))

## [1.1.0](https://github.com/sinhong2011/volume-hero/compare/v1.0.0...v1.1.0) (2025-12-22)


### ✨ Features

* add audio equalizer (EQ) utilities ([f6f5964](https://github.com/sinhong2011/volume-hero/commit/f6f5964b05965f2fa9ab9efcd9c8b6384fec48a1))
* add i18n translations for new features ([a576ed1](https://github.com/sinhong2011/volume-hero/commit/a576ed162137600aca7d0773fc6706ae49d20f58))
* add internationalization for multi-provider sync ([6fe85cf](https://github.com/sinhong2011/volume-hero/commit/6fe85cfbb0f65c1c2ae9f35ec4dfb1f4fd5b07fe))
* add JSR registry configuration for [@jsr](https://github.com/jsr) packages ([b3e498c](https://github.com/sinhong2011/volume-hero/commit/b3e498c94ea52debd61d771a3bfab1251eb705c3))
* add macOS-style UI components ([cb4ab0a](https://github.com/sinhong2011/volume-hero/commit/cb4ab0ae31513e993f4bb30ace58992fac59c7af))
* add modular options page settings components ([21ec52a](https://github.com/sinhong2011/volume-hero/commit/21ec52a1a9f157f928a519d8a9344a809119572f))
* add multi-provider support to sync settings UI ([36f77e3](https://github.com/sinhong2011/volume-hero/commit/36f77e39398a7c2ed9123078134d14e02d7f62b5))
* add new Volume Hero logo assets ([af4bed4](https://github.com/sinhong2011/volume-hero/commit/af4bed48a36c9edcb41afc978ac62832e67c88f0))
* add on-screen display (OSD) for volume changes ([9f8f8fe](https://github.com/sinhong2011/volume-hero/commit/9f8f8fe6918c96188f827c8672f7a5a84ab0190b))
* add S3 configuration support to storage utilities ([22d3733](https://github.com/sinhong2011/volume-hero/commit/22d3733b83aef454ffe3a3af01183c05328ebc8a))
* add s3-lite-client dependency for S3-compatible storage support ([c034037](https://github.com/sinhong2011/volume-hero/commit/c0340373419408c56466018a0d6f3b6fb2eb096d))
* add unified sync interface for multiple providers ([ae55d06](https://github.com/sinhong2011/volume-hero/commit/ae55d06f5862841d7e2f207c22aeeb8058399aba))
* add WebDAV cloud sync support ([4210f67](https://github.com/sinhong2011/volume-hero/commit/4210f671d8eaa24908b0eaf8a53e373e7d459f1e))
* configure extension to use new logo icon ([d709e92](https://github.com/sinhong2011/volume-hero/commit/d709e92ccc6d2f0d6a7693ee47e6caca6df24b7a))
* enhance domain manager with advanced controls ([71b3d35](https://github.com/sinhong2011/volume-hero/commit/71b3d3587939625281e6fdcd457f9f27bf434711))
* enhance UI with toast notifications and i18n integration ([ede8198](https://github.com/sinhong2011/volume-hero/commit/ede81981bc26348e6ac9d4d2f9f5cab6efb42157))
* extend storage with new global settings ([e95a361](https://github.com/sinhong2011/volume-hero/commit/e95a361a5d41ef770f29a31dbad5174f49f3bce0))
* implement S3-compatible storage sync functionality ([730930d](https://github.com/sinhong2011/volume-hero/commit/730930dbeb32e7f23c6ca5217afe11268291145e))
* improve popup UI with enhanced controls ([7851fb8](https://github.com/sinhong2011/volume-hero/commit/7851fb8a361a6ee7f21afa7b92257d648f3bd250))
* initial project setup with Volume Hero extension ([0e456cc](https://github.com/sinhong2011/volume-hero/commit/0e456ccd83b20f2d18db30779346dc8214208dd6))
* integrate release-please for automated releases ([#6](https://github.com/sinhong2011/volume-hero/issues/6)) ([9c9ff71](https://github.com/sinhong2011/volume-hero/commit/9c9ff7105e518d5307140167cf756a5a745aee26))
* migrate to Paraglide i18n system ([09d98b9](https://github.com/sinhong2011/volume-hero/commit/09d98b9f8219f8aecaf9bb74e88c34b0a313d674))
* update content script and volume hook for new features ([cddf468](https://github.com/sinhong2011/volume-hero/commit/cddf468a5d6aae10cdb58ea3f71e8fc2aa579262))
* update UI to display new logo ([22e9111](https://github.com/sinhong2011/volume-hero/commit/22e91116ab2701dbe7f7842dc4a7fbc75eed9a99))


### ♻️ Refactoring

* improve content script code quality ([eaee985](https://github.com/sinhong2011/volume-hero/commit/eaee985de44800b3520502b0d313155e9f7de846))
* improve domain manager UI code quality ([2545165](https://github.com/sinhong2011/volume-hero/commit/2545165f902e3e23479788b84aa9eeb0977d2700))
* integrate unified sync interface in background script ([da814dc](https://github.com/sinhong2011/volume-hero/commit/da814dcba80b5799902c6ff8c0c34dae3c1518f6))
* update options page with tab-based navigation ([2e12266](https://github.com/sinhong2011/volume-hero/commit/2e12266a4a719f5df989d86da053b4f040724bbb))
* update WebDAV utilities for unified sync interface ([37d7db5](https://github.com/sinhong2011/volume-hero/commit/37d7db5707e276dae4b3d21acd5248c60513d5b0))


### 💄 Styles

* apply code formatting to wxt.config.ts ([6309f30](https://github.com/sinhong2011/volume-hero/commit/6309f30cfa06473e8e3492197b2ce4311b5f765f))

## 1.0.0 (2025-12-22)


### ✨ Features

* add audio equalizer (EQ) utilities ([f6f5964](https://github.com/sinhong2011/volume-hero/commit/f6f5964b05965f2fa9ab9efcd9c8b6384fec48a1))
* add i18n translations for new features ([a576ed1](https://github.com/sinhong2011/volume-hero/commit/a576ed162137600aca7d0773fc6706ae49d20f58))
* add internationalization for multi-provider sync ([6fe85cf](https://github.com/sinhong2011/volume-hero/commit/6fe85cfbb0f65c1c2ae9f35ec4dfb1f4fd5b07fe))
* add JSR registry configuration for [@jsr](https://github.com/jsr) packages ([b3e498c](https://github.com/sinhong2011/volume-hero/commit/b3e498c94ea52debd61d771a3bfab1251eb705c3))
* add macOS-style UI components ([cb4ab0a](https://github.com/sinhong2011/volume-hero/commit/cb4ab0ae31513e993f4bb30ace58992fac59c7af))
* add modular options page settings components ([21ec52a](https://github.com/sinhong2011/volume-hero/commit/21ec52a1a9f157f928a519d8a9344a809119572f))
* add multi-provider support to sync settings UI ([36f77e3](https://github.com/sinhong2011/volume-hero/commit/36f77e39398a7c2ed9123078134d14e02d7f62b5))
* add new Volume Hero logo assets ([af4bed4](https://github.com/sinhong2011/volume-hero/commit/af4bed48a36c9edcb41afc978ac62832e67c88f0))
* add on-screen display (OSD) for volume changes ([9f8f8fe](https://github.com/sinhong2011/volume-hero/commit/9f8f8fe6918c96188f827c8672f7a5a84ab0190b))
* add S3 configuration support to storage utilities ([22d3733](https://github.com/sinhong2011/volume-hero/commit/22d3733b83aef454ffe3a3af01183c05328ebc8a))
* add s3-lite-client dependency for S3-compatible storage support ([c034037](https://github.com/sinhong2011/volume-hero/commit/c0340373419408c56466018a0d6f3b6fb2eb096d))
* add unified sync interface for multiple providers ([ae55d06](https://github.com/sinhong2011/volume-hero/commit/ae55d06f5862841d7e2f207c22aeeb8058399aba))
* add WebDAV cloud sync support ([4210f67](https://github.com/sinhong2011/volume-hero/commit/4210f671d8eaa24908b0eaf8a53e373e7d459f1e))
* configure extension to use new logo icon ([d709e92](https://github.com/sinhong2011/volume-hero/commit/d709e92ccc6d2f0d6a7693ee47e6caca6df24b7a))
* enhance domain manager with advanced controls ([71b3d35](https://github.com/sinhong2011/volume-hero/commit/71b3d3587939625281e6fdcd457f9f27bf434711))
* enhance UI with toast notifications and i18n integration ([ede8198](https://github.com/sinhong2011/volume-hero/commit/ede81981bc26348e6ac9d4d2f9f5cab6efb42157))
* extend storage with new global settings ([e95a361](https://github.com/sinhong2011/volume-hero/commit/e95a361a5d41ef770f29a31dbad5174f49f3bce0))
* implement S3-compatible storage sync functionality ([730930d](https://github.com/sinhong2011/volume-hero/commit/730930dbeb32e7f23c6ca5217afe11268291145e))
* improve popup UI with enhanced controls ([7851fb8](https://github.com/sinhong2011/volume-hero/commit/7851fb8a361a6ee7f21afa7b92257d648f3bd250))
* initial project setup with Volume Hero extension ([0e456cc](https://github.com/sinhong2011/volume-hero/commit/0e456ccd83b20f2d18db30779346dc8214208dd6))
* integrate release-please for automated releases ([#6](https://github.com/sinhong2011/volume-hero/issues/6)) ([9c9ff71](https://github.com/sinhong2011/volume-hero/commit/9c9ff7105e518d5307140167cf756a5a745aee26))
* migrate to Paraglide i18n system ([09d98b9](https://github.com/sinhong2011/volume-hero/commit/09d98b9f8219f8aecaf9bb74e88c34b0a313d674))
* update content script and volume hook for new features ([cddf468](https://github.com/sinhong2011/volume-hero/commit/cddf468a5d6aae10cdb58ea3f71e8fc2aa579262))
* update UI to display new logo ([22e9111](https://github.com/sinhong2011/volume-hero/commit/22e91116ab2701dbe7f7842dc4a7fbc75eed9a99))


### ♻️ Refactoring

* improve content script code quality ([eaee985](https://github.com/sinhong2011/volume-hero/commit/eaee985de44800b3520502b0d313155e9f7de846))
* improve domain manager UI code quality ([2545165](https://github.com/sinhong2011/volume-hero/commit/2545165f902e3e23479788b84aa9eeb0977d2700))
* integrate unified sync interface in background script ([da814dc](https://github.com/sinhong2011/volume-hero/commit/da814dcba80b5799902c6ff8c0c34dae3c1518f6))
* update options page with tab-based navigation ([2e12266](https://github.com/sinhong2011/volume-hero/commit/2e12266a4a719f5df989d86da053b4f040724bbb))
* update WebDAV utilities for unified sync interface ([37d7db5](https://github.com/sinhong2011/volume-hero/commit/37d7db5707e276dae4b3d21acd5248c60513d5b0))


### 💄 Styles

* apply code formatting to wxt.config.ts ([6309f30](https://github.com/sinhong2011/volume-hero/commit/6309f30cfa06473e8e3492197b2ce4311b5f765f))

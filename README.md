# mediathread-safari

[![Build Status](https://travis-ci.org/ccnmtl/mediathread-safari.svg?branch=master)](https://travis-ci.org/ccnmtl/mediathread-safari)

Safari extension for importing assets to Mediathread.

## Development notes

If you're unfamiliar with Safari Extensions, skim through [Using Extension Builder](https://developer.apple.com/library/content/documentation/Tools/Conceptual/SafariExtensionGuide/UsingExtensionBuilder/UsingExtensionBuilder.html). Basically, every time you open Safari to work on this extension you'll click on Develop -> Show Extension Builder.

### Release Checklist
* Update ChangeLog
* Increment version number in Safari's extension builder
* Make `Mediathread.safariextz` in the Safari extension builder. This is done with the "Build Package..." button.
* Make a new release on GitHub and attach the `Mediathread.safariextz` file.
* Go to the Safari extension submission page here:
  https://developer.apple.com/safari/extensions/submission/
  You'll need to fill out this form with each release:
* Download URL: Link to `Mediathread.safariextz` in the github release
* Category: Photos / Other
* Feature: Toolbar Button
* Icon: Attach the `assets/mt_logo_256.png` file from this repository.
* Screenshot: Attach the `assets/screenshot.png` file from this repository.

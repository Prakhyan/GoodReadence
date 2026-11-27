# Release policy

The owner requested a consolidated public release history and a version reset to **1.5.1**. Earlier published numbering is retained in `archive/release-history-before-consolidation.json` for provenance. Public release cards group features into six milestones, from 1.0 through 1.5.

Use patch versions for maintenance within the current feature release. Add those versions to its existing card; do not create a new public card or notification for each correction. Summaries should describe the reading experience in a few sentences, without implementation details or internal bug history. Introduce a new minor version only for a meaningful feature set. A major version is for incompatible changes.

The service worker uses its own cache revision rather than comparing semantic versions. Update that revision when shipping changed app files. Preserve the release-notification identity for maintenance patches so readers are not shown a new announcement dot for each fix. Stored books, notes and progress are independent of the displayed version.

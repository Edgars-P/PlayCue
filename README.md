# PlayCue - A web-based cue player

This is a somewhat jank cue player that allows you to play audio files in a web browser.

Heavily inspiered by https://github.com/FrancescoCeruti/linux-show-player in it's launchpad configuration. I use it a *lot* and I have a very specific usecase for it, but I can't always have my linux machine with me. So I made this web-based version that can run on any device with a web browser! ***

*** Mostly just chrome desktop because of the FS API, but good enough for my use case.

It can load and save configurations with a folder acting as a "database", with all the media files of the current project in it. Opening an existing directory auto-loads the config.

It also has a simple event system where you can trigger the starting/stopping of other cues for (mostly) seamless transitions.

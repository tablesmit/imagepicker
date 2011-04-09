FireFox +
    1. Console2 (enable log from "Chrome" on Info level)
    2. Extension Developer (enable Debugging Preferences)
    
https://developer.mozilla.org/en/Setting_up_extension_development_environment#Development_extensions

For development,
    1. Configure "firefox.dir" in build.xml
    2. Configure "firefox.profile.path" in build.xml if need.
    3. Run "ant test"
Note:
    1. Need restart FireFox if changed the "chrome.manifest" file
    2. Need touch "srcExtension" directory if changed the "install.rdf" file (Implemented in Ant task)
    
For release,
    1. Configure "extension.version" in build.xml
    2. Run "ant package"

For development,
    1. Configure "firefox.dir" in build.xml
    2. Configure "firefox.profile.path" in build.xml if need.
    3. Run "ant test"
Note:
    1. Need restart Firefox if changed the "chrome.manifest" file
    2. Need touch "srcExtension" directory if changed the "install.rdf" file (Implemented in Ant task)
    
For release,
    1. Configure "extension.version" in build.xml
    2. Configure "em:version" in srcExtension/install.rdf.
    3. Run "ant package"

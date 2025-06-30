1. Ran the npx react-native upgrade command at v0.65
2. build fails at metro config, says it cant find blacklist.js
3. replaced blacklist with exclusion list
4. ios build exits with code 65
5. xcode build returns an error - /Users/marinmikulec/Development/react-native-monri-android-ios/example/ios/MonriAndroidIosExample.xcodeproj:1:1 Unable to open base configuration reference file '/Users/marinmikulec/Development/react-native-monri-android-ios/example/ios/Pods/Target Support Files/Pods-MonriAndroidIosExample/Pods-MonriAndroidIosExample.debug.xcconfig'.
6. pod install repo-update fails, can't locate package 
7. removed require_relative '../node_modules/@react-native-community/cli-platform-ios/native_modules' from the podfile
8. repo update fails again - no implicit conversion of nil into String
9. undefined method use_flipper!
10. disabled flipper
11. increased ios target to 13
12. edited podifle to make sure all pods target ios 13
13. bumped the version to ios 16
14. pod install passes with warning Generated duplicate UUIDs
15. removed Pods and podfile.lock and ran a reinstall

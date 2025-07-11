module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: "./android",
        packageImportPath: "com.reactnativemonriandroidios.MonriAndroidIosPackage",
        packageInstance: "new MonriAndroidIosPackage()"
      }
    }
  }
};

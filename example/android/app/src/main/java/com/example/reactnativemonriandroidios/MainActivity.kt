// example/android/app/src/main/java/com/example/reactnativemonriandroidios/MainActivity.kt
package com.example.reactnativemonriandroidios

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.monri.android.Monri
import com.reactnativemonriandroidios.MonriAndroidIosModule

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    try {
      val monriInstance = Monri(this)
      MonriAndroidIosModule.setMonriInstance(monriInstance)
    } catch (e: Exception) {
      throw RuntimeException("Failed to initialize Monri SDK: ${e.message}", e)
    }

    super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String = "MonriAndroidIosExample"

  /**
   * Returns the instance of the [ReactActivityDelegate].
   * We use [DefaultReactActivityDelegate] which allows you to enable
   * the New Architecture with a single boolean flag [fabricEnabled].
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}

package com.reactnativemonriandroidios

import android.content.Context
import androidx.preference.PreferenceManager
import com.facebook.react.bridge.*
import com.monri.android.ActionResultConsumer
import com.monri.android.Monri
import com.monri.android.ResultCallback
import com.monri.android.googlepay.GooglePayButtonOptions
import com.monri.android.model.*

class MonriAndroidIosModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext),
    ResultCallback<PaymentResult>,
    LifecycleEventListener {

  private lateinit var monri: Monri
  private lateinit var monriActivityListeners: MonriActivityEventListener
  private lateinit var confirmPaymentPromise: Promise
  private var googlePayButtonOptions: GooglePayButtonOptions? = null

  companion object {
    private var monriInstanceFromActivity: Monri? = null

    fun setMonriInstance(instance: Monri) {
      monriInstanceFromActivity = instance
    }
  }

  init {
    reactContext.addLifecycleEventListener(this)
  }

  override fun getName(): String = MonriConstants.MODULE_NAME

  private fun tryInitMonri() {
    if (monri != null) {
      return
    }

    val existing = monriInstanceFromActivity
      ?: throw IllegalStateException(MonriConstants.ERROR_MONRI_NOT_INITIALIZED)

    writeMetaData(
      reactApplicationContext,
      String.format(
        MonriConstants.META_LIBRARY_VALUE_FORMAT,
        BuildConfig.MONRI_REACT_NATIVE_PLUGIN_VERSION
      )
    )

    this.monri = existing
    this.monriActivityListeners = MonriActivityEventListener(existing, this)

    reactApplicationContext.addActivityEventListener(monriActivityListeners)
  }

  @ReactMethod
  fun confirmPayment(monriApiOptions: ReadableMap, params: ReadableMap, promise: Promise) {
    try {
      if (this.monri == null) {
        tryInitMonri()
      }

      val monriInstance = this.monri ?: throw Exception(MonriConstants.ERROR_MONRI_NOT_INITIALIZED_PAYMENT)

      this.confirmPaymentPromise = promise

      val parseResult = MonriMapper.parseConfirmPaymentParams(params)
      val confirmPaymentParams = parseResult.params
      this.googlePayButtonOptions = parseResult.googlePayButtonOptions

      monriInstance.setMonriApiOptions(
        MonriMapper.parseMonriApiOptions(monriApiOptions)
      )

      val paymentCallback =
        ActionResultConsumer<PaymentResult> { paymentResult, throwable ->
          if (throwable != null) {
            this.onError(throwable)
          } else if (paymentResult != null) {
            this.onSuccess(paymentResult)
          } else {
            this.onError(Exception(MonriConstants.ERROR_UNKNOWN))
          }
        }

      if (MonriMapper.parseConfirmPaymentParams(params).googlePayButtonOptions != null) {
         if (this.googlePayButtonOptions != null) {
             monriInstance.confirmPayment(
                 confirmPaymentParams,
                 paymentCallback,
                 this.googlePayButtonOptions
             )
         } else {
             monriInstance.confirmPayment(confirmPaymentParams, paymentCallback)
         }
      } else {
        monriInstance.confirmPayment(
          confirmPaymentParams,
          paymentCallback
        )
      }
    } catch (e: Exception) {
      promise.reject(e)
    }
  }

  override fun onSuccess(paymentResult: PaymentResult) {
    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }

    if (this::confirmPaymentPromise.isInitialized) {
      val result = MonriMapper.mapPaymentResultToWritableMap(paymentResult)
      confirmPaymentPromise.resolve(result)
    }
  }

  override fun onError(throwable: Throwable?) {
    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }
    if (this::confirmPaymentPromise.isInitialized) {
      val error = throwable ?: Exception(MonriConstants.ERROR_UNKNOWN_PAYMENT)
      this.confirmPaymentPromise.reject(error)
    }
  }

  override fun onHostResume() { /* no-op */ }
  override fun onHostPause() {
    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }
  }
  override fun onHostDestroy() {
    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }
    monri = null
  }

  private fun writeMetaData(context: Context, library: String) {
    val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
    sharedPreferences.edit().putString(MonriConstants.META_LIBRARY_KEY, library).apply()
  }
}

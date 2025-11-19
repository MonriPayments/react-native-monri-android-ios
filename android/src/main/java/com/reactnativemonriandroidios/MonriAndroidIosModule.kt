package com.reactnativemonriandroidios

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.result.ActivityResultCaller
import androidx.preference.PreferenceManager
import com.facebook.react.bridge.*
import com.monri.android.ActionResultConsumer
import com.monri.android.Monri
import com.monri.android.ResultCallback
import com.monri.android.googlepay.GooglePayButtonOptions
import com.monri.android.model.*


class MonriAndroidIosModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ResultCallback<PaymentResult>, LifecycleEventListener {

  private var monri: Monri? = null
  private lateinit var monriApiOptions: ReadableMap
  private lateinit var monriActivityListeners: MonriActivityEventListener
  private lateinit var confirmPaymentPromise: Promise
  private var googlePayButtonOptions: GooglePayButtonOptions? = null
  private var initializePromise: Promise? = null

  private val lifecycleCallbacks = object : Application.ActivityLifecycleCallbacks {
  override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {
    tryInitMonri(activity)
  }
  override fun onActivityStarted(activity: Activity) { /* no-op */ }
  override fun onActivityResumed(activity: Activity) { /* no-op */ }
  override fun onActivityPaused(activity: Activity) { /* no-op */ }
  override fun onActivityStopped(activity: Activity) { /* no-op */ }
  override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) { /* no-op */ }
  override fun onActivityDestroyed(activity: Activity) { /* no-op */ }
}

companion object {
  private var activityResultCallerProvider: (() -> ActivityResultCaller?)? = null

  fun registerActivityResultCaller(provider: () -> ActivityResultCaller?) {
    activityResultCallerProvider = provider
  }

  internal fun provideActivityResultCaller(): ActivityResultCaller? {
    val caller = activityResultCallerProvider?.invoke()
    return caller
  }
}

  init {
    (reactContext.applicationContext as Application)
        .registerActivityLifecycleCallbacks(lifecycleCallbacks)

    if (reactContext.currentActivity != null) {
      tryInitMonri(reactContext.currentActivity!!)
    }
  }

  override fun getName(): String {
    return "MonriAndroidIos"
  }

  private fun tryInitMonri(activity: Activity) {
    if (monri != null) {
      return
    }

    writeMetaData(this.reactApplicationContext, String.format("Android-SDK:ReactNative:%s", BuildConfig.MONRI_REACT_NATIVE_PLUGIN_VERSION))
    try {
      this.monri = Monri(reactApplicationContext as ActivityResultCaller)
    } catch (t: Throwable) {
      return
    }
    val monri = this.monri ?: throw Exception("Monri is not initialized in initializer")
    this.monriActivityListeners = MonriActivityEventListener(monri, this)

    reactApplicationContext.addActivityEventListener(monriActivityListeners)
    initializePromise?.resolve(null)
    initializePromise = null
  }

  @ReactMethod
  fun initialize(monriApiOptions: ReadableMap, promise: Promise) {
    this.monriApiOptions = monriApiOptions
    this.initializePromise = promise
    val activity = reactApplicationContext.currentActivity ?: return
    tryInitMonri(activity)
  }

  @ReactMethod
  fun confirmPayment(monriApiOptions: ReadableMap, params: ReadableMap, promise: Promise) {
    try {
      val confirmPaymentParams = parseConfirmPaymentParams(params)
      val monri = this.monri ?: throw Exception("Monri is not initialized in confirmPayment")

      monri.setMonriApiOptions(
        parseMonriApiOptions(monriApiOptions)
      )

      val paymentCallback =
        ActionResultConsumer<PaymentResult> { paymentResult, throwable ->
          if (throwable != null) {
            this.onError(throwable)
          } else if (paymentResult != null) {
            this.onSuccess(paymentResult)
          } else {
            this.onError(Exception("Unknown error occurred during payment."))
          }
        }

      if(getRequiredString(params, "type") == "googlePay") {
        monri.confirmPayment(
          confirmPaymentParams,
          paymentCallback,
          googlePayButtonOptions
        )
      } else {
        monri.confirmPayment(
          confirmPaymentParams,
          paymentCallback
        )
      }
    } catch (e: Exception) {
      promise.reject(e)
    }

  }

  private fun parseConfirmPaymentParams(params: ReadableMap): ConfirmPaymentParams {
    val clientSecret = getRequiredString(params, "clientSecret")
    val transactionParams = params.getMap("transaction")
      ?: throw RequiredAttributeException("params.transaction is missing")

    val paymentMethodParams = (when {
      params.hasKey("googlePayButtonOptions") -> {
        params.getMap("googlePayButtonOptions") ?: throw RequiredAttributeException("googlePay button options missing")
      }
      params.hasKey("card") -> {
        params.getMap("card") ?: throw RequiredAttributeException("params.card is missing")
      }
      params.hasKey("savedCard") -> {
        params.getMap("savedCard")
          ?: throw RequiredAttributeException("params.savedCard is missing")
      }
      else -> {
        throw RequiredAttributeException("params.card or params.savedCard is missing, or googlePayButtonOptions is missing")
      }
    })

    val customerParams = CustomerParams()
      .setAddress(getNullableString(transactionParams, "address"))
      .setFullName(getNullableString(transactionParams, "fullName"))
      .setCity(getNullableString(transactionParams, "city"))
      .setZip(getNullableString(transactionParams, "zip"))
      .setPhone(getNullableString(transactionParams, "phone"))
      .setCountry(getNullableString(transactionParams, "country"))
      .setEmail(getNullableString(transactionParams, "email"))

    val paymentMethod: PaymentMethodParams = when {
      getRequiredString(params, "type") == "googlePay" -> {
        val payment = GooglePayPayment(GooglePayPayment.Provider.GOOGLE_PAY)
        googlePayButtonOptions = GooglePayButtonOptions(
          getRequiredInt(paymentMethodParams, "type"),
          getRequiredInt(paymentMethodParams, "theme"),
          getRequiredInt(paymentMethodParams, "borderRadius")
        )

        payment.toPaymentMethodParams()
      }
      params.hasKey("savedCard") -> {
        SavedCard(getRequiredString(paymentMethodParams, "panToken"), getRequiredString(paymentMethodParams, "cvv")).toPaymentMethodParams()
      }
      params.hasKey("card") -> {
        val card = Card(getRequiredString(paymentMethodParams, "pan"), getRequiredInt(paymentMethodParams, "expiryMonth"), getRequiredInt(paymentMethodParams, "expiryYear"), getRequiredString(paymentMethodParams, "cvv"))

        card.isTokenizePan = if (paymentMethodParams.hasKey("saveCard")) {
          paymentMethodParams.getBoolean("saveCard")
        } else {
          false
        }
        card.toPaymentMethodParams()
      }
      else -> {
        throw RequiredAttributeException("params.card or params.savedCard is missing")
      }
    }

    return ConfirmPaymentParams.create(
      clientSecret,
      paymentMethod,
      TransactionParams.create()
        .set(customerParams)
        .set("order_info", transactionParams.getString("orderInfo"))
    )

  }

  private fun parseMonriApiOptions(params: ReadableMap): MonriApiOptions {
    return MonriApiOptions(
      getRequiredString(params, "authenticityToken"),
      if (params.hasKey("developmentMode")) {
        params.getBoolean("developmentMode")
      } else {
        false
      }
    )
  }

  private fun getRequiredString(params: ReadableMap,
                                key: String,
                                defaultValue: String? = null
  ): String {

    return (if (params.hasKey(key)) {
      params.getString(key)
    } else {
      defaultValue
    }) ?: throw RequiredAttributeException("Missing attribute $key")
  }

  private fun getRequiredInt(params: ReadableMap,
                             key: String,
                             defaultValue: Int? = null
  ): Int {

    return (if (params.hasKey(key)) {
      params.getInt(key)
    } else {
      defaultValue
    }) ?: throw RequiredAttributeException("Missing attribute $key")
  }

  private fun getNullableString(params: ReadableMap,
                                key: String,
                                defaultValue: String? = null
  ): String? {

    return (if (params.hasKey(key)) {
      params.getString(key)
    } else {
      defaultValue
    })
  }


  override fun onSuccess(paymentResult: PaymentResult) {

    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }

    if (this::confirmPaymentPromise.isInitialized) {
      val result = WritableNativeMap()

      result.putValueOrNull("status", paymentResult.status)
      result.putValueOrNull("currency", paymentResult.currency)
      result.putValueOrNull("amount", paymentResult.amount)
      result.putValueOrNull("orderNumber", paymentResult.orderNumber)
      result.putValueOrNull("panToken", paymentResult.panToken)
      result.putValueOrNull("createdAt", paymentResult.createdAt)
      result.putValueOrNull("transactionType", paymentResult.transactionType)

      if (paymentResult.paymentMethod != null) {
        val savedCard = paymentResult.paymentMethod as SavedCardPaymentMethod
        val paymentMethod = WritableNativeMap()
        val paymentMethodData = WritableNativeMap()
        paymentMethod.putValueOrNull("type", savedCard.type)


        paymentMethodData.putValueOrNull("brand", savedCard.data!!.brand)
        paymentMethodData.putValueOrNull("expirationDate", savedCard.data!!.expirationDate)
        paymentMethodData.putValueOrNull("issuer", savedCard.data!!.issuer)
        paymentMethodData.putValueOrNull("masked", savedCard.data!!.masked)
        paymentMethodData.putValueOrNull("token", savedCard.data!!.token)

        paymentMethod.putMap("data", paymentMethodData)

        result.putMap("paymentMethod", paymentMethod)

      }

      if (paymentResult.panToken != null) {
        result.putValueOrNull("panToken", paymentResult.panToken)
      }

      if (paymentResult.errors != null) {
        val errors = WritableNativeArray()
        paymentResult.errors!!.forEach { err ->
          errors.pushString(err)
        }

        result.putArray("errors", errors)
      } else {
        result.putArray("errors", WritableNativeArray())
      }


      // TODO: add payment method support

      confirmPaymentPromise.resolve(result)
    }
  }

  override fun onError(throwable: Throwable?) {
    if (this::monriActivityListeners.isInitialized) {
      this.reactApplicationContext.removeActivityEventListener(monriActivityListeners)
    }
    if (this::confirmPaymentPromise.isInitialized) {
      val error = throwable ?: Exception("Unknown error occurred")
      this.confirmPaymentPromise.reject(error)
    }
  }

  override fun onHostResume() {
    // no-op
  }

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

}

private class RequiredAttributeException(message: String) : IllegalArgumentException(message) {

}

private fun WritableNativeMap.putValueOrNull(key: String, value: Int?) {
  if (value == null) {
    this.putNull(key)
  } else {
    this.putInt(key, value)
  }
}

private fun WritableNativeMap.putValueOrNull(key: String, value: String?) {
  if (value == null) {
    this.putNull(key)
  } else {
    this.putString(key, value)
  }
}

private fun MonriAndroidIosModule.writeMetaData(context: Context, library: String) {
  val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
  sharedPreferences.edit().putString("com.monri.meta.library", library).apply()
}

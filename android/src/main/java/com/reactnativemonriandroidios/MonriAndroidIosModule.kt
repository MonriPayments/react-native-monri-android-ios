// android/src/main/java/com/reactnativemonriandroidios/MonriAndroidIosModule.kt
package com.reactnativemonriandroidios

import android.app.Activity
import android.content.Context
import androidx.activity.result.ActivityResultCaller
import com.reactnativemonriandroidios.MonriConstants
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

  private var monri: Monri? = null

  private lateinit var monriActivityListeners: MonriActivityEventListener
  private lateinit var confirmPaymentPromise: Promise
  private var googlePayButtonOptions: GooglePayButtonOptions? = null
  private var initializePromise: Promise? = null


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

    initializePromise?.resolve(null)
    initializePromise = null
  }

  @ReactMethod
  fun confirmPayment(monriApiOptions: ReadableMap, params: ReadableMap, promise: Promise) {

    if (this.monri == null) {
      this.initializePromise = promise
      tryInitMonri()
    }

    try {
      val monriInstance = this.monri ?: throw Exception(MonriConstants.ERROR_MONRI_NOT_INITIALIZED_PAYMENT)

      this.confirmPaymentPromise = promise

      val confirmPaymentParams = parseConfirmPaymentParams(params)

      monriInstance.setMonriApiOptions(
        parseMonriApiOptions(monriApiOptions)
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

      if (getRequiredString(params, MonriConstants.KEY_TYPE) == MonriConstants.TYPE_GOOGLE_PAY) {
        monriInstance.confirmPayment(
          confirmPaymentParams,
          paymentCallback,
          googlePayButtonOptions
        )
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

  private fun parseConfirmPaymentParams(params: ReadableMap): ConfirmPaymentParams {
    val clientSecret = getRequiredString(params, MonriConstants.KEY_CLIENT_SECRET)
    val transactionParams = params.getMap(MonriConstants.KEY_TRANSACTION)
      ?: throw RequiredAttributeException(MonriConstants.ERROR_TRANSACTION_MISSING)

    val paymentMethodParams = when {
      params.hasKey(MonriConstants.KEY_GOOGLE_PAY_BUTTON_OPTIONS) -> {
        params.getMap(MonriConstants.KEY_GOOGLE_PAY_BUTTON_OPTIONS)
          ?: throw RequiredAttributeException(MonriConstants.ERROR_GOOGLE_PAY_OPTIONS_MISSING)
      }
      params.hasKey(MonriConstants.KEY_CARD) -> {
        params.getMap(MonriConstants.KEY_CARD)
          ?: throw RequiredAttributeException(MonriConstants.ERROR_CARD_MISSING)
      }
      params.hasKey(MonriConstants.KEY_SAVED_CARD) -> {
        params.getMap(MonriConstants.KEY_SAVED_CARD)
          ?: throw RequiredAttributeException(MonriConstants.ERROR_SAVED_CARD_MISSING)
      }
      else -> {
        throw RequiredAttributeException(MonriConstants.ERROR_PAYMENT_METHOD_MISSING)
      }
    }

    val customerParams = CustomerParams()
      .setAddress(getNullableString(transactionParams, MonriConstants.KEY_ADDRESS))
      .setFullName(getNullableString(transactionParams, MonriConstants.KEY_FULL_NAME))
      .setCity(getNullableString(transactionParams, MonriConstants.KEY_CITY))
      .setZip(getNullableString(transactionParams, MonriConstants.KEY_ZIP))
      .setPhone(getNullableString(transactionParams, MonriConstants.KEY_PHONE))
      .setCountry(getNullableString(transactionParams, MonriConstants.KEY_COUNTRY))
      .setEmail(getNullableString(transactionParams, MonriConstants.KEY_EMAIL))

    val paymentMethod: PaymentMethodParams = when {
      getRequiredString(params, MonriConstants.KEY_TYPE) == MonriConstants.TYPE_GOOGLE_PAY -> {
        val payment = GooglePayPayment(GooglePayPayment.Provider.GOOGLE_PAY)
        googlePayButtonOptions = GooglePayButtonOptions(
          getRequiredInt(paymentMethodParams, MonriConstants.KEY_TYPE),
          getRequiredInt(paymentMethodParams, MonriConstants.KEY_THEME),
          getRequiredInt(paymentMethodParams, MonriConstants.KEY_BORDER_RADIUS)
        )
        payment.toPaymentMethodParams()
      }
      params.hasKey(MonriConstants.KEY_SAVED_CARD) -> {
        SavedCard(
          getRequiredString(paymentMethodParams, MonriConstants.KEY_PAN_TOKEN),
          getRequiredString(paymentMethodParams, MonriConstants.KEY_CVV)
        ).toPaymentMethodParams()
      }
      params.hasKey(MonriConstants.KEY_CARD) -> {
        val card = Card(
          getRequiredString(paymentMethodParams, MonriConstants.KEY_PAN),
          getRequiredInt(paymentMethodParams, MonriConstants.KEY_EXPIRY_MONTH),
          getRequiredInt(paymentMethodParams, MonriConstants.KEY_EXPIRY_YEAR),
          getRequiredString(paymentMethodParams, MonriConstants.KEY_CVV)
        )

        card.isTokenizePan = if (paymentMethodParams.hasKey(MonriConstants.KEY_SAVE_CARD)) {
          paymentMethodParams.getBoolean(MonriConstants.KEY_SAVE_CARD)
        } else {
          false
        }

        card.toPaymentMethodParams()
      }
      else -> {
        throw RequiredAttributeException(MonriConstants.ERROR_PAYMENT_METHOD_MISSING)
      }
    }

    return ConfirmPaymentParams.create(
      clientSecret,
      paymentMethod,
      TransactionParams.create()
        .set(customerParams)
        .set(MonriConstants.KEY_ORDER_INFO, transactionParams.getString(MonriConstants.KEY_ORDER_INFO))
    )
  }

  private fun parseMonriApiOptions(params: ReadableMap): MonriApiOptions {
    return MonriApiOptions(
      getRequiredString(params, MonriConstants.KEY_AUTHENTICITY_TOKEN),
      if (params.hasKey(MonriConstants.KEY_DEVELOPMENT_MODE)) {
        params.getBoolean(MonriConstants.KEY_DEVELOPMENT_MODE)
      } else {
        false
      }
    )
  }

  private fun getRequiredString(
    params: ReadableMap,
    key: String,
    defaultValue: String? = null
  ): String {
    return (if (params.hasKey(key)) {
      params.getString(key)
    } else {
      defaultValue
    }) ?: throw RequiredAttributeException("Missing attribute $key")
  }

  private fun getRequiredInt(
    params: ReadableMap,
    key: String,
    defaultValue: Int? = null
  ): Int {
    return (if (params.hasKey(key)) {
      params.getInt(key)
    } else {
      defaultValue
    }) ?: throw RequiredAttributeException("Missing attribute $key")
  }

  private fun getNullableString(
    params: ReadableMap,
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

      result.putValueOrNull(MonriConstants.KEY_STATUS, paymentResult.status)
      result.putValueOrNull(MonriConstants.KEY_CURRENCY, paymentResult.currency)
      result.putValueOrNull(MonriConstants.KEY_AMOUNT, paymentResult.amount)
      result.putValueOrNull(MonriConstants.KEY_ORDER_NUMBER, paymentResult.orderNumber)
      result.putValueOrNull(MonriConstants.KEY_PAN_TOKEN, paymentResult.panToken)
      result.putValueOrNull(MonriConstants.KEY_CREATED_AT, paymentResult.createdAt)
      result.putValueOrNull(MonriConstants.KEY_TRANSACTION_TYPE, paymentResult.transactionType)

      if (paymentResult.paymentMethod != null) {
        val savedCard = paymentResult.paymentMethod as SavedCardPaymentMethod
        val paymentMethod = WritableNativeMap()
        val paymentMethodData = WritableNativeMap()

        paymentMethod.putValueOrNull(MonriConstants.KEY_TYPE, savedCard.type)

        paymentMethodData.putValueOrNull(MonriConstants.KEY_BRAND, savedCard.data!!.brand)
        paymentMethodData.putValueOrNull(MonriConstants.KEY_EXPIRATION_DATE, savedCard.data!!.expirationDate)
        paymentMethodData.putValueOrNull(MonriConstants.KEY_ISSUER, savedCard.data!!.issuer)
        paymentMethodData.putValueOrNull(MonriConstants.KEY_MASKED, savedCard.data!!.masked)
        paymentMethodData.putValueOrNull(MonriConstants.KEY_TOKEN, savedCard.data!!.token)

        paymentMethod.putMap(MonriConstants.KEY_DATA, paymentMethodData)

        result.putMap(MonriConstants.KEY_PAYMENT_METHOD, paymentMethod)
      }

      if (paymentResult.errors != null) {
        val errors = WritableNativeArray()
        paymentResult.errors!!.forEach { err ->
          errors.pushString(err)
        }
        result.putArray(MonriConstants.KEY_ERRORS, errors)
      } else {
        result.putArray(MonriConstants.KEY_ERRORS, WritableNativeArray())
      }

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

  override fun onHostResume() {
    /* no-op */
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

  private fun writeMetaData(context: Context, library: String) {
    val sharedPreferences = PreferenceManager.getDefaultSharedPreferences(context)
    sharedPreferences
      .edit()
      .putString(MonriConstants.META_LIBRARY_KEY, library)
      .apply()
  }
}

private class RequiredAttributeException(message: String) : IllegalArgumentException(message)

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

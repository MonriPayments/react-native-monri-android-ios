package com.reactnativemonriandroidios

import com.facebook.react.bridge.*
import com.monri.android.Monri
import com.monri.android.ResultCallback
import com.monri.android.model.*
import java.lang.Exception


class MonriAndroidIosModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ResultCallback<PaymentResult> {

  private lateinit var monri: Monri
  private lateinit var monriActivityListeners: MonriActivityEventListener
  private lateinit var confirmPaymentPromise: Promise

  override fun getName(): String {
    return "MonriAndroidIos"
  }

  @ReactMethod
  fun confirmPayment(monriApiOptions: ReadableMap, params: ReadableMap, promise: Promise) {

    try {
      val options = parseMonriApiOptions(monriApiOptions)
      val confirmPaymentParams = parseConfirmPaymentParams(params)

      this.monri = Monri(reactApplicationContext, options)
      this.monriActivityListeners = MonriActivityEventListener(monri, this)
      this.confirmPaymentPromise = promise

      reactApplicationContext.addActivityEventListener(monriActivityListeners)

      monri.confirmPayment(reactApplicationContext.currentActivity,
        confirmPaymentParams
      )
    } catch (e: Exception) {
      promise.reject(e)
    }

  }

  private fun parseConfirmPaymentParams(params: ReadableMap): ConfirmPaymentParams {
    val clientSecret = getRequiredString(params, "clientSecret")
    val transactionParams = params.getMap("transaction")
      ?: throw RequiredAttributeException("params.transaction is missing")

    val paymentMethodParams = (when {
      params.hasKey("card") -> {
        params.getMap("card") ?: throw RequiredAttributeException("params.card is missing")
      }
      params.hasKey("savedCard") -> {
        params.getMap("savedCard")
          ?: throw RequiredAttributeException("params.savedCard is missing")
      }
      else -> {
        throw RequiredAttributeException("params.card or params.savedCard is missing")
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
      this.confirmPaymentPromise.reject(throwable)
    }
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

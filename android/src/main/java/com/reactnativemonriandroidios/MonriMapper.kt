package com.reactnativemonriandroidios

import android.content.Context
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import com.monri.android.model.*
import com.monri.android.googlepay.GooglePayButtonOptions

object MonriMapper {

    data class ConfirmPaymentParseResult(
        val params: ConfirmPaymentParams,
        val googlePayButtonOptions: GooglePayButtonOptions?
    )

    fun parseConfirmPaymentParams(context: Context, params: ReadableMap): ConfirmPaymentParseResult {
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

        var googlePayButtonOptions: GooglePayButtonOptions? = null

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

        val confirmPaymentParams = ConfirmPaymentParams.create(
            clientSecret,
            paymentMethod,
            TransactionParams.create()
                .set(customerParams)
                .set(MonriConstants.KEY_ORDER_INFO, transactionParams.getString(MonriConstants.KEY_ORDER_INFO))
        )

        if (params.hasKey(MonriConstants.KEY_BROWSER_INFO)) {
            params.getMap(MonriConstants.KEY_BROWSER_INFO)?.let { browserInfoParams ->
                confirmPaymentParams.setBrowserInfo(parseBrowserInfo(context, browserInfoParams))
            }
        }

        return ConfirmPaymentParseResult(confirmPaymentParams, googlePayButtonOptions)
    }

    private fun parseBrowserInfo(context: Context, params: ReadableMap): BrowserInfo {
        // Fields not provided from JS keep the SDK-resolved defaults
        val browserInfo = BrowserInfo.create(context)

        if (params.hasKey(MonriConstants.KEY_SCREEN_WIDTH)) {
            browserInfo.setScreenWidth(params.getInt(MonriConstants.KEY_SCREEN_WIDTH))
        }
        if (params.hasKey(MonriConstants.KEY_SCREEN_HEIGHT)) {
            browserInfo.setScreenHeight(params.getInt(MonriConstants.KEY_SCREEN_HEIGHT))
        }
        if (params.hasKey(MonriConstants.KEY_COLOR_DEPTH)) {
            browserInfo.setColorDepth(params.getInt(MonriConstants.KEY_COLOR_DEPTH))
        }
        getNullableString(params, MonriConstants.KEY_USER_AGENT)?.let {
            browserInfo.setUserAgent(it)
        }
        if (params.hasKey(MonriConstants.KEY_TIME_ZONE_OFFSET)) {
            browserInfo.setTimeZoneOffset(params.getInt(MonriConstants.KEY_TIME_ZONE_OFFSET))
        }
        getNullableString(params, MonriConstants.KEY_LANGUAGE)?.let {
            browserInfo.setLanguage(it)
        }
        if (params.hasKey(MonriConstants.KEY_JAVA_ENABLED)) {
            browserInfo.setJavaEnabled(params.getBoolean(MonriConstants.KEY_JAVA_ENABLED))
        }
        getNullableString(params, MonriConstants.KEY_HTTP_ACCEPT)?.let {
            browserInfo.setHttpAccept(it)
        }
        getNullableString(params, MonriConstants.KEY_HTTP_USER_AGENT)?.let {
            browserInfo.setHttpUserAgent(it)
        }
        getNullableString(params, MonriConstants.KEY_HTTP_ACCEPT_LANGUAGE)?.let {
            browserInfo.setHttpAcceptLanguage(it)
        }

        return browserInfo
    }

    fun parseMonriApiOptions(params: ReadableMap): MonriApiOptions {
        return MonriApiOptions(
            getRequiredString(params, MonriConstants.KEY_AUTHENTICITY_TOKEN),
            if (params.hasKey(MonriConstants.KEY_DEVELOPMENT_MODE)) {
                params.getBoolean(MonriConstants.KEY_DEVELOPMENT_MODE)
            } else {
                false
            }
        )
    }

    fun mapPaymentResultToWritableMap(paymentResult: PaymentResult): WritableMap {
        val result = WritableNativeMap()

        result.putValueOrNull(MonriConstants.KEY_STATUS, paymentResult.status)
        result.putValueOrNull(MonriConstants.KEY_CURRENCY, paymentResult.currency)
        result.putValueOrNull(MonriConstants.KEY_AMOUNT, paymentResult.amount)
        result.putValueOrNull(MonriConstants.KEY_ORDER_NUMBER, paymentResult.orderNumber)
        result.putValueOrNull(MonriConstants.KEY_PAN_TOKEN, paymentResult.panToken)
        result.putValueOrNull(MonriConstants.KEY_CREATED_AT, paymentResult.createdAt)
        result.putValueOrNull(MonriConstants.KEY_TRANSACTION_TYPE, paymentResult.transactionType)

        if (paymentResult.paymentMethod != null) {
            val savedCard = paymentResult.paymentMethod as? SavedCardPaymentMethod
            if (savedCard != null) {
                val paymentMethod = WritableNativeMap()
                val paymentMethodData = WritableNativeMap()

                paymentMethod.putValueOrNull(MonriConstants.KEY_TYPE, savedCard.type)

                paymentMethodData.putValueOrNull(MonriConstants.KEY_BRAND, savedCard.data?.brand)
                paymentMethodData.putValueOrNull(MonriConstants.KEY_EXPIRATION_DATE, savedCard.data?.expirationDate)
                paymentMethodData.putValueOrNull(MonriConstants.KEY_ISSUER, savedCard.data?.issuer)
                paymentMethodData.putValueOrNull(MonriConstants.KEY_MASKED, savedCard.data?.masked)
                paymentMethodData.putValueOrNull(MonriConstants.KEY_TOKEN, savedCard.data?.token)

                paymentMethod.putMap(MonriConstants.KEY_DATA, paymentMethodData)
                result.putMap(MonriConstants.KEY_PAYMENT_METHOD, paymentMethod)
            }
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

        return result
    }

    private fun getRequiredString(params: ReadableMap, key: String, defaultValue: String? = null): String {
        return (if (params.hasKey(key)) {
            params.getString(key)
        } else {
            defaultValue
        }) ?: throw RequiredAttributeException("Missing attribute $key")
    }

    private fun getRequiredInt(params: ReadableMap, key: String, defaultValue: Int? = null): Int {
        return (if (params.hasKey(key)) {
            params.getInt(key)
        } else {
            defaultValue
        }) ?: throw RequiredAttributeException("Missing attribute $key")
    }

    private fun getNullableString(params: ReadableMap, key: String, defaultValue: String? = null): String? {
        return (if (params.hasKey(key)) {
            params.getString(key)
        } else {
            defaultValue
        })
    }

    private fun WritableNativeMap.putValueOrNull(key: String, value: Int?) {
        if (value == null) this.putNull(key) else this.putInt(key, value)
    }

    private fun WritableNativeMap.putValueOrNull(key: String, value: String?) {
        if (value == null) this.putNull(key) else this.putString(key, value)
    }
}

class RequiredAttributeException(message: String) : IllegalArgumentException(message)

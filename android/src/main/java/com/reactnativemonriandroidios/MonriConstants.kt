package com.reactnativemonriandroidios

object MonriConstants {
    const val MODULE_NAME = "MonriAndroidIos"
    const val LOG_TAG = "MonriRN"
    const val META_LIBRARY_KEY = "com.monri.meta.library"
    const val META_LIBRARY_VALUE_FORMAT = "Android-SDK:ReactNative:%s"
    
    // Error Messages
    const val ERROR_MONRI_NOT_INITIALIZED = "Monri must be initialized in MainActivity.onCreate"
    const val ERROR_MONRI_NOT_INITIALIZED_PAYMENT = "Monri is not initialized in confirmPayment"
    const val ERROR_UNKNOWN_PAYMENT = "Unknown error occurred during payment."
    const val ERROR_UNKNOWN = "Unknown error occurred"
    const val ERROR_GOOGLE_PAY_OPTIONS_MISSING = "googlePay button options missing"
    const val ERROR_CARD_MISSING = "params.card is missing"
    const val ERROR_SAVED_CARD_MISSING = "params.savedCard is missing"
    const val ERROR_PAYMENT_METHOD_MISSING = "params.card or params.savedCard is missing, or googlePayButtonOptions is missing"
    const val ERROR_TRANSACTION_MISSING = "params.transaction is missing"
    
    // JSON Keys
    const val KEY_CLIENT_SECRET = "clientSecret"
    const val KEY_TRANSACTION = "transaction"
    const val KEY_GOOGLE_PAY_BUTTON_OPTIONS = "googlePayButtonOptions"
    const val KEY_CARD = "card"
    const val KEY_SAVED_CARD = "savedCard"
    const val KEY_TYPE = "type"
    const val KEY_THEME = "theme"
    const val KEY_BORDER_RADIUS = "borderRadius"
    const val KEY_PAN_TOKEN = "panToken"
    const val KEY_CVV = "cvv"
    const val KEY_PAN = "pan"
    const val KEY_EXPIRY_MONTH = "expiryMonth"
    const val KEY_EXPIRY_YEAR = "expiryYear"
    const val KEY_SAVE_CARD = "saveCard"
    const val KEY_ADDRESS = "address"
    const val KEY_FULL_NAME = "fullName"
    const val KEY_CITY = "city"
    const val KEY_ZIP = "zip"
    const val KEY_PHONE = "phone"
    const val KEY_COUNTRY = "country"
    const val KEY_EMAIL = "email"
    const val KEY_ORDER_INFO = "orderInfo"
    const val KEY_AUTHENTICITY_TOKEN = "authenticityToken"
    const val KEY_DEVELOPMENT_MODE = "developmentMode"
    
    // Payment Types
    const val TYPE_GOOGLE_PAY = "googlePay"
    
    // Result Keys
    const val KEY_STATUS = "status"
    const val KEY_CURRENCY = "currency"
    const val KEY_AMOUNT = "amount"
    const val KEY_ORDER_NUMBER = "orderNumber"
    const val KEY_CREATED_AT = "createdAt"
    const val KEY_TRANSACTION_TYPE = "transactionType"
    const val KEY_PAYMENT_METHOD = "paymentMethod"
    const val KEY_DATA = "data"
    const val KEY_BRAND = "brand"
    const val KEY_EXPIRATION_DATE = "expirationDate"
    const val KEY_ISSUER = "issuer"
    const val KEY_MASKED = "masked"
    const val KEY_TOKEN = "token"
    const val KEY_ERRORS = "errors"
}
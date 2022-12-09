package com.reactnativemonriandroidios

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.BaseActivityEventListener
import com.monri.android.Monri
import com.monri.android.ResultCallback
import com.monri.android.model.PaymentResult


internal class MonriActivityEventListener(private val monri: Monri, private val callback: ResultCallback<PaymentResult>) : BaseActivityEventListener() {

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    val monriPaymentResult = monri.onPaymentResult(requestCode, data, callback)
    if (!monriPaymentResult) {
      super.onActivityResult(activity, requestCode, resultCode, data)
    }
  }
}

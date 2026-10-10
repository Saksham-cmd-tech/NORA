package com.nora.wallet

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.nora.wallet.bridge.NoraNotificationModule
import com.nora.wallet.notification.NoraNotificationHelper

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Nora"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleNotificationIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (intent != null) {
      handleNotificationIntent(intent)
    }
  }

  private fun handleNotificationIntent(intent: Intent?) {
    val actionType = intent?.getStringExtra("action_type") ?: return
    val pnr = intent.getStringExtra("pnr") ?: ""
    val trainNumber = intent.getStringExtra("train_number") ?: ""

    if (actionType == NoraNotificationHelper.ACTION_DISMISS_LIVE_ACTIVITY) {
      NoraNotificationHelper.dismissLiveJourneyNotification(this)
    }

    NoraNotificationModule.handleNotificationAction(actionType, pnr, trainNumber)
  }
}

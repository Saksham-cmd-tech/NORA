package dev.saksham.nora

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import dev.saksham.nora.bridge.NoraNotificationModule
import dev.saksham.nora.notification.NoraNotificationHelper

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "Nora"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleNotificationIntent(intent)
    handleShareIntent(intent)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (intent != null) {
      handleNotificationIntent(intent)
      handleShareIntent(intent)
    }
  }

  private fun handleShareIntent(intent: Intent?) {
    if (intent == null) return
    if (Intent.ACTION_SEND == intent.action && intent.type != null) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        ?: intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
      if (!sharedText.isNullOrBlank()) {
        NoraNotificationModule.handleSharedText(sharedText)
      }
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

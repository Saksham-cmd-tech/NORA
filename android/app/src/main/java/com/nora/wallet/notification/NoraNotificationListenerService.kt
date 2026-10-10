package com.nora.wallet.notification

import android.app.Notification
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.nora.wallet.bridge.NoraNotificationModule

class NoraNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "NoraNotificationService"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName ?: ""
        val notification = sbn.notification ?: return
        val extras: Bundle? = notification.extras

        val title = extras?.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
        val text = extras?.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
        val bigText = extras?.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
        val subText = extras?.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""

        val fullContent = StringBuilder().apply {
            if (title.isNotEmpty()) append(title).append("\n")
            if (text.isNotEmpty()) append(text).append("\n")
            if (bigText.isNotEmpty() && bigText != text) append(bigText).append("\n")
            if (subText.isNotEmpty()) append(subText)
        }.toString().trim()

        Log.d(TAG, "Notification received from [$packageName]: $fullContent")

        // Broadcast to React Native module
        NoraNotificationModule.sendNotificationEvent(
            packageName = packageName,
            title = title,
            text = fullContent,
            timestamp = sbn.postTime
        )
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}

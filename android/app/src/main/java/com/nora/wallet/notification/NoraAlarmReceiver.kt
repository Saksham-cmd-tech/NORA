package com.nora.wallet.notification

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log

class NoraAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_JOURNEY_REMINDER = "com.nora.wallet.ALARM_JOURNEY_REMINDER"
        private const val TAG = "NoraAlarmReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        when (intent.action) {
            ACTION_JOURNEY_REMINDER -> {
                val reminderType = intent.getStringExtra("reminder_type") ?: "2_HOURS"
                val ticketData = intent.getBundleExtra("ticket_data") ?: Bundle()
                Log.d(TAG, "Journey reminder received: $reminderType for PNR: ${ticketData.getString("pnr")}")
                NoraNotificationHelper.showJourneyReminderNotification(context, reminderType, ticketData)
            }
        }
    }
}
